import { Types } from 'mongoose';

import { BaseEntity } from '@/base/entity.base';
import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import { User } from './user.entity';

@Schema({ timestamps: true })
export class LoginAttempt extends BaseEntity {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId | User;

  @Prop({ type: Number, default: 0 })
  retryCount: number;

  @Prop({ type: Date, default: null })
  lockedUntil: Date | null;
}

export const LoginAttemptSchema = SchemaFactory.createForClass(LoginAttempt);
