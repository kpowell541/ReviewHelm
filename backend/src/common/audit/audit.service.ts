import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { slog } from '../logging';

interface AuditInput {
  userId?: string;
  eventType: string;
  eventScope: string;
  severity?: 'info' | 'warn' | 'error';
  details?: Record<string, unknown>;
  requestId?: string;
}

@Injectable()
export class AuditService {
  private failureCount = 0;
  private failureWindowStart = Date.now();
  private readonly failureWindowMs = 5 * 60 * 1000;
  private readonly failureAlertThreshold = 5;

  constructor(private readonly prisma: PrismaService) {}

  async write(input: AuditInput): Promise<void> {
    try {
      await this.prisma.auditEvent.create({
        data: {
          userId: input.userId,
          eventType: input.eventType,
          eventScope: input.eventScope,
          severity: input.severity ?? 'info',
          details: (input.details ?? {}) as Prisma.JsonObject,
          requestId: input.requestId,
        },
      });
    } catch {
      this.recordFailure('Unknown audit persistence failure');
    }
  }

  private recordFailure(message: string): void {
    const now = Date.now();
    if (now - this.failureWindowStart > this.failureWindowMs) {
      this.failureCount = 0;
      this.failureWindowStart = now;
    }

    this.failureCount += 1;
    if (
      this.failureCount === 1 ||
      this.failureCount % this.failureAlertThreshold === 0
    ) {
      slog.error('audit_write_failure', {
        message,
        failureCount: this.failureCount,
        windowMinutes: this.failureWindowMs / 60000,
      });
    }
  }
}
