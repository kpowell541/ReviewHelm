import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Preference } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { upsertUserFromAuth } from '../common/users/upsert-user-from-auth';
import type { AuthenticatedUser } from '../common/auth/types';
import type { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Injectable()
export class MeService {
  private readonly maxPreferencePayloadBytes = 32_768;

  constructor(
    private readonly prisma: PrismaService,
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
      this.assertPreferencePayloadSize('bookmarks', input.bookmarks);
      updateData.bookmarks = input.bookmarks as Prisma.JsonArray;
    }
    if (input.templates !== undefined) {
      this.assertPreferencePayloadSize('templates', input.templates);
      updateData.templates = input.templates as Prisma.JsonObject;
    }
    if (input.repoConfigs !== undefined) {
      this.assertPreferencePayloadSize('repoConfigs', input.repoConfigs);
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

  private assertPreferencePayloadSize(field: string, value: unknown): void {
    const sizeBytes = Buffer.byteLength(JSON.stringify(value), 'utf8');
    if (sizeBytes > this.maxPreferencePayloadBytes) {
      throw new BadRequestException(
        `Preference field "${field}" exceeds ${this.maxPreferencePayloadBytes} bytes`,
      );
    }
  }
}
