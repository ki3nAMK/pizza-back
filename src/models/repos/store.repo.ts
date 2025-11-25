import { BaseRepositoryAbstract } from '@/base/abstract-repository.base';
import { BaseRepositoryInterface } from '@/base/repository.base';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Store } from '../entities/store.entity';

@Injectable()
export class StoreRepository
  extends BaseRepositoryAbstract<Store>
  implements BaseRepositoryInterface<Store>
{
  constructor(
    @InjectModel(Store.name)
    private readonly storeRepository: Model<Store>,
  ) {
    super(storeRepository);
  }
}
