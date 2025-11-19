// menu.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Menu, MenuDocument } from '@/models/entities/menu.entity';
import { Category, CategoryDocument } from '@/models/entities/category.entity';
import { GetMenuDto } from '@/models/requests/menu.request';

@Injectable()
export class MenuService {
    constructor(
        @InjectModel(Menu.name) private readonly menuModel: Model<MenuDocument>,
        @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
    ) { }

    async getCategories() {
        return this.categoryModel.find().lean();
    }

    async getMenu(filter: GetMenuDto) {
        const { category, query, limit = 6 } = filter;
        const queryFilter: any = {};

        // lọc theo category nếu có
        if (category) {
            if (Types.ObjectId.isValid(category)) {
                queryFilter.category = new Types.ObjectId(category);
            } else {
                const cat = await this.categoryModel.findOne({ name: category }).lean();
                if (cat) {
                    queryFilter.category = cat._id;
                } else {
                    return [];
                }
            }
        }


        if (query) {
            queryFilter.name = { $regex: query, $options: 'i' };
        }

        const menus = await this.menuModel
            .find(queryFilter)
            .populate('category')
            .populate('customizations')
            .limit(Number(limit))
            .lean();

        return menus;
    }
}

function dijkstra(graph, start, end) {
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

  const path = [];
  let u = end;
  while (u) {
    path.unshift(u);
    u = prev[u];
  }
  return path;
}
