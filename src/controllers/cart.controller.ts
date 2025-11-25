import { CurrentUserId, SkipVerification } from '@/decorators';
import { ShipperVerification } from '@/decorators/shipper-verification.decorator';
import { SessionType } from '@/enums/session-type.enum';
import { JwtAccessTokenGuard } from '@/guards';
import { Cart } from '@/models/entities/cart.entity';
import { CreateCartDto } from '@/models/requests/add-to-cart.request';
import { ListResponse } from '@/models/responses/list.response';
import { CartService } from '@/services/cart.service';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiBearerAuth(SessionType.ACCESS)
@ApiTags('Carts')
@UseGuards(JwtAccessTokenGuard)
@Controller('carts')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post()
  @SkipVerification()
  @ApiOperation({ summary: 'Create cart with bulk items' })
  @ApiResponse({
    status: 201,
    description: 'Cart created successfully',
    schema: {
      example: {
        _id: '6751e9b8a93e7dbb74cbf123',
        userId: '123456789',
        items: [
          {
            id: 'menu1',
            name: 'Cheesy Burger',
            price: 12.5,
            image_url:
              'https://cdn.pixabay.com/photo/2017/04/23/00/43/burger-2252093_1280.jpg',
            quantity: 2,
          },
        ],
        totalPrice: 25.0,
        deliveryFee: 20000,
        latitude: 10.7625914,
        longitude: 106.6603286,
        createdAt: '2025-11-12T14:00:00.000Z',
        updatedAt: '2025-11-12T14:00:00.000Z',
      },
    },
  })
  async createCart(
    @CurrentUserId() userId: string,
    @Body() dto: CreateCartDto,
  ): Promise<Cart> {
    return this.cartService.createCart(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get cart for current user' })
  @ApiResponse({
    status: 200,
    description: 'Cart of user',
    schema: {
      example: {
        count: 1,
        items: [
          {
            _id: '6751e9b8a93e7dbb74cbf123',
            userId: '123456789',
            items: [
              {
                id: 'menu1',
                name: 'Cheesy Burger',
                price: 12.5,
                image_url:
                  'https://cdn.pixabay.com/photo/2017/04/23/00/43/burger-2252093_1280.jpg',
                quantity: 2,
              },
              {
                id: 'menu2',
                name: 'French Fries',
                price: 4.0,
                image_url:
                  'https://cdn.pixabay.com/photo/2016/03/05/19/02/french-fries-1238255_1280.jpg',
                quantity: 1,
              },
            ],
            totalPrice: 29.0,
            deliveryFee: 20000,
            latitude: 10.7625914,
            longitude: 106.6603286,
            createdAt: '2025-11-12T14:00:00.000Z',
            updatedAt: '2025-11-12T14:00:00.000Z',
          },
        ],
      },
    },
  })
  async getCart(@CurrentUserId() userId: string): Promise<ListResponse<Cart>> {
    return this.cartService.getCartByUser(userId);
  }

  @Get('pending-shipment')
  @ApiOperation({
    summary: 'Get orders with shipperId=null and status=CREATED',
  })
  @ApiResponse({
    status: 200,
    description: 'List of pending orders',
    type: ListResponse,
  })
  @ShipperVerification()
  async getPendingOrders(
    @CurrentUserId() userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ): Promise<ListResponse<Cart>> {
    const result = await this.cartService.getPendingOrders(
      userId,
      +page,
      +limit,
    );

    return result;
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Shipper accepts an order' })
  @ApiResponse({
    status: 200,
    description: 'Order successfully accepted',
    type: Cart,
  })
  @ShipperVerification()
  async acceptOrder(
    @CurrentUserId() shipperId: string,
    @Param('id') cartId: string,
  ): Promise<Cart> {
    return this.cartService.acceptOrder(cartId, shipperId);
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current delivering order for shipper' })
  @ApiResponse({
    status: 200,
    description: 'Current order assigned to shipper',
    schema: {
      example: {
        _id: '6915f95f53d6c09ddd83b347',
        userId: '123456789',
        items: [
          { id: 'menu1', name: 'Cheesy Burger', price: 12.5, quantity: 2 },
        ],
        totalPrice: 25,
        deliveryFee: 20000,
        latitude: 10.7626,
        longitude: 106.6603,
        status: 'DELIVERING',
        paths: [],
        distance: 1.2,
        deliveryCoord: { lat: 10.7626, lon: 106.6603 },
        createdAt: '2025-11-12T14:00:00.000Z',
        updatedAt: '2025-11-12T14:00:00.000Z',
      },
    },
  })
  @ShipperVerification()
  async getCurrentOrder(
    @CurrentUserId() shipperId: string,
  ): Promise<{ data: Cart | null }> {
    const cart = await this.cartService.getCurrentOrderByShipper(shipperId);

    return {
      data: cart,
    };
  }
}
