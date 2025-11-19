import { IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { CartItemInputDto } from './cart-item.request';

export class CreateCartDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CartItemInputDto)
    items: CartItemInputDto[];

    @IsNumber()
    latitude: number;

    @IsNumber()
    longitude: number;
}
