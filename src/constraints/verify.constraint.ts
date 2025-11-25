import * as crypto from 'crypto';

import { SYSTEM_PRIVATE_KEY } from '@/constraints/jwt.constraint';

export function decryptWithSystemToken(encryptedData: string): string {
  const buffer = Buffer.from(encryptedData, 'base64');

  const decrypted = crypto.privateDecrypt(
    {
      key: SYSTEM_PRIVATE_KEY,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    buffer,
  );

  return decrypted.toString('utf-8');
}
