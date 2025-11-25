import { isNil } from 'lodash';
import { Server } from 'socket.io';

import { ShipperEvent } from '@/enums/shipper-event.enum';
import { SocketNamespace } from '@/enums/socket-namespace.enum';
import { CustomSocket } from '@/interfaces/socket.interface';
import { Cart, Coordinate } from '@/models/entities/cart.entity';
import { CartService } from '@/services/cart.service';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: false,
  },
  pingInterval: 1000,
  pingTimeout: 3000,
  namespace: SocketNamespace.SHIPPER,
})
export class ShipperGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private readonly cartService: CartService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @WebSocketServer()
  server: Server;

  async handleConnection(client: CustomSocket) {
    const shipprtId = client.handshake.currentUserId;
    const token = client.handshake.query.token;

    const currentOrder =
      await this.cartService.getCurrentOrderByShipper(shipprtId);

    console.log(
      `Shipper ${shipprtId} join socket or order ${currentOrder._id.toString()}`,
    );

    if (!isNil(currentOrder)) {
      client.join(currentOrder._id.toString());
    }

    client.join(token);
    client.join(shipprtId);
  }

  async handleDisconnect(client: CustomSocket) {
    const token = client.handshake.query.token;
    client.leave(token as string);
  }

  @OnEvent(ShipperEvent.ORDER_DELIVERING)
  handleDeliverOrder(payload: { orderId: string; shipperId: string }) {
    let thisUserSocket: CustomSocket;
    const { orderId, shipperId } = payload;

    const socketIds = (this.server.sockets as any)?.keys();
    for (const socketId of socketIds) {
      const socket = (this.server.sockets as any)?.get(
        socketId,
      ) as CustomSocket;

      if (socket.handshake.currentUserId === shipperId) {
        thisUserSocket = socket;
        thisUserSocket.join(orderId);
      }
    }

    this.server.to(orderId).emit('acceptOrder', {
      message: 'OrderAcceptedByShipper',
    });
  }

  @OnEvent(ShipperEvent.REQUEST_SHIPPER_UPDATE_LOCATION)
  handleRequestUpdateShipperLocation(payload: {
    orderId: string;
    shipperId: string;
  }) {
    this.server.to(payload.orderId).emit('requestUpdateLocation', {
      message: 'OrderAcceptedByShipper',
      orderId: payload.orderId,
    });
  }

  @OnEvent(ShipperEvent.SHIPPER_UPDATE_LOCATION)
  handleShipperUpdateLocation(payload: {
    orderId: string;
    location: Coordinate;
  }) {
    this.server.to(payload.orderId).emit('shipperUpdateLocation', {
      location: payload.location,
    });
  }

  @OnEvent(ShipperEvent.REQUEST_SHIPPER_UPDATE_LOCATION_NEW_ORDER)
  handleRequestUpdateShipperLocationNewOrder(payload: { shipperId: string }) {
    const socketIds = (this.server.sockets as any)?.keys();
    let thisUserSocket: CustomSocket;
    for (const socketId of socketIds) {
      const socket = (this.server.sockets as any)?.get(
        socketId,
      ) as CustomSocket;

      if (socket.handshake.currentUserId === payload.shipperId) {
        thisUserSocket = socket;
      }
    }

    this.server.to(payload.shipperId).emit('newOrder', {
      message: 'OrderAcceptedByShipper',
    });
  }

  @OnEvent(ShipperEvent.ORDER_DECIDE_SHIPPER)
  handleOrderDecideShipper(payload: { shipperId: string; order: Cart }) {
    const socketIds = (this.server.sockets as any)?.keys();
    let shipperSocket: CustomSocket;
    for (const socketId of socketIds) {
      const socket = (this.server.sockets as any)?.get(
        socketId,
      ) as CustomSocket;

      if (socket.handshake.currentUserId === payload.shipperId) {
        shipperSocket = socket;
      }
    }

    this.server.to(payload.shipperId).emit('newOrderRequest', {
      message: 'NewOrderForYouToDelivery',
    });
  }

  @SubscribeMessage('shipper-update-location')
  async handleUpdateLocationShipper(
    @MessageBody()
    data: { orderId: string; location: { lat: number; lon: number } },
    @ConnectedSocket() client: CustomSocket,
  ) {
    const { orderId, location } = data;

    const shipprtId = client.handshake.currentUserId;

    await this.cartService.handleUpdateLocationShipper(
      shipprtId,
      orderId,
      location,
    );
  }

  @SubscribeMessage('shipper-update-location-new-order')
  async handleUpdateLocationShipperNewOrder(
    @MessageBody()
    data: { location: { lat: number; lon: number } },
    @ConnectedSocket() client: CustomSocket,
  ) {
    const { location } = data;
    const shipperId = client.handshake.currentUserId;

    // handle logic here
    this.eventEmitter.emit(ShipperEvent.SHIPPER_UPDATE_LOCATION_INTERNAL, {
      shipperId,
      location,
    });
  }
}
