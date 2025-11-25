// store.entity.ts
import { BaseEntity } from '@/base/entity.base';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Menu } from './menu.entity';

export type StoreDocument = HydratedDocument<Store>;

@Schema({
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class Store extends BaseEntity {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  address: string;

  @Prop()
  image_url: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Menu' }] })
  menus: Menu[];

  @Prop({ required: true })
  latitude: number;

  @Prop({ required: true })
  longitude: number;
}

export const StoreSchema = SchemaFactory.createForClass(Store);
