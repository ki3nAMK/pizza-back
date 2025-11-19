import { get } from 'lodash';

import { ShipperEvent } from '@/enums/shipper-event.enum';
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Cron,
  CronExpression,
} from '@nestjs/schedule';

import { CartService } from './cart.service';

@Injectable()
export class CronService {
  constructor(
    private readonly cartService: CartService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async requestShipperLocation() {
    const deliveringCarts = await this.cartService.getAllDeliveringCarts();

    for (const cart of get(deliveringCarts, 'items', [])) {
      this.eventEmitter.emit(ShipperEvent.REQUEST_SHIPPER_UPDATE_LOCATION, {
        orderId: cart._id.toString(),
        shipperId: cart.shipperId,
      });
    }
  }
}
