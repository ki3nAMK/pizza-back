import { BaseServiceAbstract } from '@/base/abstract-service.base';
import { Setting } from '@/models/entities/setting.entity';
import { SettingsRepository } from '@/models/repos/setting.repo';
import { UpdateSettingDto } from '@/models/requests/update-setting.request';
import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';

@Injectable()
export class SettingsService
  extends BaseServiceAbstract<Setting>
  implements OnModuleInit
{
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly settingRepo: SettingsRepository) {
    super(settingRepo);
  }

  async onModuleInit() {
    try {
      const existing = await this.settingRepo.findOneByCondition({});
      if (!existing) {
        const defaultSetting = {
          maxLoginRetry: 5,
          loginTimeout: 300,
          accessTokenExpiresIn: 3,
          refreshTokenExpiresIn: 30,
        };
        await this.settingRepo.create(defaultSetting);
        this.logger.log('Default setting created');
      } else {
        this.logger.log('Setting already exists');
      }
    } catch (error) {
      this.logger.error('Error initializing settings', error);
    }
  }

  async get(): Promise<Setting> {
    let setting = await this.settingRepo.findOneByCondition({});
    if (!setting) {
      setting = await this.settingRepo.create({
        maxLoginRetry: 5,
        loginTimeout: 300,
        accessTokenExpiresIn: 3,
        refreshTokenExpiresIn: 30,
      });
    }
    return setting;
  }

  async updateSetting(dto: UpdateSettingDto): Promise<Setting> {
    const setting = await this.get();
    return await this.settingRepo.update(setting.id, dto);
  }
}
