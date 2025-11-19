import { IsString, IsNumber, Min } from 'class-validator';

export class CartItemInputDto {
    @IsString()
    menuId: string;

    @IsNumber()
    @Min(1)
    quantity: number;
}
