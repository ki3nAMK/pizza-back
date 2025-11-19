import { BaseEntity } from '@/base/entity.base';
import { CustomizationType } from '@/enums/customization.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Menu } from './menu.entity';

export type CustomizationDocument = HydratedDocument<Customization>;

@Schema({
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    },
})
export class Customization extends BaseEntity {
    @Prop({ required: true })
    name: string;

    @Prop({ type: Number, required: true })
    price: number;

    @Prop({ enum: CustomizationType, default: CustomizationType.BASE })
    type: CustomizationType;

    @Prop({ type: [{ type: Types.ObjectId, ref: 'Menu' }] })
    menus?: Menu[];
}

export const CustomizationSchema = SchemaFactory.createForClass(Customization);
