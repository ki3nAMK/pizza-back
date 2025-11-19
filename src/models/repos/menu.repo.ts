// menu.repository.ts
import { BaseRepositoryAbstract } from '@/base/abstract-repository.base';
import { BaseRepositoryInterface } from '@/base/repository.base';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Menu } from '../entities/menu.entity';

@Injectable()
export class MenuRepository
    extends BaseRepositoryAbstract<Menu>
    implements BaseRepositoryInterface<Menu> {
    constructor(
        @InjectModel(Menu.name)
        private readonly menuRepository: Model<Menu>,
    ) {
        super(menuRepository);
    }
}
