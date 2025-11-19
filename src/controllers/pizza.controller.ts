import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PizzaResponse } from '@/models/responses/pizza.response';
import { ListResponse } from '@/models/responses/list.response';
import { PizzasService } from '@/services/pizza.service';
import { Pizza } from '@/models/entities/pizza.entity';

@ApiTags('Pizza')
@Controller('pizzas')
export class PizzasController {
    constructor(private readonly pizzasService: PizzasService) { }

    @Get()
    @ApiOperation({ summary: 'Get all pizzas' })
    @ApiResponse({
        status: 200,
        description: 'List all pizzas',
        schema: {
            example: {
                count: 2,
                items: [
                    {
                        id: '6751e9b8a93e7dbb74cbf123',
                        name: 'Cheesy Marvel',
                        image: 'https://cdn.pixabay.com/photo/2017/12/09/08/18/pizza-3007395_1280.jpg',
                        price: 10.8,
                        oldPrice: 12.0,
                        tags: ['NON-VEG', 'BALANCE'],
                        nutrition: {
                            calories: 267,
                            protein: 36,
                            fat: 21,
                            carbs: 38,
                        },
                    },
                    {
                        id: '6751e9b8a93e7dbb74cbf456',
                        name: 'Veg Delight',
                        image: 'https://cdn.pixabay.com/photo/2021/02/15/09/23/pizza-6016710_1280.jpg',
                        price: 9.5,
                        tags: ['VEG', 'LIGHT'],
                        nutrition: {
                            calories: 240,
                            protein: 30,
                            fat: 18,
                            carbs: 33,
                        },
                    },
                ],
            },
        },
    })
    async getAll(): Promise<ListResponse<Partial<Pizza>>> {
        const [items, count] = await this.pizzasService.getAllWithCount();
        return { count, items };
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get pizza detail by id' })
    @ApiResponse({ status: 200, type: PizzaResponse })
    async getById(@Param('id') id: string): Promise<Partial<Pizza>> {
        return this.pizzasService.getById(id) as unknown as PizzaResponse;
    }
}
