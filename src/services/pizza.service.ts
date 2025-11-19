import { BaseServiceAbstract } from '@/base/abstract-service.base';
import { Pizza } from '@/models/entities/pizza.entity';
import { PizzasRepository } from '@/models/repos/pizza.repo';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { omit } from 'lodash';
import { convertObjectIdToString } from '@/utils/helper';

@Injectable()
export class PizzasService extends BaseServiceAbstract<Pizza> {
    constructor(
        private readonly pizzas_repository: PizzasRepository,
        @InjectModel(Pizza.name)
        private readonly pizza_model: Model<Pizza>,
    ) {
        super(pizzas_repository);
    }

    async getAllWithCount(): Promise<[Partial<Pizza>[], number]> {
        const [items, count] = await Promise.all([
            this.pizza_model.find().lean().exec(),
            this.pizza_model.countDocuments(),
        ]);

        return [
            items.map((pizza) =>
                omit({ ...pizza, id: pizza._id.toString() }, '_id', '__v'),
            ),
            count,
        ];
    }

    async getById(id: string): Promise<Partial<Pizza>> {
        if (!Types.ObjectId.isValid(id)) {
            throw new NotFoundException('Invalid pizza id');
        }

        const pizza = await this.pizza_model.findById(id).lean().exec();
        if (!pizza) {
            throw new NotFoundException('Pizza not found');
        }

        return convertObjectIdToString(pizza);
    }
}
