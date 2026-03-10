import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Preference } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { upsertUserFromAuth } from '../common/users/upsert-user-from-auth';
import type { AuthenticatedUser } from '../common/auth/types';
import { KeyCryptoService } from '../common/crypto/key-crypto.service';
import type { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { AuditService } from '../common/audit/audit.service';

@Injectable()
export class MeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly keyCrypto: KeyCryptoService,
    private readonly audit: AuditService,
  ) {}

  async getOrCreateCurrentUser(authUser: AuthenticatedUser) {
    const user = await upsertUserFromAuth(this.prisma, authUser);

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      createdAt: user.createdAt,
    };
  }

  async getPreferences(authUser: AuthenticatedUser) {
    const user = await upsertUserFromAuth(this.prisma, authUser);
    const preference = await this.prisma.preference.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });
    return this.toPreferenceResponse(preference);
  }

  async updatePreferences(authUser: AuthenticatedUser, input: UpdatePreferencesDto) {
    const user = await upsertUserFromAuth(this.prisma, authUser);
    const updateData: Prisma.PreferenceUpdateInput = {};

    if (input.aiModel !== undefined) {
      updateData.aiModel = input.aiModel;
    }
    if (input.defaultSeverityFilter !== undefined) {
      updateData.defaultSeverityFilter = [...new Set(input.defaultSeverityFilter)];
    }
    if (input.antiBiasMode !== undefined) {
      updateData.antiBiasMode = input.antiBiasMode;
    }
    if (input.fontSize !== undefined) {
      updateData.fontSize = input.fontSize;
    }
    if (input.codeBlockTheme !== undefined) {
      updateData.codeBlockTheme = input.codeBlockTheme;
    }
    if (input.autoExportPdf !== undefined) {
      updateData.autoExportPdf = input.autoExportPdf;
    }
    if (input.activeCommentStyleProfileId !== undefined) {
      updateData.activeCommentStyleProfileId = input.activeCommentStyleProfileId;
    }
    if (input.monthlyBudgetUsd !== undefined) {
      updateData.monthlyBudgetUsd = new Prisma.Decimal(input.monthlyBudgetUsd);
    }
    if (input.alertThresholds !== undefined) {
      updateData.alertThresholds = [...new Set(input.alertThresholds)].sort((a, b) => a - b);
    }
    if (input.hardStopAtBudget !== undefined) {
      updateData.hardStopAtBudget = input.hardStopAtBudget;
    }
    if (input.autoDowngradeNearBudget !== undefined) {
      updateData.autoDowngradeNearBudget = input.autoDowngradeNearBudget;
    }
    if (input.autoDowngradeThresholdPct !== undefined) {
      updateData.autoDowngradeThresholdPct = input.autoDowngradeThresholdPct;
    }
    if (input.cooldownSeconds !== undefined) {
      updateData.cooldownSeconds = input.cooldownSeconds;
    }
    if (input.bookmarks !== undefined) {
      updateData.bookmarks = input.bookmarks as Prisma.JsonArray;
    }
    if (input.templates !== undefined) {
      updateData.templates = input.templates as Prisma.JsonObject;
    }
    if (input.repoConfigs !== undefined) {
      updateData.repoConfigs = input.repoConfigs as Prisma.JsonObject;
    }

    const baseline = await this.prisma.preference.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
      },
      update: {},
    });
    if (Object.keys(updateData).length === 0) {
      return this.toPreferenceResponse(baseline);
    }

    const preference = await this.prisma.preference.update({
      where: { userId: user.id },
      data: updateData,
    });
    return this.toPreferenceResponse(preference);
  }

  async getAnthropicKeyStatus(authUser: AuthenticatedUser) {
    const user = await upsertUserFromAuth(this.prisma, authUser);
    const key = await this.prisma.providerKey.findUnique({
      where: {
        userId_provider: {
          userId: user.id,
          provider: 'anthropic',
        },
      },
      select: {
        tokenHint: true,
        updatedAt: true,
        keySource: true,
        kekVersion: true,
      },
    });

    return {
      configured: !!key,
      tokenHint: key?.tokenHint ?? null,
      updatedAt: key?.updatedAt ?? null,
      keySource: key?.keySource ?? null,
      keyVersion: key?.kekVersion ?? null,
    };
  }

  async upsertAnthropicKey(authUser: AuthenticatedUser, apiKey: string) {
    const user = await upsertUserFromAuth(this.prisma, authUser);
    const encrypted = await this.keyCrypto.encryptSecret(apiKey.trim());

    await this.prisma.providerKey.upsert({
      where: {
        userId_provider: {
          userId: user.id,
          provider: 'anthropic',
        },
      },
      create: {
        userId: user.id,
        provider: 'anthropic',
        keySource: 'byok',
        kekVersion: encrypted.keyVersion,
        kmsKeyId: encrypted.kmsKeyId,
        tokenHint: encrypted.tokenHint,
        encryptedDek: encrypted.encryptedDek,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        lastRotatedAt: new Date(),
      },
      update: {
        keySource: 'byok',
        kekVersion: encrypted.keyVersion,
        kmsKeyId: encrypted.kmsKeyId,
        tokenHint: encrypted.tokenHint,
        encryptedDek: encrypted.encryptedDek,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        lastRotatedAt: new Date(),
      },
    });
    await this.audit.write({
      userId: user.id,
      eventType: 'provider_key_upserted',
      eventScope: 'security.keys',
      details: {
        provider: 'anthropic',
        keySource: 'byok',
        kekVersion: encrypted.keyVersion,
      },
    });
  }

  async deleteAnthropicKey(authUser: AuthenticatedUser) {
    const user = await upsertUserFromAuth(this.prisma, authUser);
    await this.prisma.providerKey.deleteMany({
      where: {
        userId: user.id,
        provider: 'anthropic',
      },
    });
    await this.audit.write({
      userId: user.id,
      eventType: 'provider_key_deleted',
      eventScope: 'security.keys',
      severity: 'warn',
      details: {
        provider: 'anthropic',
      },
    });
  }

  private toPreferenceResponse(preference: Preference) {
    return {
      aiModel: preference.aiModel,
      defaultSeverityFilter: preference.defaultSeverityFilter,
      antiBiasMode: preference.antiBiasMode,
      fontSize: preference.fontSize,
      codeBlockTheme: preference.codeBlockTheme,
      autoExportPdf: preference.autoExportPdf,
      activeCommentStyleProfileId: preference.activeCommentStyleProfileId,
      monthlyBudgetUsd: Number(preference.monthlyBudgetUsd),
      alertThresholds: preference.alertThresholds,
      hardStopAtBudget: preference.hardStopAtBudget,
      autoDowngradeNearBudget: preference.autoDowngradeNearBudget,
      autoDowngradeThresholdPct: preference.autoDowngradeThresholdPct,
      cooldownSeconds: preference.cooldownSeconds,
      lastAlertThreshold: preference.lastAlertThreshold,
      bookmarks: preference.bookmarks,
      templates: preference.templates,
      repoConfigs: preference.repoConfigs,
    };
  }
}
