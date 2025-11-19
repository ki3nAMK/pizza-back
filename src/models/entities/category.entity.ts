import { BaseEntity } from '@/base/entity.base';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    },
})
export class Category extends BaseEntity {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    description: string;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
