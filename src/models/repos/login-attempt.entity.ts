import { Model } from 'mongoose';

import { BaseRepositoryAbstract } from '@/base/abstract-repository.base';
import { BaseRepositoryInterface } from '@/base/repository.base';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { LoginAttempt } from '../entities/login-attempt.entity';

@Injectable()
export class LoginAttemptRepository
  extends BaseRepositoryAbstract<LoginAttempt>
  implements BaseRepositoryInterface<LoginAttempt>
{
  constructor(
    @InjectModel(LoginAttempt.name)
    private readonly loginAttemptModel: Model<LoginAttempt>,
  ) {
    super(loginAttemptModel);
  }
}
