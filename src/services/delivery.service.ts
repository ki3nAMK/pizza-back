import axios from 'axios';
import { get, random } from 'lodash';

import {
  OverseaCoordType,
  OverseaNodeCoord,
  OverseaWayType,
} from '@/interfaces/coordinate.interface';
import { Cart, Coordinate } from '@/models/entities/cart.entity';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server } from 'http';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { ShipperEvent } from '@/enums/shipper-event.enum';
import { CartRepository } from '@/models/repos/cart.repo';
import { UsersRepository } from '@/models/repos/user.repo';
import { Store } from '@/models/entities/store.entity';
import { MenuRepository } from '@/models/repos/menu.repo';
import { StoreRepository } from '@/models/repos/store.repo';
import { SHIPPER_STATUS } from '@/enums/shipper.enum';
import { CartState } from '@/enums/cart.enum';

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  private shipperLocationsMap: Record<string, Coordinate> = {};

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly cartRepo: CartRepository,
    private readonly userRepo: UsersRepository,
    private readonly menuRepo: MenuRepository,
    private readonly storeRepo: StoreRepository,
  ) {}

  async handleCreateLocation(
    userLat: number,
    userLon: number,
    order: Cart,
  ): Promise<{
    paths: Coordinate[];
    distance: number;
  }> {
    const menuIds = order.items.map((i) => i.id);
    const { items: menus } = await this.menuRepo.findAll({
      _id: { $in: menuIds },
    });
    const firstMenu = menus[0];
    const store = await this.storeRepo.findOneByCondition({
      menus: firstMenu._id.toString(),
    });

    const shopLat = store.latitude;
    const shopLon = store.longitude;

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

    console.log(body);

    try {
      const res = await axios.post(
        'https://overpass-api.de/api/interpreter',
        body,
        {
          headers: { 'Content-Type': 'text/plain' },
        },
      );

      console.log('Call node and ways success!');

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

  async requestShipperLocations(orderId: string) {
    try {
      const order = await this.cartRepo.findOneByCondition({ _id: orderId });
      if (!order) {
        throw new NotFoundException(`Order ${orderId} not found`);
      }

      const storeCoord = order.deliveryCoord;

      const shippers = await this.userRepo.findAll({
        role: 'SHIPPER',
        deleted_at: null,
        state: { $ne: SHIPPER_STATUS.ENOUGH },
      });

      const activeShipperIds = shippers.items.map((s) => s._id.toString());

      activeShipperIds.forEach((shipperId: string) => {
        this.eventEmitter.emit(
          ShipperEvent.REQUEST_SHIPPER_UPDATE_LOCATION_NEW_ORDER,
          { shipperId },
        );
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const locations = this.shipperLocationsMap;

      activeShipperIds.forEach((shipperId: string) => {
        if (!locations[shipperId]) {
          locations[shipperId] = this.mockHanoiCoordinate();
        }
      });

      this.logger.log(`Shipper locations for order: ${orderId}`);
      this.logger.log(locations);

      const { nearestShipperId, distance: distanceFromShipper } =
        this.findNearestShipper(storeCoord, locations);

      this.logger.warn(
        `Shipper neareast: ${nearestShipperId} - distance: ${distanceFromShipper / 1000}km to store`,
      );

      const { paths, distance } = await this.handleCreateLocation(
        order.latitude,
        order.longitude,
        order,
      );

      if (distance === 0) {
        throw new BadRequestException('Location not valid!');
      }

      console.log('paths: ', paths);
      console.log('distance: ', distance);

      const newOrder = await this.cartRepo.update(order._id.toString(), {
        paths,
        distance,
        deliveryCoord: {
          lat: locations[nearestShipperId].lat,
          lon: locations[nearestShipperId].lon,
        },
        shipperId: nearestShipperId,
      });

      const activeOrdersOfShipper = await this.cartRepo.findAll({
        shipperId: nearestShipperId,
        state: { $ne: CartState.DONE },
      });

      const activeOrderCount = activeOrdersOfShipper.items.length;

      this.logger.log(
        `Shipper ${nearestShipperId} hiện đang giao ${activeOrderCount} đơn hàng`,
      );

      const shipper = await this.userRepo.findOneByCondition({
        _id: nearestShipperId,
      });
      if (activeOrderCount < 3) {
        shipper.status = SHIPPER_STATUS.DELIVERING;
      } else {
        shipper.status = SHIPPER_STATUS.ENOUGH;
      }

      await this.userRepo.update(shipper._id.toString(), shipper);

      this.eventEmitter.emit(ShipperEvent.ORDER_DECIDE_SHIPPER, {
        shipperId: nearestShipperId,
        order: newOrder,
      });

      return locations;
    } catch (err: any) {
      this.logger.error(err);
    }
  }

  private mockHanoiCoordinate(): Coordinate {
    const lat = random(20.9823939, 21.0354581, true);
    const lon = random(105.7241221, 105.7962728, true);
    return { lat, lon };
  }

  @OnEvent(ShipperEvent.SHIPPER_UPDATE_LOCATION_INTERNAL)
  handleShipperUpdateLocationInternal(payload: {
    shipperId: string;
    location: Coordinate;
  }) {
    const { shipperId, location } = payload;

    if (!this.shipperLocationsMap[shipperId]) return;

    this.shipperLocationsMap[shipperId] = location;
  }

  findNearestShipper(
    storeCoord: Coordinate,
    shipperLocations: Record<string, Coordinate>,
  ) {
    let nearestShipperId: string | null = null;
    let minDistance = Infinity;

    for (const [shipperId, loc] of Object.entries(shipperLocations)) {
      const distance = this.haversine(
        storeCoord.lat,
        storeCoord.lon,
        loc.lat,
        loc.lon,
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestShipperId = shipperId;
      }
    }

    return { nearestShipperId, distance: minDistance };
  }
}
