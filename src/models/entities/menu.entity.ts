import { BaseEntity } from '@/base/entity.base';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Category } from './category.entity';
import { Customization } from './customizations.entity';

export type MenuDocument = HydratedDocument<Menu>;

// menu.entity.ts
@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    },
})
export class Menu extends BaseEntity {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    description: string;

    @Prop({ required: true })
    image_url: string;

    @Prop({ type: Number, required: true, min: 1, max: 5 })
    rating: number;

    @Prop({ type: Number, required: true, min: 1, max: 10000 })
    calories: number;

    @Prop({ type: Number, required: true, min: 0, max: 10000 })
    protein: number;

    @Prop({ type: Number, required: true, min: 0, max: 10000 })
    price: number;

    @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
    category: Types.ObjectId;

    @Prop({ type: [{ type: Types.ObjectId, ref: 'Customization' }] })
    customizations: Customization[];
}


export const MenuSchema = SchemaFactory.createForClass(Menu);
