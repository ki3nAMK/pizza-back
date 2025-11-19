import { BaseRepositoryAbstract } from '@/base/abstract-repository.base';
import { BaseRepositoryInterface } from '@/base/repository.base';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart } from '../entities/cart.entity';

@Injectable()
export class CartRepository
    extends BaseRepositoryAbstract<Cart>
    implements BaseRepositoryInterface<Cart> {
    constructor(
        @InjectModel(Cart.name)
        private readonly cartModel: Model<Cart>,
    ) {
        super(cartModel);
    }
}
