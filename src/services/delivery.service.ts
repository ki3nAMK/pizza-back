import axios from 'axios';
import { get } from 'lodash';

import {
  OverseaCoordType,
  OverseaNodeCoord,
  OverseaWayType,
} from '@/interfaces/coordinate.interface';
import { Coordinate } from '@/models/entities/cart.entity';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DeliveryService {
  constructor(private readonly configService: ConfigService) {}

  async handleCreateLocation(
    userLat: number,
    userLon: number,
  ): Promise<{
    paths: Coordinate[];
    distance: number;
  }> {
    const shopLat = this.configService.get('store.lat');
    const shopLon = this.configService.get('store.lon');

    const padding = 0.01; // 1km
    const S = Math.min(shopLat, userLat) - padding;
    const N = Math.max(shopLat, userLat) + padding;
    const W = Math.min(shopLon, userLon) - padding;
    const E = Math.max(shopLon, userLon) + padding;

    const body = `
        [out:json];
        (
        way["highway"](${S}, ${W}, ${N}, ${E});
        >;
        );
        out body;
        `;

    try {
      const res = await axios.post(
        'https://overpass-api.de/api/interpreter',
        body,
        {
          headers: { 'Content-Type': 'text/plain' },
        },
      );

      const elements = get(res, 'data.elements', []) as (
        | OverseaNodeCoord
        | OverseaWayType
      )[];

      const { graph, nodeMap } = this.buildGraph(elements);

      const startNode = this.findNearestNode(shopLat, shopLon, nodeMap);
      const endNode = this.findNearestNode(userLat, userLon, nodeMap);

      if (!startNode || !endNode) {
        console.error('Không tìm thấy node gần start hoặc end!');

        return {
          paths: [],
          distance: 0,
        };
      } else {
        const pathNodeIds = this.dijkstra(graph, startNode, endNode);

        const pathCoords = pathNodeIds.map((id) => nodeMap.get(Number(id)));

        const totalDistance = this.computeTotalDistance(pathCoords);
        const distance = (totalDistance / 1000).toFixed(3); // km

        return {
          paths: pathCoords,
          distance: Number(distance),
        };
      }
    } catch (err) {
      console.log(
        'Err while calculate paths: ',
        get(err, 'message', 'Unkown error'),
      );

      return {
        paths: [],
        distance: 0,
      };
    }
  }

  findNearestNode(
    lat: number,
    lon: number,
    nodeMap: Map<number, Coordinate>,
  ): number {
    let minDist = Infinity;
    let nearest = null as number | null;
    for (const [id, n] of nodeMap.entries()) {
      const d = this.haversine(lat, lon, n.lat, n.lon);
      if (d < minDist) {
        minDist = d;
        nearest = id;
      }
    }
    return nearest;
  }

  buildGraph(elements: (OverseaNodeCoord | OverseaWayType)[]): {
    graph: {};
    nodeMap: Map<number, Coordinate>;
  } {
    const nodeMap = new Map<number, Coordinate>();
    const graph = {};

    for (const el of elements) {
      if (el.type === OverseaCoordType.NODE) {
        nodeMap.set(el.id, { lat: el.lat, lon: el.lon });
        graph[el.id] = [];
      }
    }

    for (const el of elements) {
      if (el.type === OverseaCoordType.WAY && el.nodes && el.nodes.length > 1) {
        for (let i = 0; i < el.nodes.length - 1; i++) {
          const from = el.nodes[i];
          const to = el.nodes[i + 1];
          const n1 = nodeMap.get(from);
          const n2 = nodeMap.get(to);
          if (!n1 || !n2) continue;

          const distance = this.haversine(n1.lat, n1.lon, n2.lat, n2.lon);

          graph[from].push({ to, weight: distance });
          graph[to].push({ to: from, weight: distance });
        }
      }
    }

    return { graph, nodeMap };
  }

  haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const toRad = (x: number) => (x * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  dijkstra(graph: {}, start: number, end: number) {
    const distances = {};
    const prev = {};
    const pq = new Set(Object.keys(graph));

    for (const node of pq) {
      distances[node] = Infinity;
      prev[node] = null;
    }
    distances[start] = 0;

    while (pq.size > 0) {
      let u = null;
      for (const node of pq) {
        if (u === null || distances[node] < distances[u]) u = node;
      }

      if (u === end) break;

      pq.delete(u);

      for (const neighbor of graph[u]) {
        const alt = distances[u] + neighbor.weight;
        if (alt < distances[neighbor.to]) {
          distances[neighbor.to] = alt;
          prev[neighbor.to] = u;
        }
      }
    }

    const path: number[] = [];
    let u = end;
    while (u) {
      path.unshift(u);
      u = prev[u];
    }
    return path;
  }

  computeTotalDistance(pathCoords: Coordinate[]) {
    let total = 0;
    for (let i = 0; i < pathCoords.length - 1; i++) {
      const p1 = pathCoords[i];
      const p2 = pathCoords[i + 1];
      total += this.haversine(p1.lat, p1.lon, p2.lat, p2.lon);
    }
    return total;
  }
}
