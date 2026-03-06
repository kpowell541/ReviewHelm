import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DecryptCommand, GenerateDataKeyCommand, KMSClient } from '@aws-sdk/client-kms';
import type { AppEnv } from '../../config/env.schema';

interface WrappedDekPayload {
  v: 1;
  kind: 'local';
  version: number;
  iv: string;
  ciphertext: string;
  authTag: string;
}

interface KmsWrappedDekPayload {
  v: 1;
  kind: 'aws_kms';
  version: number;
  keyId: string;
  ciphertext: string;
}

export interface EncryptedProviderSecret {
  tokenHint: string;
  keyVersion: number;
  keyProvider: 'local' | 'aws_kms';
  kmsKeyId: string | null;
  encryptedDek: string;
  ciphertext: string;
  iv: string;
  authTag: string;
}

@Injectable()
export class KeyCryptoService {
  private readonly keyProvider: 'local' | 'aws_kms';
  private readonly keyVersion: number;
  private readonly currentKek: Buffer;
  private readonly legacyKeks: Map<number, Buffer>;
  private readonly kmsKeyId: string;
  private readonly kmsClient: KMSClient | null;

  constructor(private readonly config: ConfigService<AppEnv, true>) {
    this.keyProvider = this.config.get('KEY_ENCRYPTION_PROVIDER');
    this.keyVersion = this.config.get('KEY_ENCRYPTION_VERSION');
    this.currentKek = createHash('sha256')
      .update(this.config.get('KEY_ENCRYPTION_MASTER_KEY'))
      .digest();
    this.legacyKeks = this.parseLegacyLocalKeys(
      this.config.get('KEY_ENCRYPTION_MASTER_KEYS_JSON'),
    );
    this.kmsKeyId = this.config.get('AWS_KMS_KEY_ID');
    this.kmsClient =
      this.keyProvider === 'aws_kms'
        ? new KMSClient({ region: this.config.get('AWS_REGION') })
        : null;
  }

  getCurrentVersion(): number {
    return this.keyVersion;
  }

  async encryptSecret(secret: string): Promise<EncryptedProviderSecret> {
    const plaintext = Buffer.from(secret, 'utf8');
    const dekPayload = await this.generateDek();
    const dek = dekPayload.plaintextDek;
    const dataIv = randomBytes(12);
    const dataCipher = createCipheriv('aes-256-gcm', dek, dataIv);
    const ciphertext = Buffer.concat([dataCipher.update(plaintext), dataCipher.final()]);
    const dataAuthTag = dataCipher.getAuthTag();
    const tokenHint = `atk_${randomBytes(8).toString('hex')}`;
    return {
      tokenHint,
      keyVersion: this.keyVersion,
      keyProvider: this.keyProvider,
      kmsKeyId: dekPayload.kmsKeyId,
      encryptedDek: Buffer.from(JSON.stringify(dekPayload.wrappedDek), 'utf8').toString('base64url'),
      ciphertext: ciphertext.toString('base64'),
      iv: dataIv.toString('base64'),
      authTag: dataAuthTag.toString('base64'),
    };
  }

