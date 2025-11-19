import { BaseRepositoryAbstract } from '@/base/abstract-repository.base';
import { BaseRepositoryInterface } from '@/base/repository.base';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category } from '../entities/category.entity';

@Injectable()
export class CategoriesRepository
    extends BaseRepositoryAbstract<Category>
    implements BaseRepositoryInterface<Category> {
    constructor(
        @InjectModel(Category.name)
        private readonly categories_repository: Model<Category>,
    ) {
        super(categories_repository);
    }
}
