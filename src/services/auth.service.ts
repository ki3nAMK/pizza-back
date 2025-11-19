import { isEmpty } from 'lodash';

import { decryptWithSystemToken } from '@/constraints/verify.constraint';
import { ErrorDictionary } from '@/enums/error-dictionary.enum';
import { LoginRequest } from '@/models/requests/login.request';
import { RegisterRequest } from '@/models/requests/register.request';
import { LoginResponse } from '@/models/responses/login.response';
import { RegisterResponse } from '@/models/responses/register.response';
import { OK_RESPONSE } from '@/utils/constants';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { CacheDomain } from './cache.service';
import { SessionService } from './session.service';
import { SettingsService } from './setting.service';
import { UsersService } from './user.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly sessionService: SessionService,
    private readonly settingService: SettingsService,
    private readonly cacheService: CacheDomain,
  ) {}

  async register(dto: RegisterRequest): Promise<RegisterResponse> {
    const { email, password } = dto;

    const strongPasswordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

    if (!strongPasswordRegex.test(password)) {
      throw new BadRequestException({
        code: ErrorDictionary.WEAK_PASSWORD,
        message:
          'Password must be at least 8 characters long, include uppercase, lowercase, number and special character.',
      });
    }

    const isTakenEmail = await this.userService.isTakenEmail(email);
    if (isTakenEmail) {
      throw new ConflictException({
        code: ErrorDictionary.EMAIL_ALREADY_TAKEN,
      });
    }

    const { userId } = await this.userService.createUser(dto);

    const { accessExpiresAt, accessToken, refreshExpiresAt, refreshToken } =
      await this.sessionService.gen(userId);

    return {
      accessToken,
      refreshToken,
      accessExpiresAt,
      refreshExpiresAt,
    };
  }

  async login({ username, password }: LoginRequest): Promise<LoginResponse> {
    const user = await this.userService.getByUsername(username);
    if (isEmpty(user)) {
      throw new UnauthorizedException({
        code: ErrorDictionary.USERNAME_OR_PASSWORD_INCORRECT,
      });
    }

    const setting = await this.settingService.get();

    const retryKey = `login_retry:${user.id}`;

    const redis = this.cacheService.getRedisClient();

    return this.cacheService.withLock([retryKey], 5, async () => {
      let retryData: {
        count: number;
        lockedUntil: number;
      } = await redis
        .get(retryKey)
        .then((res) => (res ? JSON.parse(res) : { count: 0, lockedUntil: 0 }));

      const now = Date.now();

      if (retryData.lockedUntil && retryData.lockedUntil > now) {
        throw new UnauthorizedException({
          code: 'LOGIN_LOCKED',
          message: `Bạn đã nhập sai quá số lần quy định. Vui lòng thử lại sau ${Math.ceil(
            (retryData.lockedUntil - now) / 1000,
          )} giây.`,
        });
      }

      const decryptedPassword = decryptWithSystemToken(password);
      const isPasswordCorrect = await this.userService.comparePassword(
        decryptedPassword,
        user,
      );

      if (!isPasswordCorrect) {
        retryData.count += 1;

        if (retryData.count >= setting.maxLoginRetry) {
          retryData.lockedUntil = now + setting.loginTimeout * 1000;
          retryData.count = 0;
        }

        await redis.set(
          retryKey,
          JSON.stringify(retryData),
          'EX',
          setting.loginTimeout,
        );

        throw new UnauthorizedException({
          code: ErrorDictionary.USERNAME_OR_PASSWORD_INCORRECT,
        });
      }

      await redis.del(retryKey);

      return this.sessionService.gen(user.id);
    });
  }

  async logout(userId: string, sessionId: string, token: string) {
    await this.sessionService.delete({ sessionId, userId, accessToken: token });
    return OK_RESPONSE;
  }
}
