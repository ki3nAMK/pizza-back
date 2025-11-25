import { forEach, isNil } from 'lodash';
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
import { cli } from 'winston/lib/winston/config';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: false,
  },
  pingInterval: 1000,
  pingTimeout: 3000,
  namespace: SocketNamespace.CLIENT,
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
    const userId = client.handshake.currentUserId;
    const token = client.handshake.query.token;

    const currentOrder = await this.cartService.getCartByUser(userId);

    forEach(currentOrder.items, (order) => {
      client.join(order._id.toString());
    });

    client.join(token);
    client.join(userId);
  }

  async handleDisconnect(client: CustomSocket) {
    const token = client.handshake.query.token;
    client.leave(token as string);
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

  @OnEvent(ShipperEvent.ORDER_DECIDE_SHIPPER)
  handleOrderDecideShipper(payload: { shipperId: string; order: Cart }) {
    const socketIds = (this.server.sockets as any)?.keys();
    let userSocket: CustomSocket;
    for (const socketId of socketIds) {
      const socket = (this.server.sockets as any)?.get(
        socketId,
      ) as CustomSocket;

      if (socket.handshake.currentUserId === payload.order.userId) {
        userSocket = socket;
      }
    }

    userSocket.join(payload.order._id.toString());

    this.server.to(payload.order.userId).emit('newOrderFindShipper', {
      message: 'OrderFindShipper',
    });
  }
}
