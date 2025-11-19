import { HydratedDocument } from 'mongoose';

import { BaseEntity } from '@/base/entity.base';
import { CartState } from '@/enums/cart.enum';
import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

export type CartDocument = HydratedDocument<Cart>;

export class CartItem {
  @Prop({ required: true })
  id: string; // id của menu

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  image_url: string;

  @Prop({ required: true, min: 1 })
  quantity: number;
}

export class Coordinate {
  @Prop({ type: Number })
  lat: number;

  @Prop({ type: Number })
  lon: number;
}

@Schema({ timestamps: true })
export class Cart extends BaseEntity {
  @Prop({ required: true })
  userId: string;

  @Prop({ type: [Object], default: [] })
  items: CartItem[];

  @Prop({ required: true })
  totalPrice: number;

  @Prop({ required: true })
  deliveryFee: number;

  @Prop({ required: true })
  latitude: number;

  @Prop({ required: true })
  longitude: number;

  @Prop({ enum: CartState, default: CartState.CREATED })
  status: CartState;

  @Prop({ type: [Object], default: [] })
  paths: Coordinate[];

  @Prop({ type: Coordinate, required: true })
  deliveryCoord: Coordinate;

  @Prop({ required: true })
  distance: number;

  @Prop({ required: false, default: null })
  shipperId: string;
}

export const CartSchema = SchemaFactory.createForClass(Cart);
