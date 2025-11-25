import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { CloudMailService } from './mail.service';
import { DeliveryService } from './delivery.service';

@Injectable()
export class QueuesService implements OnModuleInit, OnModuleDestroy {
  static readonly CRAWL_URL_MESSAGE = 'crawl_url_message';
  static readonly SEND_MESSAGE_DIFY = 'send_message_dify';
  static readonly SEND_VERIFY_EMAIL = 'send_verify_email';
  static readonly NEW_ORDER_NOTIFY = 'new_order_notify';

  private connection!: amqp.ChannelModel;
  private channel!: amqp.Channel;

  constructor(
    private readonly configService: ConfigService,
    private readonly cloudMailService: CloudMailService,
    private readonly deliveryService: DeliveryService,
  ) {}

  async onModuleInit() {
    this.connection = await amqp.connect({
      hostname: this.configService.get<string>('rabbitmq.host'),
      port: this.configService.get<number>('rabbitmq.port'),
      username: this.configService.get<string>('rabbitmq.username'),
      password: this.configService.get<string>('rabbitmq.password'),
    });

    this.channel = await this.connection.createChannel();

    await this.channel.assertQueue(QueuesService.SEND_VERIFY_EMAIL, {
      durable: true,
    });
    await this.channel.assertQueue(QueuesService.NEW_ORDER_NOTIFY, {
      durable: true,
    });

    this.consumeSendVerifyEmail();
    this.consumNewOrderNoti();
  }

  consumeSendVerifyEmail() {
    this.channel.consume(
      QueuesService.SEND_VERIFY_EMAIL,
      async (msg) => {
        if (!msg) return;

        try {
          const data = JSON.parse(msg.content.toString());

          const { email, fullName, code, verificationUrl, expiresIn } = data;

          await this.cloudMailService.sendVerifyEmail(email, {
            fullName,
            code,
            verificationUrl,
            expiresIn,
          });

          this.channel.ack(msg);
        } catch (err) {
          console.error('Failed to send email:', err);
          this.channel.nack(msg, false, true); // requeue
        }
      },
      { noAck: false },
    );
  }

  consumNewOrderNoti() {
    this.channel.consume(
      QueuesService.NEW_ORDER_NOTIFY,
      async (msg) => {
        if (!msg) return;

        try {
          const data = JSON.parse(msg.content.toString());

          const { orderId } = data;

          await this.deliveryService.requestShipperLocations(orderId);

          this.channel.ack(msg);
        } catch (err) {
          console.error('Failed to send order:', err);
          this.channel.nack(msg, false, true);
        }
      },
      { noAck: false },
    );
  }

  async onModuleDestroy() {
    await this.channel.close();
    await this.connection.close();
  }

  getChannel() {
    return this.channel;
  }

  sendMessage(queue: string, message: Record<string, any>) {
    this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
      persistent: true,
    });
  }
}
