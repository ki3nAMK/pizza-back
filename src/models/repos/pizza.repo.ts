import { BaseRepositoryAbstract } from '@/base/abstract-repository.base';
import { BaseRepositoryInterface } from '@/base/repository.base';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Pizza } from '../entities/pizza.entity';

@Injectable()
export class PizzasRepository
    extends BaseRepositoryAbstract<Pizza>
    implements BaseRepositoryInterface<Pizza> {
    constructor(
        @InjectModel(Pizza.name)
        private readonly pizzas_repository: Model<Pizza>,
    ) {
        super(pizzas_repository);
    }
}
