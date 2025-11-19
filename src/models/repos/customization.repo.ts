// customization.repository.ts
import { BaseRepositoryAbstract } from '@/base/abstract-repository.base';
import { BaseRepositoryInterface } from '@/base/repository.base';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Customization } from '../entities/customizations.entity';

@Injectable()
export class CustomizationRepository
    extends BaseRepositoryAbstract<Customization>
    implements BaseRepositoryInterface<Customization> {
    constructor(
        @InjectModel(Customization.name)
        private readonly customizationRepository: Model<Customization>,
    ) {
        super(customizationRepository);
    }
}
