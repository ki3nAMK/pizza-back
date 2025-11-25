import { IsNumber, Min } from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class UpdateSettingDto {
  @ApiProperty({
    description: 'Số lần đăng nhập tối đa trước khi khóa tài khoản',
    example: 5,
  })
  @IsNumber()
  @Min(1)
  maxLoginRetry: number;

  @ApiProperty({
    description: 'Thời gian khóa đăng nhập (giây) sau khi vượt maxLoginRetry',
    example: 300,
  })
  @IsNumber()
  @Min(60)
  loginTimeout: number;

  @ApiProperty({
    example: 3,
  })
  @IsNumber()
  @Min(1)
  maxResendOtp: number;

  @ApiProperty({
    example: 300,
  })
  @IsNumber()
  @Min(60)
  resendOtpTimeout: number;

  @ApiProperty({
    description: 'Số ngày hết hạn của Access Token',
    example: 3,
  })
  @IsNumber()
  @Min(1)
  accessTokenExpiresIn: number;

  @ApiProperty({
    description: 'Số ngày hết hạn của Refresh Token',
    example: 30,
  })
  @IsNumber()
  @Min(1)
  refreshTokenExpiresIn: number;
}
