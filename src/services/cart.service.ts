import { BaseServiceAbstract } from '@/base/abstract-service.base';
// cart.service.ts
import { CartState } from '@/enums/cart.enum';
import { ShipperEvent } from '@/enums/shipper-event.enum';
import { Cart, Coordinate } from '@/models/entities/cart.entity';
import { CartRepository } from '@/models/repos/cart.repo';
import { MenuRepository } from '@/models/repos/menu.repo';
import { CreateCartDto } from '@/models/requests/add-to-cart.request';
import { ListResponse } from '@/models/responses/list.response';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { DeliveryService } from './delivery.service';
import { size } from 'lodash';
import { QueuesService } from './queue.service';
import { StoreRepository } from '@/models/repos/store.repo';
import { UsersRepository } from '@/models/repos/user.repo';
import { SHIPPER_STATUS } from '@/enums/shipper.enum';

@Injectable()
export class CartService extends BaseServiceAbstract<Cart> {
  constructor(
    private readonly cartRepo: CartRepository,
    private readonly menuRepo: MenuRepository,
    private readonly userRepo: UsersRepository,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly queuesService: QueuesService,
    private readonly storeRepo: StoreRepository,
  ) {
    super(cartRepo);
  }

  async getCartByUser(userId: string): Promise<ListResponse<Cart>> {
    const { items: carts, count } = await this.cartRepo.findAll({ userId });
    return {
      count,
      items: carts,
    };
  }

  async createCart(userId: string, dto: CreateCartDto): Promise<Cart> {
    const shopLat = this.configService.get('store.lat');
    const shopLon = this.configService.get('store.lon');

    const activeCarts = await this.cartRepo.findAll({
      userId,
      state: { $ne: CartState.DONE },
    });

    if (activeCarts.items.length >= 3) {
      throw new BadRequestException(
        'Bạn chỉ được tạo tối đa 3 đơn hàng chưa hoàn tất cùng lúc.',
      );
    }

    const menuIds = dto.items.map((i) => i.menuId);
    const { items: menus } = await this.menuRepo.findAll({
      _id: { $in: menuIds },
    });

    if (!menus || menus.length === 0) {
      throw new NotFoundException('Menu items not found');
    }

    const cartItems = dto.items.map((item) => {
      const menu = menus.find((m) => m._id.toString() === item.menuId);
      if (!menu) throw new NotFoundException(`Menu ${item.menuId} not found`);

      return {
        id: menu._id.toString(),
        name: menu.name,
        price: menu.price,
        image_url: menu.image_url,
        quantity: item.quantity,
      };
    });

    const totalPrice = cartItems.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0,
    );

    const deliveryFee = this.calculateDeliveryFee(dto.latitude, dto.longitude);

    const firstMenu = menus[0];
    const store = await this.storeRepo.findOneByCondition({
      menus: firstMenu._id.toString(),
    });

    if (!store) {
      throw new NotFoundException('Store of menu not found');
    }

    const cart = await this.cartRepo.create({
      userId,
      items: cartItems,
      totalPrice,
      deliveryFee,
      latitude: dto.latitude,
      longitude: dto.longitude,
      // paths,
      // distance,
      deliveryCoord: {
        lat: store.latitude,
        lon: store.longitude,
      },
    });

    this.queuesService.sendMessage(QueuesService.NEW_ORDER_NOTIFY, {
      orderId: cart._id.toString(),
    });

    return cart;
  }

  private calculateDeliveryFee(lat: number, lon: number): number {
    return 20000;
  }

  async getPendingOrders(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<ListResponse<Cart>> {
    const skip = (page - 1) * limit;

    const { items, count } = await this.cartRepo.findAll(
      { shipperId: userId, state: { $ne: CartState.DONE } },
      { skip, limit, sort: { createdAt: -1 } },
    );

    return { count, items };
  }

  async acceptOrder(cartId: string, shipperId: string): Promise<Cart> {
    const activeOrder = await this.cartRepo.findOneByCondition({
      shipperId,
      status: CartState.DELIVERING,
    });

    if (activeOrder) {
      throw new BadRequestException(
        'Bạn đang có đơn hàng đang giao. Hoàn tất đơn hiện tại trước khi nhận đơn mới.',
      );
    }

    const cart = await this.cartRepo.findOneById(cartId);
    if (!cart) throw new NotFoundException('Order not found');

    if (cart.status !== CartState.CREATED) {
      throw new BadRequestException(
        'Đơn này không thể nhận. Chỉ đơn CREATED mới được nhận.',
      );
    }

    cart.shipperId = shipperId;
    cart.status = CartState.DELIVERING;

    this.eventEmitter.emit(ShipperEvent.ORDER_DELIVERING, {
      orderId: cart._id.toString(),
      shipperId,
    });

    return this.cartRepo.update(cartId, {
      shipperId,
      status: CartState.DELIVERING,
    });
  }

  async completeOrder(cartId: string, shipperId: string): Promise<Cart> {
    const cart = await this.cartRepo.findOneById(cartId);
    if (!cart) throw new NotFoundException('Order not found');

    if (cart.shipperId !== shipperId) {
      throw new BadRequestException('Bạn không phải shipper của đơn này');
    }

    if (cart.status !== CartState.DELIVERING) {
      throw new BadRequestException('Chỉ đơn đang giao mới có thể hoàn tất');
    }

    const shipper = await this.userRepo.findOneByCondition({
      _id: cart.shipperId,
    });
    shipper.status = SHIPPER_STATUS.DELIVERING;

    await this.userRepo.update(cart.shipperId, shipper);

    return this.cartRepo.update(cartId, { status: CartState.DONE });
  }

  async getCurrentOrderByShipper(shipperId: string): Promise<Cart | null> {
    const order = await this.cartRepo.findOneByCondition({
      shipperId,
      status: CartState.DELIVERING,
    });

    if (!order) return null;

    return order;
  }

  async getAllDeliveringCarts(): Promise<Cart[]> {
    return this.cartRepo.findAll({ status: CartState.DELIVERING });
  }

  async handleUpdateLocationShipper(
    shipperId: string,
    orderId: string,
    location: Coordinate,
  ) {
    const order = await this.findOne(orderId);

    if (shipperId !== order.shipperId) {
      throw new BadRequestException('Bạn không phải shipper của đơn này');
    }

    await this.cartRepo.update(orderId, {
      deliveryCoord: {
        lat: location.lat,
        lon: location.lon,
      },
    });

    this.eventEmitter.emit(ShipperEvent.SHIPPER_UPDATE_LOCATION, {
      orderId,
      location,
    });
  }
}
