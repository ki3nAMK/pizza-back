import { ApiProperty } from '@nestjs/swagger';

class NutritionResponse {
    @ApiProperty({ example: 267 })
    calories: number;

    @ApiProperty({ example: 36 })
    protein: number;

    @ApiProperty({ example: 21 })
    fat: number;

    @ApiProperty({ example: 38 })
    carbs: number;
}

export class PizzaResponse {
    @ApiProperty({ example: '6751e9b8a93e7dbb74cbf123' })
    id: string;

    @ApiProperty({ example: 'Cheesy Marvel' })
    name: string;

    @ApiProperty({
        example:
            'https://cdn.pixabay.com/photo/2017/12/09/08/18/pizza-3007395_1280.jpg',
    })
    image: string;

    @ApiProperty({ example: 10.8 })
    price: number;

    @ApiProperty({ example: 12.0 })
    oldPrice?: number;

    @ApiProperty({ example: ['NON-VEG', 'BALANCE'] })
    tags: string[];

    @ApiProperty({ type: NutritionResponse })
    nutrition: NutritionResponse;
}

export class PizzaListResponse {
    @ApiProperty({ type: [PizzaResponse] })
    items: PizzaResponse[];
}
