import { CurrentSession, CurrentToken, CurrentUser } from '@/decorators';
import { SessionType } from '@/enums/session-type.enum';
import { JwtAccessTokenGuard } from '@/guards';
import { LoginRequest } from '@/models/requests/login.request';
import { PassphraseRequest } from '@/models/requests/passphrase.request';
import { RegisterRequest } from '@/models/requests/register.request';
import { LoginResponse } from '@/models/responses/login.response';
import { OkResponse } from '@/models/responses/ok.response';
import { PassphraseResponse } from '@/models/responses/passphrase.response';
import { RegisterResponse } from '@/models/responses/register.response';
import { AuthService } from '@/services/auth.service';
import {
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
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IsString } from 'class-validator';


@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('sign-up')
  @ApiOperation({ summary: 'Create new account' })
  @ApiBody({ type: RegisterRequest })
  @ApiResponse({ status: 201, type: RegisterResponse })
  async register(@Body() dto: RegisterRequest): Promise<RegisterResponse> {
    return this.authService.register(dto);
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