  async decryptSecret(payload: {
    keyProvider?: 'local' | 'aws_kms' | null;
    keyVersion?: number | null;
    kmsKeyId?: string | null;
    encryptedDek: string;
    ciphertext: string;
    iv: string;
    authTag: string;
  }): Promise<string> {
    const wrappedDekJson = Buffer.from(payload.encryptedDek, 'base64url').toString('utf8');
    const wrappedDek = JSON.parse(wrappedDekJson) as WrappedDekPayload | KmsWrappedDekPayload;
    const dek = await this.unwrapDek(wrappedDek, payload);

    const dataDecipher = createDecipheriv(
      'aes-256-gcm',
      dek,
      Buffer.from(payload.iv, 'base64'),
    );
    dataDecipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));
    const plaintext = Buffer.concat([
      dataDecipher.update(Buffer.from(payload.ciphertext, 'base64')),
      dataDecipher.final(),
    ]);
    return plaintext.toString('utf8');
  }

  private parseLegacyLocalKeys(raw: string): Map<number, Buffer> {
    if (!raw) {
      return new Map();
    }
    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      const map = new Map<number, Buffer>();
      Object.entries(parsed).forEach(([key, value]) => {
        const version = Number(key);
        if (!Number.isFinite(version) || typeof value !== 'string' || value.length < 32) {
          return;
        }
        map.set(version, createHash('sha256').update(value).digest());
      });
      return map;
    } catch {
      return new Map();
    }
  }

  private resolveLocalKek(version: number): Buffer {
    if (version === this.keyVersion) {
      return this.currentKek;
    }
    const fromMap = this.legacyKeks.get(version);
    if (fromMap) {
      return fromMap;
    }
    throw new Error(`Missing local key material for KEK version ${version}`);
  }

  private async generateDek(): Promise<{
    plaintextDek: Buffer;
    wrappedDek: WrappedDekPayload | KmsWrappedDekPayload;
    kmsKeyId: string | null;
  }> {
    if (this.keyProvider === 'aws_kms') {
      if (!this.kmsClient || !this.kmsKeyId) {
        throw new Error('AWS KMS key provider is configured but AWS_KMS_KEY_ID is missing');
      }
      const command = new GenerateDataKeyCommand({
        KeyId: this.kmsKeyId,
        KeySpec: 'AES_256',
      });
      const response = await this.kmsClient.send(command);
      if (!response.Plaintext || !response.CiphertextBlob) {
        throw new Error('KMS GenerateDataKey failed');
      }
      return {
        plaintextDek: Buffer.from(response.Plaintext),
        wrappedDek: {
          v: 1,
          kind: 'aws_kms',
          version: this.keyVersion,
          keyId: this.kmsKeyId,
          ciphertext: Buffer.from(response.CiphertextBlob).toString('base64'),
        },
        kmsKeyId: this.kmsKeyId,
      };
    }

    const dek = randomBytes(32);
    const dekIv = randomBytes(12);
    const dekCipher = createCipheriv('aes-256-gcm', this.currentKek, dekIv);
    const dekCiphertext = Buffer.concat([dekCipher.update(dek), dekCipher.final()]);
    const dekAuthTag = dekCipher.getAuthTag();
    return {
      plaintextDek: dek,
      wrappedDek: {
        v: 1,
        kind: 'local',
        version: this.keyVersion,
        iv: dekIv.toString('base64url'),
        ciphertext: dekCiphertext.toString('base64url'),
        authTag: dekAuthTag.toString('base64url'),
      },
      kmsKeyId: null,
    };
  }

  private async unwrapDek(
    wrappedDek: WrappedDekPayload | KmsWrappedDekPayload,
    persisted: {
      keyProvider?: 'local' | 'aws_kms' | null;
      keyVersion?: number | null;
      kmsKeyId?: string | null;
    },
  ): Promise<Buffer> {
    if (wrappedDek.v !== 1 || !('kind' in wrappedDek)) {
      throw new Error('Unsupported key wrapping format');
    }

    if (wrappedDek.kind === 'aws_kms') {
      if (!this.kmsClient) {
        throw new Error('KMS decrypt unavailable in local key mode');
      }
      const keyId = wrappedDek.keyId || persisted.kmsKeyId || this.kmsKeyId;
      const response = await this.kmsClient.send(
        new DecryptCommand({
          CiphertextBlob: Buffer.from(wrappedDek.ciphertext, 'base64'),
          KeyId: keyId || undefined,
        }),
      );
      if (!response.Plaintext) {
        throw new Error('KMS decrypt failed');
      }
      return Buffer.from(response.Plaintext);
    }

    const version = wrappedDek.version ?? persisted.keyVersion ?? this.keyVersion;
    const kek = this.resolveLocalKek(version);
    const dekDecipher = createDecipheriv(
      'aes-256-gcm',
      kek,
      Buffer.from(wrappedDek.iv, 'base64url'),
    );
    dekDecipher.setAuthTag(Buffer.from(wrappedDek.authTag, 'base64url'));
    return Buffer.concat([
      dekDecipher.update(Buffer.from(wrappedDek.ciphertext, 'base64url')),
      dekDecipher.final(),
    ]);
  }
}
