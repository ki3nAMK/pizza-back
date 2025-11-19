import * as crypto from 'node:crypto';
import * as path from 'node:path';

import * as fs from 'fs';
import { JSEncrypt } from 'jsencrypt';
import * as forge from 'node-forge';

function checkExistFolder(name: string) {
  const checkPath = path.join(process.cwd(), name);
  if (!fs.existsSync(checkPath)) {
    fs.mkdirSync(checkPath, { recursive: true });
  }
}

export const encryptWithPublicKeyForge = (
  publicKeyPem: string,
  data: string,
) => {
  const publicKey = forge.pki.publicKeyFromPem(
    `-----BEGIN PUBLIC KEY-----\n${publicKeyPem}\n-----END PUBLIC KEY-----`,
  );

  const encrypted = publicKey.encrypt(data, 'RSAES-PKCS1-V1_5');

  return forge.util.encode64(encrypted);
};

export function decryptWithPrivateKeyForge(
  privateKeyBase64: string,
  encrypted: string,
): string {
  const pem = `-----BEGIN RSA PRIVATE KEY-----\n${privateKeyBase64}\n-----END RSA PRIVATE KEY-----`;
  const privateKey = forge.pki.privateKeyFromPem(pem);

  const encryptedBytes = forge.util.decode64(encrypted);

  return privateKey.decrypt(encryptedBytes, 'RSAES-PKCS1-V1_5');
}

export function encryptWithPublicKey(publicKey: string, data: string): string {
  const encryptor = new JSEncrypt();
  encryptor.setPublicKey(
    `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`,
  );
  return encryptor.encrypt(data) || '';
}

export function encryptWithPublicKeyBe(
  publicKey: string,
  data: string,
): string {
  const pem = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
  const buffer = Buffer.from(data, 'utf8');
  const encrypted = crypto.publicEncrypt(
    {
      key: pem,
      padding: crypto.constants.RSA_PKCS1_PADDING, // để tương thích với jsencrypt
    },
    buffer,
  );
  return encrypted.toString('base64');
}

function generateKeyPair(tokenType: string): {
  privateKey: string;
  publicKey: string;
} {
  checkExistFolder('secure');

  const privateKeyPath = path.join(
    process.cwd(),
    `secure/${tokenType}_private.key`,
  );
  const publicKeyPath = path.join(
    process.cwd(),
    `secure/${tokenType}_public.key`,
  );

  if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    fs.writeFileSync(privateKeyPath, privateKey);
    fs.writeFileSync(publicKeyPath, publicKey);
  }

  const privateKey = fs.readFileSync(privateKeyPath, 'utf-8');
  const publicKey = fs.readFileSync(publicKeyPath, 'utf-8');

  return { privateKey, publicKey };
}

export const {
  privateKey: ACCESS_TOKEN_PRIVATE_KEY,
  publicKey: ACCESS_TOKEN_PUBLIC_KEY,
} = generateKeyPair('access_token');

export const {
  privateKey: REFRESH_TOKEN_PRIVATE_KEY,
  publicKey: REFRESH_TOKEN_PUBLIC_KEY,
} = generateKeyPair('refresh_token');

export const { privateKey: SYSTEM_PRIVATE_KEY, publicKey: SYSTEM_PUBLIC_KEY } =
  generateKeyPair('system_token');
