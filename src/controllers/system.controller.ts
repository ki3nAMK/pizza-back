import { SYSTEM_PUBLIC_KEY } from '@/constraints/jwt.constraint';
import {
  Controller,
  Get,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

@Controller('system')
export class SystemController {
  @Get('public-key')
  @ApiOperation({
    summary: 'Get server public key for encrypting sensitive data',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns public key',
    schema: {
      example: { publicKey: SYSTEM_PUBLIC_KEY },
    },
  })
  getPublicKey() {
    return { publicKey: SYSTEM_PUBLIC_KEY };
  }
}
