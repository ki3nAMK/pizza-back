import { SetMetadata } from '@nestjs/common';

export const ADMIN_VERIFICATION_KEY = 'admin-verification';

export const AdminVerification = () =>
  SetMetadata(ADMIN_VERIFICATION_KEY, true);
