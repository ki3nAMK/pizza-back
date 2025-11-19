import { SkipVerification } from '@/decorators';
import { AdminVerification } from '@/decorators/admin-verification.decorator';
import { SessionType } from '@/enums/session-type.enum';
import { JwtAccessTokenGuard } from '@/guards';
import { UpdateSettingDto } from '@/models/requests/update-setting.request';
import { SettingsService } from '@/services/setting.service';
import {
  Body,
  Controller,
  Get,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiBearerAuth(SessionType.ACCESS)
@ApiTags('Admins')
@UseGuards(JwtAccessTokenGuard)
@AdminVerification()
@Controller('admin/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @SkipVerification()
  @ApiOperation({ summary: 'Get current security policy settings' })
  @ApiResponse({
    status: 200,
    description: 'Security settings fetched successfully',
    schema: {
      example: {
        _id: '67520c49dfe170e5db7d1234',
        maxLoginRetry: 5,
        loginTimeout: 300,
        created_at: '2025-11-18T12:00:00.000Z',
        updated_at: '2025-11-18T12:00:00.000Z',
      },
    },
  })
  getSettings() {
    return this.settingsService.get();
  }

  @Put()
  @SkipVerification()
  @ApiOperation({ summary: 'Update login security policy' })
  @ApiResponse({
    status: 200,
    description: 'Security policy updated successfully',
    schema: {
      example: {
        _id: '67520c49dfe170e5db7d1234',
        maxLoginRetry: 7,
        loginTimeout: 600,
        created_at: '2025-11-18T12:00:00.000Z',
        updated_at: '2025-11-18T12:10:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'maxLoginRetry must not be less than 1',
          'loginTimeout must not be less than 60',
        ],
        error: 'Bad Request',
      },
    },
  })
  updateSettings(@Body() dto: UpdateSettingDto) {
    return this.settingsService.updateSetting(dto);
  }
}
