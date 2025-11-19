import { redisStore } from 'cache-manager-ioredis-yet';

import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import {
  ConfigModule,
  ConfigService,
} from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';

import { loadConfiguration } from './configs/app.config';
import { SettingsController } from './controllers/admin.controller';
import { AuthController } from './controllers/auth.controller';
import { CartController } from './controllers/cart.controller';
import { MenuController } from './controllers/menu.controller';
import { SystemController } from './controllers/system.controller';
import { UserController } from './controllers/user.controller';
import { ShipperGateway } from './gateways/shipper.gateway';
import {
  AppClassSerializerInterceptor,
} from './interceptors/mongo-class-serializer.interceptor';
import {
  Cart,
  CartSchema,
} from './models/entities/cart.entity';
import {
  Category,
  CategorySchema,
} from './models/entities/category.entity';
import {
  Customization,
  CustomizationSchema,
} from './models/entities/customizations.entity';
import {
  LoginAttempt,
  LoginAttemptSchema,
} from './models/entities/login-attempt.entity';
import {
  Menu,
  MenuSchema,
} from './models/entities/menu.entity';
import {
  Session,
  SessionSchema,
} from './models/entities/session.entity';
import {
  Setting,
  SettingSchema,
} from './models/entities/setting.entity';
import {
  User,
  UserSchema,
} from './models/entities/user.entity';
import { CartRepository } from './models/repos/cart.repo';
import { CategoriesRepository } from './models/repos/category.repo';
import { CustomizationRepository } from './models/repos/customization.repo';
import { LoginAttemptRepository } from './models/repos/login-attempt.entity';
import { MenuRepository } from './models/repos/menu.repo';
import { SessionsRepository } from './models/repos/session.repo';
import { SettingsRepository } from './models/repos/setting.repo';
import { UsersRepository } from './models/repos/user.repo';
import AppLoggerService from './services/app-logger.service';
import { AuthService } from './services/auth.service';
import { CacheDomain } from './services/cache.service';
import { CartService } from './services/cart.service';
import { CronService } from './services/cron.service';
import { DeliveryService } from './services/delivery.service';
import { MenuService } from './services/menu.service';
import { SessionService } from './services/session.service';
import { SettingsService } from './services/setting.service';
import { UsersService } from './services/user.service';
import {
  JwtAccessTokenStrategy,
  JwtRefreshTokenStrategy,
} from './strategies';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [() => loadConfiguration()],
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const { uri } = configService.get('mongo');
        return { uri };
      },
    }),

    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: Session.name,
        schema: SessionSchema,
      },
      {
        name: Category.name,
        schema: CategorySchema,
      },
      {
        name: Menu.name,
        schema: MenuSchema,
      },
      {
        name: Customization.name,
        schema: CustomizationSchema,
      },
      {
        name: Cart.name,
        schema: CartSchema,
      },
      {
        name: Setting.name,
        schema: SettingSchema,
      },
      {
        name: LoginAttempt.name,
        schema: LoginAttemptSchema,
      },
    ]),

    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const { host, port, database, password } = configService.get('redis');
        return {
          store: redisStore,
          host,
          port,
          db: database,
          password,
          ttl: 0,
        };
      },
    }),

    PassportModule.register({}),
    JwtModule.register({}),
    ScheduleModule.forRoot(),

    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 10,
    }),

    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60 * 1000,
          limit: 10,
        },
      ],
    }),

    HttpModule,
  ],
  controllers: [
    AuthController,
    UserController,
    MenuController,
    CartController,
    SystemController,
    SettingsController,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: AppClassSerializerInterceptor },

    AppLoggerService,

    // * services
    CacheDomain,
    SessionService,
    AuthService,
    UsersService,
    // SeedService,
    MenuService,
    CartService,
    DeliveryService,
    CronService,
    SettingsService,

    // * repos
    UsersRepository,
    SessionsRepository,
    CategoriesRepository,
    CustomizationRepository,
    MenuRepository,
    CartRepository,
    SettingsRepository,
    LoginAttemptRepository,

    // * Strategy
    JwtAccessTokenStrategy,
    JwtRefreshTokenStrategy,

    // * Gateway
    ShipperGateway,
  ],
})
export class AppModule {}
