import { get, isEmpty } from 'lodash';

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
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { CacheDomain } from './cache.service';
import { SessionService } from './session.service';
import { SettingsService } from './setting.service';
import { UsersService } from './user.service';
import { QueuesService } from './queue.service';
import { genOTP } from '@/utils/helper';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly sessionService: SessionService,
    private readonly settingService: SettingsService,
    private readonly cacheService: CacheDomain,
    private readonly queuesService: QueuesService,
  ) {}

  async register(dto: RegisterRequest): Promise<RegisterResponse> {
    const { email, password, name } = dto;

    // 1. Validate password
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

    const otp = genOTP();

    await this.cacheService
      .getRedisClient()
      .set(`verify:${email}`, JSON.stringify({ otp, email }), 'EX', 5 * 60);

    this.queuesService.sendMessage(QueuesService.SEND_VERIFY_EMAIL, {
      email,
      fullName: name,
      code: otp,
      expiresIn: '5 minutes',
      verificationUrl: '',
    });

    const { accessExpiresAt, accessToken, refreshExpiresAt, refreshToken } =
      await this.sessionService.gen(userId);

    return {
      accessToken,
      refreshToken,
      accessExpiresAt,
      refreshExpiresAt,
    };
  }

  async verifyOtp(email: string, otp: string): Promise<boolean> {
    console.log(email, otp);

    const redisClient = this.cacheService.getRedisClient();
    const dataStr = await redisClient.get(`verify:${email}`);

    if (!dataStr) return false;

    const data = JSON.parse(dataStr);

    if (data.otp !== otp) return false;

    const user = await this.userService.getByEmail(email);
    if (!user) return false;

    await this.userService.markEmailVerified(user._id.toString());

    await redisClient.del(`verify:${email}`);

    return true;
  }

  async login({ username, password }: LoginRequest): Promise<LoginResponse> {
    const user = await this.userService.getByUsername(username);

    if (isEmpty(user)) {
      throw new UnauthorizedException({
        code: ErrorDictionary.USERNAME_OR_PASSWORD_INCORRECT,
      });
    }

    if (!get(user, 'isVerified', false)) {
      throw new UnauthorizedException({
        code: ErrorDictionary.EMAIL_VERIFIED,
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

  async resendVerifyEmail(email: string): Promise<void> {
    console.log(email);
    const user = await this.userService.getByEmail(email);

    console.log(user);

    if (!user) {
      throw new NotFoundException({
        code: ErrorDictionary.USER_NOT_FOUND,
      });
    }

    if (user.isVerified) {
      throw new BadRequestException({
        code: ErrorDictionary.EMAIL_ALREADY_VERIFIED,
        message: 'Email has already been verified.',
      });
    }

    const setting = await this.settingService.get();

    const redis = this.cacheService.getRedisClient();
    const resendKey = `resend_otp:${email}`;

    return this.cacheService.withLock([resendKey], 5, async () => {
      let resendData: { count: number; lockedUntil: number } = await redis
        .get(resendKey)
        .then((res) => (res ? JSON.parse(res) : { count: 0, lockedUntil: 0 }));

      const now = Date.now();

      if (resendData.lockedUntil && resendData.lockedUntil > now) {
        throw new BadRequestException({
          code: 'RESEND_OTP_LOCKED',
          message: `Bạn đã gửi quá số lần quy định. Vui lòng thử lại sau ${Math.ceil(
            (resendData.lockedUntil - now) / 1000,
          )} giây.`,
        });
      }

      const otp = genOTP();
      await redis.set(
        `verify:${email}`,
        JSON.stringify({ otp, email }),
        'EX',
        5 * 60,
      );

      this.queuesService.sendMessage(QueuesService.SEND_VERIFY_EMAIL, {
        email,
        fullName: user.name,
        code: otp,
        expiresIn: '5 minutes',
        verificationUrl: '',
      });

      resendData.count += 1;

      if (resendData.count >= setting.maxResendOtp) {
        resendData.lockedUntil = now + setting.resendOtpTimeout * 1000;
        resendData.count = 0; // reset count sau khi lock
      }

      await redis.set(
        resendKey,
        JSON.stringify(resendData),
        'EX',
        setting.resendOtpTimeout,
      );
    });
  }
}
