import { CurrentSession, CurrentToken, CurrentUser } from '@/decorators';
import { SessionType } from '@/enums/session-type.enum';
import { JwtAccessTokenGuard } from '@/guards';
import { LoginRequest } from '@/models/requests/login.request';
import { RegisterRequest } from '@/models/requests/register.request';
import { ResendOtpDto } from '@/models/requests/resend-mail.request';
import { VerifyOtpDto } from '@/models/requests/verify-email.request';
import { LoginResponse } from '@/models/responses/login.response';
import { OkResponse } from '@/models/responses/ok.response';
import { RegisterResponse } from '@/models/responses/register.response';
import { AuthService } from '@/services/auth.service';
import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-up')
  @ApiOperation({ summary: 'Create new account' })
  @ApiBody({ type: RegisterRequest })
  @ApiResponse({ status: 201, type: RegisterResponse })
  async register(@Body() dto: RegisterRequest): Promise<RegisterResponse> {
    return this.authService.register(dto);
  }

  @Post('verify-email')
  async verifyEmail(@Body() dto: VerifyOtpDto) {
    const verified = await this.authService.verifyOtp(dto.email, dto.otp);

    if (!verified) {
      throw new BadRequestException('Invalid or expired OTP');
    }
    return { success: true, message: 'Email verified successfully' };
  }

  @Post('resend-otp')
  @ApiOperation({ summary: 'Resend verification OTP to email' })
  @ApiBody({ type: ResendOtpDto })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  @ApiResponse({
    status: 400,
    description: 'Email not found or already verified',
  })
  @ApiResponse({ status: 429, description: 'Too many resend attempts' })
  async resendOtp(@Body() dto: ResendOtpDto) {
    const { email } = dto;

    if (!email) {
      throw new BadRequestException('Email is required');
    }

    try {
      await this.authService.resendVerifyEmail(email);
      return { success: true, message: 'OTP sent successfully' };
    } catch (error: any) {
      if (error.response?.code === 'RESEND_OTP_LOCKED') {
        throw new BadRequestException(error.response.message);
      }
      throw new BadRequestException(error.message || 'Failed to resend OTP');
    }
  }

  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login for access/refresh token' })
  @ApiBody({ type: LoginRequest })
  @ApiResponse({ status: 200, type: LoginResponse })
  async login(@Body() dto: LoginRequest): Promise<LoginResponse> {
    return this.authService.login(dto);
  }

  @ApiBearerAuth(SessionType.ACCESS)
  @ApiOkResponse({
    type: () => OkResponse,
  })
  @ApiOperation({ summary: 'Logout and revoke the token' })
  @UseGuards(JwtAccessTokenGuard)
  @HttpCode(HttpStatus.OK)
  @Post('/sign-out')
  async logout(
    @CurrentUser() userId: string,
    @CurrentSession() sessionId: string,
    @CurrentToken() token: string,
  ): Promise<OkResponse> {
    const result = await this.authService.logout(userId, sessionId, token);
    return result;
  }
}
