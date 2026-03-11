import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { KeyCryptoService } from '../../common/crypto/key-crypto.service';
import { AuditService } from '../../common/audit/audit.service';

@Injectable()
export class AdminSecurityService {
  private static readonly KEY_ROTATION_POLICY_DAYS = 90;

  constructor(
    private readonly prisma: PrismaService,
    private readonly keyCrypto: KeyCryptoService,
    private readonly audit: AuditService,
  ) {}

  async getKeyRotationStatus() {
    const currentVersion = this.keyCrypto.getCurrentVersion();
    const policyDays = AdminSecurityService.KEY_ROTATION_POLICY_DAYS;
    const cutoff = new Date(Date.now() - policyDays * 24 * 60 * 60 * 1000);

    const keys = await this.prisma.providerKey.findMany({
      select: {
        id: true,
        userId: true,
        provider: true,
        kekVersion: true,
        lastRotatedAt: true,
        updatedAt: true,
      },
    });

    const staleVersionKeys = keys.filter((k) => k.kekVersion !== currentVersion);
    const overdueKeys = keys.filter((k) => {
      const rotatedAt = k.lastRotatedAt ?? k.updatedAt;
      return rotatedAt < cutoff;
    });

    const status = {
      currentKekVersion: currentVersion,
      rotationPolicyDays: policyDays,
      totalKeys: keys.length,
      staleVersionCount: staleVersionKeys.length,
      overdueRotationCount: overdueKeys.length,
      healthy: staleVersionKeys.length === 0 && overdueKeys.length === 0,
      overdueKeyIds: overdueKeys.map((k) => k.id),
    };

    if (!status.healthy) {
      await this.audit.write({
        eventType: 'key_rotation_overdue',
        eventScope: 'security.keys',
        severity: 'warn',
        details: {
          staleVersionCount: status.staleVersionCount,
          overdueRotationCount: status.overdueRotationCount,
          policyDays,
          currentKekVersion: currentVersion,
        },
      });
    }

    return status;
  }

  async rotateProviderKeys(params: {
    actorSupabaseUserId: string;
    provider?: string;
    dryRun?: boolean;
  }) {
    const currentVersion = this.keyCrypto.getCurrentVersion();
    const providerFilter = params.provider?.trim();

    const keys = await this.prisma.providerKey.findMany({
      where: providerFilter ? { provider: providerFilter } : undefined,
      select: {
        id: true,
        userId: true,
        provider: true,
        keySource: true,
        kekVersion: true,
        kmsKeyId: true,
        encryptedDek: true,
        ciphertext: true,
        iv: true,
        authTag: true,
      },
    });

    const stale = keys.filter((key) => key.kekVersion !== currentVersion);
    if (params.dryRun) {
      return {
        currentVersion,
        scanned: keys.length,
        willRotate: stale.length,
      };
    }

    let rotated = 0;
    let failed = 0;

    for (const key of stale) {
      try {
        const plaintext = await this.keyCrypto.decryptSecret({
          keyProvider: key.kmsKeyId ? 'aws_kms' : 'local',
          keyVersion: key.kekVersion,
          kmsKeyId: key.kmsKeyId,
          encryptedDek: key.encryptedDek,
          ciphertext: key.ciphertext,
          iv: key.iv,
          authTag: key.authTag,
        });
        const rewrapped = await this.keyCrypto.encryptSecret(plaintext);

        await this.prisma.providerKey.update({
          where: { id: key.id },
          data: {
            keySource: key.keySource,
            kekVersion: rewrapped.keyVersion,
            kmsKeyId: rewrapped.kmsKeyId,
            tokenHint: rewrapped.tokenHint,
            encryptedDek: rewrapped.encryptedDek,
            ciphertext: rewrapped.ciphertext,
            iv: rewrapped.iv,
            authTag: rewrapped.authTag,
            lastRotatedAt: new Date(),
          },
        });
        rotated += 1;
      } catch {
        failed += 1;
      }
    }

    await this.audit.write({
      eventType: 'provider_key_rotation_run',
      eventScope: 'security.keys',
      severity: failed > 0 ? 'warn' : 'info',
      details: {
        actorSupabaseUserId: params.actorSupabaseUserId,
        provider: providerFilter ?? 'all',
        scanned: keys.length,
        rotated,
        failed,
        targetVersion: currentVersion,
      },
    });

    return {
      currentVersion,
      scanned: keys.length,
      rotated,
      failed,
    };
  }
}
