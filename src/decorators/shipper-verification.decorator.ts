import { SetMetadata } from '@nestjs/common';

export const SHIPPER_VERIFICATION_KEY = 'shipper-verification';

export const ShipperVerification = () =>
  SetMetadata(SHIPPER_VERIFICATION_KEY, true);
