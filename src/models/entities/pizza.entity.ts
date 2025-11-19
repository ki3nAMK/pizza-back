import { BaseEntity } from '@/base/entity.base';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PizzaDocument = HydratedDocument<Pizza>;

@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    },
})
export class Pizza extends BaseEntity {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    image: string;

    @Prop({ type: Number, required: true })
    price: number;

    @Prop({ type: Number })
    oldPrice?: number;

    @Prop({ type: [String], default: [] })
    tags: string[];

    @Prop({
        type: Object,
        default: { calories: 0, protein: 0, fat: 0, carbs: 0 },
    })
    nutrition: {
        calories: number;
        protein: number;
        fat: number;
        carbs: number;
    };
}

export const PizzaSchema = SchemaFactory.createForClass(Pizza);
