import { Model } from 'mongoose';

import { BaseRepositoryAbstract } from '@/base/abstract-repository.base';
import { BaseRepositoryInterface } from '@/base/repository.base';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Setting } from '../entities/setting.entity';

@Injectable()
export class SettingsRepository
  extends BaseRepositoryAbstract<Setting>
  implements BaseRepositoryInterface<Setting>
{
  constructor(
    @InjectModel(Setting.name)
    private readonly settingModel: Model<Setting>,
  ) {
    super(settingModel);
  }
}
