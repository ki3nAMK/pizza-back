import { BaseEntity } from '@/base/entity.base';
import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class Setting extends BaseEntity {
  @Prop({ type: Number, default: 5 })
  maxLoginRetry: number;

  @Prop({ type: Number, default: 300 })
  loginTimeout: number;

  @Prop({ required: true, default: 3 })
  accessTokenExpiresIn: number;

  @Prop({ required: true, default: 30 })
  refreshTokenExpiresIn: number;
}

export const SettingSchema = SchemaFactory.createForClass(Setting);
