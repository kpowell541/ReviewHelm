import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

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
      // Best effort only; audit persistence should not break request flow.
    }
  }
}
