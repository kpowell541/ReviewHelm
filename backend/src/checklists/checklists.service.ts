import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  getBundledChecklistById,
  getBundledChecklistIds,
  getBundledChecklists,
  type ChecklistShape,
} from './bundled-checklists';

@Injectable()
export class ChecklistsService {
  constructor(private readonly prisma: PrismaService) {}

  async listChecklists() {
    const latest = await this.getLatestPublishedVersionByChecklistId();
    return getBundledChecklists().map((checklist) => {
      const version = latest[checklist.meta.id]?.version ?? checklist.meta.version;
      return {
        id: checklist.meta.id,
        mode: checklist.meta.mode,
        title: checklist.meta.title,
        shortTitle: checklist.meta.shortTitle,
        version,
        totalItems: checklist.meta.totalItems,
      };
    });
  }

  async getChecklistVersionSnapshot() {
    const latest = await this.getLatestPublishedVersionByChecklistId();
    const byId: Record<string, string> = {};
    for (const checklist of getBundledChecklists()) {
      byId[checklist.meta.id] = latest[checklist.meta.id]?.version ?? checklist.meta.version;
    }
    const latestVersion = Object.values(byId).sort().slice(-1)[0] ?? '1.0.0';
    return { latestVersion, byId };
  }

  async getChecklistByIdOrThrow(id: string): Promise<ChecklistShape> {
    const bundled = getBundledChecklistById(id);
    if (!bundled) {
      throw new NotFoundException(`Checklist not found: ${id}`);
    }

    const latest = await this.prisma.checklistVersion.findFirst({
      where: { checklistId: id },
      orderBy: [{ createdAt: 'desc' }],
      select: { payload: true },
    });

    if (!latest?.payload || typeof latest.payload !== 'object' || Array.isArray(latest.payload)) {
      return bundled;
    }
    return latest.payload as unknown as ChecklistShape;
  }

  async publishChecklistVersions(input: { version: string; byId: Record<string, string> }) {
    const ids = Object.keys(input.byId);
    const validIds = new Set<string>(getBundledChecklistIds());
    for (const id of ids) {
      if (!validIds.has(id)) {
        throw new NotFoundException(`Unknown checklist id: ${id}`);
      }
    }

    const now = new Date().toISOString();
    await this.prisma.$transaction(
      ids.map((id) =>
        this.prisma.checklistVersion.upsert({
          where: {
            checklistId_version: {
              checklistId: id,
              version: input.byId[id] || input.version,
            },
          },
          create: {
            checklistId: id,
            version: input.byId[id] || input.version,
            payload: getBundledChecklistById(id) as unknown as Prisma.JsonObject,
          },
          update: {
            payload: getBundledChecklistById(id) as unknown as Prisma.JsonObject,
          },
        }),
      ),
    );

    return {
      ok: true,
      publishedAt: now,
    };
  }

  private async getLatestPublishedVersionByChecklistId() {
    const rows = await this.prisma.checklistVersion.findMany({
      orderBy: [{ checklistId: 'asc' }, { createdAt: 'desc' }],
      select: {
        checklistId: true,
        version: true,
        createdAt: true,
      },
    });

    const map: Record<string, { version: string; createdAt: Date }> = {};
    for (const row of rows) {
      if (!map[row.checklistId]) {
        map[row.checklistId] = { version: row.version, createdAt: row.createdAt };
      }
    }
    return map;
  }
}
