import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import net from 'node:net';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, type Preference } from '@prisma/client';
import type { AppEnv } from '../config/env.schema';
import { upsertUserFromAuth } from '../common/users/upsert-user-from-auth';
import type { AuthenticatedUser } from '../common/auth/types';
import { PrismaService } from '../prisma/prisma.service';
import { reliableFetch } from '../common/http/reliable-fetch';

@Injectable()
export class BackupsService {
  private readonly allowlistHosts: string[];
  private readonly backupSigningSecret: string;
  private readonly maxPayloadBytes: number;
  private readonly maxSessions: number;
  private readonly maxUsageRows: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppEnv, true>,
  ) {
    this.allowlistHosts = this.parseAllowlist(
      config.get('BACKUP_IMPORT_ALLOWLIST_HOSTS'),
    );
    this.backupSigningSecret = config.get('BACKUP_IMPORT_SIGNING_SECRET');
    this.maxPayloadBytes = config.get('BACKUP_IMPORT_MAX_PAYLOAD_BYTES');
    this.maxSessions = config.get('BACKUP_IMPORT_MAX_SESSIONS');
    this.maxUsageRows = config.get('BACKUP_IMPORT_MAX_USAGE_ROWS');
  }

  async exportBackup(authUser: AuthenticatedUser) {
    const user = await upsertUserFromAuth(this.prisma, authUser);
    const [preference, sessions, usageDays, usageSessions] = await Promise.all([
      this.prisma.preference.findUnique({ where: { userId: user.id } }),
      this.prisma.session.findMany({
        where: { userId: user.id },
        orderBy: [{ createdAt: 'asc' }],
      }),
      this.prisma.usageDay.findMany({
        where: { userId: user.id },
      }),
      this.prisma.usageSession.findMany({
        where: { userId: user.id },
      }),
    ]);

    const payload = {
      version: 1,
      generatedAt: new Date().toISOString(),
      user: {
        supabaseUserId: user.supabaseUserId,
        email: user.email,
      },
      preference: preference
        ? {
            ...this.serializePreference(preference),
          }
        : null,
      sessions: sessions.map((session) => ({
        ...session,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        completedAt: session.completedAt?.toISOString() ?? null,
      })),
      usage: {
        byDay: usageDays.map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        })),
        bySession: usageSessions.map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
          lastUpdatedAt: row.lastUpdatedAt.toISOString(),
        })),
      },
    };

    const json = JSON.stringify(payload);
    return {
      url: this.toDataUrl('application/json', json),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
      version: 1,
    };
  }

  async importBackup(
    authUser: AuthenticatedUser,
    sourceUrl: string,
    signature?: string,
    signatureTimestamp?: number,
  ) {
    const user = await upsertUserFromAuth(this.prisma, authUser);
    const raw = await this.fetchSourcePayload(sourceUrl, signature, signatureTimestamp);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new BadRequestException('Backup source is not valid JSON');
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new BadRequestException('Backup payload must be an object');
    }
    const backup = parsed as Record<string, unknown>;
    if (typeof backup.version !== 'number' || backup.version < 1 || !('generatedAt' in backup)) {
      throw new BadRequestException('Backup payload is missing required metadata');
    }
    if (typeof (backup.generatedAt as unknown) !== 'string') {
      throw new BadRequestException('Backup payload has invalid generatedAt');
    }
    if (Number.isNaN(Date.parse(backup.generatedAt as string))) {
      throw new BadRequestException('Backup payload has invalid generatedAt');
    }
    const sessions = this.toArray(backup.sessions, 'sessions', this.maxSessions);
    const usage = this.validateUsageBlock(backup.usage, this.maxUsageRows);
    const usageByDay = this.toArray(usage.byDay, 'usage.byDay', this.maxUsageRows);
    const usageBySession = this.toArray(
      usage.bySession,
      'usage.bySession',
      this.maxUsageRows,
    );

    const preference = backup.preference;

    await this.prisma.$transaction(async (tx) => {
      if (preference && typeof preference === 'object' && !Array.isArray(preference)) {
        const pref = preference as Record<string, unknown>;
        await tx.preference.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            aiModel: this.asModel(pref.aiModel),
            defaultSeverityFilter: this.asStringArray(pref.defaultSeverityFilter, ['blocker', 'major', 'minor', 'nit']),
            antiBiasMode: this.asBoolean(pref.antiBiasMode, true),
            fontSize: this.asString(pref.fontSize, 'medium'),
            codeBlockTheme: this.asString(pref.codeBlockTheme, 'dark'),
            autoExportPdf: this.asBoolean(pref.autoExportPdf, false),
            activeCommentStyleProfileId: this.asOptionalString(pref.activeCommentStyleProfileId),
            monthlyBudgetUsd: this.asDecimal(pref.monthlyBudgetUsd, '40'),
            alertThresholds: this.asNumberArray(pref.alertThresholds, [70, 85, 95]),
            hardStopAtBudget: this.asBoolean(pref.hardStopAtBudget, false),
            autoDowngradeNearBudget: this.asBoolean(pref.autoDowngradeNearBudget, true),
            autoDowngradeThresholdPct: this.asNumber(pref.autoDowngradeThresholdPct, 85),
            cooldownSeconds: this.asNumber(pref.cooldownSeconds, 6),
          },
          update: {
            aiModel: this.asModel(pref.aiModel),
            defaultSeverityFilter: this.asStringArray(pref.defaultSeverityFilter, ['blocker', 'major', 'minor', 'nit']),
            antiBiasMode: this.asBoolean(pref.antiBiasMode, true),
            fontSize: this.asString(pref.fontSize, 'medium'),
            codeBlockTheme: this.asString(pref.codeBlockTheme, 'dark'),
            autoExportPdf: this.asBoolean(pref.autoExportPdf, false),
            activeCommentStyleProfileId: this.asOptionalString(pref.activeCommentStyleProfileId),
            monthlyBudgetUsd: this.asDecimal(pref.monthlyBudgetUsd, '40'),
            alertThresholds: this.asNumberArray(pref.alertThresholds, [70, 85, 95]),
            hardStopAtBudget: this.asBoolean(pref.hardStopAtBudget, false),
            autoDowngradeNearBudget: this.asBoolean(pref.autoDowngradeNearBudget, true),
            autoDowngradeThresholdPct: this.asNumber(pref.autoDowngradeThresholdPct, 85),
            cooldownSeconds: this.asNumber(pref.cooldownSeconds, 6),
          },
        });
      }

      await tx.session.deleteMany({ where: { userId: user.id } });
      for (const row of sessions) {
        if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
        const session = row as Record<string, unknown>;
        await tx.session.create({
          data: {
            id: this.asString(session.id, randomUUID()),
            userId: user.id,
            mode: this.asMode(session.mode),
            stackId: this.asOptionalString(session.stackId),
            stackIds: this.asStringArray(session.stackIds, []),
            selectedSections: this.asStringArray(session.selectedSections, []),
            title: this.asString(session.title, 'Imported session'),
            itemResponses: (session.itemResponses ?? {}) as Prisma.JsonObject,
            sessionNotes: this.asString(session.sessionNotes, ''),
            isComplete: this.asBoolean(session.isComplete, false),
            completedAt: this.asOptionalDate(session.completedAt),
            createdAt: this.asDate(session.createdAt, new Date()),
            updatedAt: this.asDate(session.updatedAt, new Date()),
          },
        });
      }

      await tx.usageDay.deleteMany({ where: { userId: user.id } });
      for (const row of usageByDay) {
        if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
        const usageDay = row as Record<string, unknown>;
        await tx.usageDay.create({
          data: {
            id: this.asString(usageDay.id, randomUUID()),
            userId: user.id,
            dateKey: this.asString(usageDay.dateKey, this.getCurrentDateKey()),
            calls: this.asNumber(usageDay.calls, 0),
            inputTokens: this.asNumber(usageDay.inputTokens, 0),
            outputTokens: this.asNumber(usageDay.outputTokens, 0),
            byModel: (usageDay.byModel ?? {}) as Prisma.JsonObject,
            byFeature: (usageDay.byFeature ?? {}) as Prisma.JsonObject,
            createdAt: this.asDate(usageDay.createdAt, new Date()),
            updatedAt: this.asDate(usageDay.updatedAt, new Date()),
          },
        });
      }

      await tx.usageSession.deleteMany({ where: { userId: user.id } });
      for (const row of usageBySession) {
        if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
        const usageSession = row as Record<string, unknown>;
        const sessionId = this.asString(usageSession.sessionId, '');
        const sessionExists = await tx.session.findFirst({
          where: { id: sessionId, userId: user.id },
          select: { id: true },
        });
        if (!sessionExists) continue;
        await tx.usageSession.create({
          data: {
            id: this.asString(usageSession.id, randomUUID()),
            userId: user.id,
            sessionId,
            calls: this.asNumber(usageSession.calls, 0),
            inputTokens: this.asNumber(usageSession.inputTokens, 0),
            outputTokens: this.asNumber(usageSession.outputTokens, 0),
            byModel: (usageSession.byModel ?? {}) as Prisma.JsonObject,
            byFeature: (usageSession.byFeature ?? {}) as Prisma.JsonObject,
            createdAt: this.asDate(usageSession.createdAt, new Date()),
            lastUpdatedAt: this.asDate(usageSession.lastUpdatedAt, new Date()),
          },
        });
      }
    });

    return {
      jobId: randomUUID(),
      status: 'queued',
    };
  }

  async exportSessionPdf(authUser: AuthenticatedUser, sessionId: string) {
    const user = await upsertUserFromAuth(this.prisma, authUser);
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId: user.id },
      select: {
        id: true,
        title: true,
        mode: true,
        stackId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const text = [
      `ReviewHelm Session Report`,
      `Session ID: ${session.id}`,
      `Title: ${session.title}`,
      `Mode: ${session.mode}`,
      `Stack: ${session.stackId ?? 'n/a'}`,
      `Created: ${session.createdAt.toISOString()}`,
      `Updated: ${session.updatedAt.toISOString()}`,
    ].join('\n');
    const pdf = this.toSimplePdfBuffer(text);
    return {
      url: this.toDataUrl('application/pdf', pdf.toString('base64')),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    };
  }

  private toSimplePdfBuffer(text: string): Buffer {
    const escaped = text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    const stream = `BT /F1 12 Tf 50 750 Td (${escaped}) Tj ET`;
    const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length ${stream.length} >>
stream
${stream}
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000246 00000 n 
0000000316 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${380 + stream.length}
%%EOF`;
    return Buffer.from(pdf, 'utf8');
  }

  private toDataUrl(mimeType: string, payload: string) {
    if (payload.startsWith('data:')) {
      return payload;
    }
    const base64 =
      mimeType === 'application/json'
        ? Buffer.from(payload, 'utf8').toString('base64')
        : payload;
    return `data:${mimeType};base64,${base64}`;
  }

  private async fetchSourcePayload(
    sourceUrl: string,
    signature?: string,
    signatureTimestamp?: number,
  ) {
    if (sourceUrl.startsWith('data:')) {
      const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(sourceUrl);
      if (!match) throw new BadRequestException('Invalid data URL');
      const isBase64 = !!match[2];
      const data = match[3] || '';
      let decoded: string;
      try {
        decoded = isBase64 ? this.decodeBase64Data(data) : decodeURIComponent(data);
      } catch {
        throw new BadRequestException('Invalid data URL encoding');
      }
      if (Buffer.byteLength(decoded, 'utf8') > this.maxPayloadBytes) {
        throw new BadRequestException('Backup payload exceeds size limit');
      }
      return decoded;
    }

    if (!sourceUrl.startsWith('https://')) {
      throw new BadRequestException('Only https:// or data: backup URLs are allowed');
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(sourceUrl);
    } catch {
      throw new BadRequestException('Backup source URL is malformed');
    }

    const host = parsedUrl.hostname.toLowerCase();
    if (!host) {
      throw new BadRequestException('Backup source URL is missing a hostname');
    }
    if (parsedUrl.protocol !== 'https:') {
      throw new BadRequestException('Backup source URL must use HTTPS');
    }
    const isAllowedHost = this.allowlistHosts.includes(host);
    if (!isAllowedHost) {
      throw new BadRequestException('Backup source host is not allowed');
    }
    if (parsedUrl.username || parsedUrl.password) {
      throw new BadRequestException('Backup source URL must not contain credentials');
    }
    await this.assertPublicAddress(parsedUrl.hostname);

    const response = await reliableFetch(parsedUrl, {
      method: 'GET',
      redirect: 'error',
      headers: {
        accept: 'application/json, text/plain;q=0.9',
      },
    }, {
      timeoutMs: 15_000,
      maxAttempts: 3,
      baseRetryDelayMs: 250,
      retryableStatuses: [408, 429, 500, 502, 503, 504],
    });
    if (!response.ok) {
      throw new BadRequestException(`Failed to download backup (${response.status})`);
    }
    const lengthHeader = response.headers.get('content-length');
    const declaredLength = lengthHeader ? Number(lengthHeader) : NaN;
    if (Number.isFinite(declaredLength) && declaredLength > this.maxPayloadBytes) {
      throw new BadRequestException('Backup payload exceeds size limit');
    }

    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > this.maxPayloadBytes) {
      throw new BadRequestException('Backup payload exceeds size limit');
    }

    if (this.backupSigningSecret) {
      if (!signature || !signatureTimestamp) {
        throw new BadRequestException(
          'Missing signature or signatureTimestamp for backup import',
        );
      }

      if (!this.verifyPayloadSignature({ sourceUrl, signatureTimestamp, signature, payload: text })) {
        throw new BadRequestException('Backup source URL signature is invalid or expired');
      }
    }

    return text;
  }

  private toArray(value: unknown, field: string, max: number): unknown[] {
    if (Array.isArray(value)) {
      if (value.length > max) {
        throw new BadRequestException(`Backup field "${field}" exceeds max size ${max}`);
      }
      return value;
    }
    if (value === undefined) {
      return [];
    }
    throw new BadRequestException(`Backup field "${field}" must be an array`);
  }

  private validateUsageBlock(usage: unknown, maxRows: number): { byDay: unknown[]; bySession: unknown[] } {
    if (usage === undefined) {
      return { byDay: [], bySession: [] };
    }
    if (!usage || typeof usage !== 'object' || Array.isArray(usage)) {
      throw new BadRequestException('Backup usage section must be an object');
    }

    const usageObj = usage as Record<string, unknown>;
    const byDay = this.toArray(usageObj.byDay, 'usage.byDay', maxRows);
    const bySession = this.toArray(usageObj.bySession, 'usage.bySession', maxRows);
    return { byDay, bySession };
  }

  private parseAllowlist(raw: string): string[] {
    const hosts = raw
      .split(',')
      .map((host) => this.stripTrailingDot(host.trim().toLowerCase()))
      .filter(Boolean);
    return hosts.length > 0 ? hosts : ['raw.githubusercontent.com'];
  }

  private decodeBase64Data(raw: string): string {
    const base64 = raw.replace(/\s+/g, '');
    if (base64.length === 0) {
      throw new BadRequestException('Invalid data URL encoding');
    }
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length % 4 !== 0) {
      throw new BadRequestException('Invalid data URL encoding');
    }
    return Buffer.from(base64, 'base64').toString('utf8');
  }

  private async assertPublicAddress(hostname: string): Promise<void> {
    const normalizedHost = this.stripTrailingDot(hostname.trim().toLowerCase());
    if (this.isPrivateHostname(normalizedHost)) {
      throw new BadRequestException('Backup source host is restricted');
    }

    const ipVersion = net.isIP(normalizedHost);
    if (ipVersion === 4 || ipVersion === 6) {
      if (this.isPrivateIpAddress(normalizedHost)) {
        throw new BadRequestException('Backup source resolves to a private network address');
      }
      return;
    }

    let addresses: Array<{ address: string; family: 4 | 6 }>;
    try {
      addresses = (await lookup(normalizedHost, { all: true })) as Array<{
        address: string;
        family: 4 | 6;
      }>;
    } catch {
      throw new BadRequestException('Unable to resolve backup source host');
    }

    if (addresses.length === 0) {
      throw new BadRequestException('Backup source host does not resolve');
    }

    const hasPublicAddress = addresses.some((entry) => this.isPublicIpAddress(entry.address));
    if (!hasPublicAddress) {
      throw new BadRequestException('Backup source host does not resolve to a public address');
    }

    if (addresses.some((entry) => this.isPrivateIpAddress(entry.address))) {
      throw new BadRequestException('Backup source host resolves to a private network address');
    }
  }

  private isPrivateIpAddress(rawIp: string): boolean {
    const ip = rawIp.toLowerCase();
    const ipType = net.isIP(ip);
    if (ipType === 4) {
      const [a, b, c] = ip.split('.').map((part) => Number(part));
      if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) return false;
      if (a === 10) return true;
      if (a === 127) return true;
      if (a === 0) return true;
      if (a === 169 && b === 254) return true;
      if (a === 172 && b >= 16 && b <= 31) return true;
      if (a === 192 && b === 168) return true;
      if (a === 100 && b >= 64 && b <= 127) return true;
      if (a === 198 && (b === 18 || b === 19)) return true;
      if (a === 203 && b === 0 && c === 113) return true;
      if (a >= 224) return true;
      return false;
    }

    if (ipType === 6) {
      if (ip === '::1' || ip === '::' || ip.startsWith('fe8') || ip.startsWith('fe9') || ip.startsWith('fea') || ip.startsWith('feb')) {
        return true;
      }
      if (ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('2001:db8')) {
        return true;
      }
      if (ip.startsWith('::ffff:')) {
        return this.isPrivateIpAddress(ip.substring(7));
      }
    }

    return false;
  }

  private isPublicIpAddress(rawIp: string): boolean {
    return net.isIP(rawIp) > 0 && !this.isPrivateIpAddress(rawIp);
  }

  private isPrivateHostname(hostname: string): boolean {
    return (
      hostname === 'localhost' ||
      hostname === '::1' ||
      hostname === '127.0.0.1' ||
      hostname.endsWith('.localhost') ||
      hostname.startsWith('localhost.')
    );
  }

  private stripTrailingDot(value: string): string {
    return value.endsWith('.') ? value.slice(0, -1) : value;
  }

  private verifyPayloadSignature(args: {
    sourceUrl: string;
    signatureTimestamp: number;
    signature: string;
    payload: string;
  }): boolean {
    const ageMs = Date.now() - args.signatureTimestamp * 1000;
    if (!Number.isFinite(args.signatureTimestamp) || ageMs < 0 || ageMs > 10 * 60 * 1000) {
      return false;
    }
    const data = `${args.sourceUrl}\n${args.signatureTimestamp}\n${args.payload}`;
    const expected = createHmac('sha256', this.backupSigningSecret).update(data).digest();
    const provided = this.decodeHexOrNull(args.signature);
    if (!provided) {
      return false;
    }
    if (provided.length !== expected.length) {
      return false;
    }
    return timingSafeEqual(provided, expected);
  }

  private decodeHexOrNull(value: string): Buffer | null {
    if (!/^[0-9a-fA-F]+$/.test(value) || value.length % 2 !== 0) {
      return null;
    }
    try {
      return Buffer.from(value, 'hex');
    } catch {
      return null;
    }
  }

  private serializePreference(preference: Preference) {
    return {
      ...preference,
      monthlyBudgetUsd: Number(preference.monthlyBudgetUsd),
      createdAt: preference.createdAt.toISOString(),
      updatedAt: preference.updatedAt.toISOString(),
    };
  }

  private asString(value: unknown, fallback: string) {
    return typeof value === 'string' ? value : fallback;
  }

  private asOptionalString(value: unknown) {
    return typeof value === 'string' && value.length > 0 ? value : null;
  }

  private asNumber(value: unknown, fallback: number) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private asBoolean(value: unknown, fallback: boolean) {
    return typeof value === 'boolean' ? value : fallback;
  }

  private asDate(value: unknown, fallback: Date) {
    if (typeof value !== 'string') return fallback;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? fallback : parsed;
  }

  private asOptionalDate(value: unknown) {
    if (typeof value !== 'string') return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private asNumberArray(value: unknown, fallback: number[]) {
    if (!Array.isArray(value)) return fallback;
    return value
      .map((entry) => Number(entry))
      .filter((entry) => Number.isFinite(entry));
  }

  private asStringArray(value: unknown, fallback: string[]) {
    if (!Array.isArray(value)) return fallback;
    return value.filter((entry): entry is string => typeof entry === 'string');
  }

  private asModel(value: unknown) {
    if (value === 'opus') return 'opus';
    if (value === 'haiku') return 'haiku';
    return 'sonnet';
  }

  private asMode(value: unknown) {
    return value === 'polish' ? 'polish' : 'review';
  }

  private asDecimal(value: unknown, fallback: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return new Prisma.Decimal(fallback);
    }
    return new Prisma.Decimal(parsed);
  }

  private getCurrentDateKey(date: Date = new Date()): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
      2,
      '0',
    )}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }
}
