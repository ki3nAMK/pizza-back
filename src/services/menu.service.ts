// menu.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Menu, MenuDocument } from '@/models/entities/menu.entity';
import { Category, CategoryDocument } from '@/models/entities/category.entity';
import { GetMenuDto } from '@/models/requests/menu.request';
import { Store, StoreDocument } from '@/models/entities/store.entity';

@Injectable()
export class MenuService {
  constructor(
    @InjectModel(Menu.name) private readonly menuModel: Model<MenuDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(Store.name)
    private readonly storeModel: Model<StoreDocument>,
  ) {}

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

    const menuIds = menus.map((m) => m._id);
    const stores = await this.storeModel
      .find({ menus: { $in: menuIds } })
      .lean();

    const menuWithStore = menus.map((menu) => {
      const store = stores.find((s) =>
        s.menus.some((mId) => mId.toString() === menu._id.toString()),
      );
      return {
        ...menu,
        store: store
          ? { _id: store._id, name: store.name, address: store.address }
          : null,
      };
    });

    return menuWithStore as Menu[];
  }
}
