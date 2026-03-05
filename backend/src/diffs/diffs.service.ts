import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DiffSource } from '@prisma/client';
import type { AuthenticatedUser } from '../common/auth/types';
import { PrismaService } from '../prisma/prisma.service';

export interface DiffGroundingContext {
  diffId: string | null;
  lineCount: number;
  fileCount: number;
  summary: string;
  excerpt: string;
}

export interface DiffFileChurn {
  path: string;
  added: number;
  removed: number;
  churn: number;
}

@Injectable()
export class DiffsService {
  constructor(private readonly prisma: PrismaService) {}

  async createFromText(
    authUser: AuthenticatedUser,
    input: { content: string; label?: string },
  ) {
    const user = await this.ensureUser(authUser);
    const content = this.normalizeContent(input.content);
    this.validateDiffLike(content);
    const lineCount = this.countLines(content);
    const created = await this.prisma.diffArtifact.create({
      data: {
        userId: user.id,
        source: DiffSource.pasted,
        label: input.label?.trim() || null,
        content,
        lineCount,
      },
    });
    return this.toDiffResponse(created);
  }

  async createFromUpload(
    authUser: AuthenticatedUser,
    input: { filename: string; content: string; label?: string },
  ) {
    const user = await this.ensureUser(authUser);
    const content = this.normalizeContent(input.content);
    this.validateDiffLike(content);
    const lineCount = this.countLines(content);
    const created = await this.prisma.diffArtifact.create({
      data: {
        userId: user.id,
        source: DiffSource.uploaded,
        label: input.label?.trim() || null,
        filename: input.filename,
        content,
        lineCount,
      },
    });
    return this.toDiffResponse(created);
  }

  async getDiffById(authUser: AuthenticatedUser, diffId: string) {
    const user = await this.ensureUser(authUser);
    const diff = await this.prisma.diffArtifact.findFirst({
      where: {
        id: diffId,
        userId: user.id,
      },
    });
    if (!diff) {
      throw new NotFoundException('Diff not found');
    }
    return this.toDiffResponse(diff, true);
  }

  async buildGroundingContext(
    authUser: AuthenticatedUser,
    input: { diffId?: string | null; diffText?: string | null },
  ): Promise<DiffGroundingContext | null> {
    if (!input.diffId && !input.diffText) {
      return null;
    }
    const content = input.diffText
      ? this.normalizeContent(input.diffText)
      : await this.getStoredDiffContent(authUser, input.diffId ?? '');
    if (!content) {
      return null;
    }

    const parsed = this.parseDiffMetadata(content);
    const excerpt = content.split('\n').slice(0, 320).join('\n');
    const summaryLines: string[] = [];
    summaryLines.push(`Files changed: ${parsed.files.length}`);
    summaryLines.push(`Approx line changes: +${parsed.added} / -${parsed.removed}`);
    if (parsed.files.length > 0) {
      summaryLines.push(`Top files: ${parsed.files.slice(0, 8).join(', ')}`);
    }
    if (parsed.hunks.length > 0) {
      summaryLines.push('Hunks:');
      for (const hunk of parsed.hunks.slice(0, 10)) {
        summaryLines.push(`- ${hunk.file}: ${hunk.header}`);
      }
    }

    return {
      diffId: input.diffId ?? null,
      lineCount: this.countLines(content),
      fileCount: parsed.files.length,
      summary: summaryLines.join('\n'),
      excerpt,
    };
  }

  async getDiffFileHeatmap(
    authUser: AuthenticatedUser,
    input: { diffId?: string | null; diffText?: string | null },
  ): Promise<DiffFileChurn[]> {
    if (!input.diffId && !input.diffText) {
      return [];
    }
    const content = input.diffText
      ? this.normalizeContent(input.diffText)
      : await this.getStoredDiffContent(authUser, input.diffId ?? '');
    if (!content) {
      return [];
    }
    const parsed = this.parseDiffMetadata(content);
    return Object.entries(parsed.fileStats)
      .map(([path, stat]) => ({
        path,
        added: stat.added,
        removed: stat.removed,
        churn: stat.added + stat.removed,
      }))
      .sort((a, b) => b.churn - a.churn);
  }

  private async getStoredDiffContent(authUser: AuthenticatedUser, diffId: string) {
    if (!diffId) {
      return '';
    }
    const user = await this.ensureUser(authUser);
    const diff = await this.prisma.diffArtifact.findFirst({
      where: { id: diffId, userId: user.id },
      select: { content: true },
    });
    if (!diff) {
      throw new NotFoundException('Diff not found');
    }
    return diff.content;
  }

  private parseDiffMetadata(content: string) {
    const files = new Set<string>();
    const hunks: Array<{ file: string; header: string }> = [];
    const fileStats: Record<string, { added: number; removed: number }> = {};
    let currentFile = 'unknown';
    let added = 0;
    let removed = 0;

    for (const line of content.split('\n')) {
      if (line.startsWith('diff --git ')) {
        const match = /^diff --git a\/(.+?) b\/(.+)$/.exec(line);
        currentFile = match?.[2] || match?.[1] || currentFile;
        files.add(currentFile);
        if (!fileStats[currentFile]) {
          fileStats[currentFile] = { added: 0, removed: 0 };
        }
        continue;
      }
      if (line.startsWith('+++ b/')) {
        currentFile = line.slice(6).trim();
        files.add(currentFile);
        if (!fileStats[currentFile]) {
          fileStats[currentFile] = { added: 0, removed: 0 };
        }
        continue;
      }
      if (line.startsWith('@@')) {
        hunks.push({ file: currentFile, header: line.trim() });
        continue;
      }
      if (line.startsWith('+') && !line.startsWith('+++')) {
        added += 1;
        if (!fileStats[currentFile]) {
          fileStats[currentFile] = { added: 0, removed: 0 };
        }
        fileStats[currentFile].added += 1;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        removed += 1;
        if (!fileStats[currentFile]) {
          fileStats[currentFile] = { added: 0, removed: 0 };
        }
        fileStats[currentFile].removed += 1;
      }
    }

    return {
      files: [...files],
      hunks,
      fileStats,
      added,
      removed,
    };
  }

  private validateDiffLike(content: string) {
    if (content.length < 20) {
      throw new BadRequestException('Diff content is too short');
    }
    const looksLikeDiff =
      content.includes('diff --git') ||
      content.includes('\n@@') ||
      (content.includes('\n+++ ') && content.includes('\n--- '));
    if (!looksLikeDiff) {
      throw new BadRequestException(
        'Uploaded content does not look like a unified diff/patch',
      );
    }
  }

  private normalizeContent(content: string) {
    return content.replace(/\r\n/g, '\n').trim();
  }

  private countLines(content: string) {
    if (!content) return 0;
    return content.split('\n').length;
  }

  private toDiffResponse(
    diff: {
      id: string;
      source: DiffSource;
      label: string | null;
      filename: string | null;
      content: string;
      lineCount: number;
      createdAt: Date;
      updatedAt: Date;
    },
    includeContent = false,
  ) {
    return {
      id: diff.id,
      source: diff.source,
      label: diff.label,
      filename: diff.filename,
      lineCount: diff.lineCount,
      preview: diff.content.split('\n').slice(0, 40).join('\n'),
      content: includeContent ? diff.content : undefined,
      createdAt: diff.createdAt.toISOString(),
      updatedAt: diff.updatedAt.toISOString(),
    };
  }

  private async ensureUser(authUser: AuthenticatedUser) {
    return this.prisma.user.upsert({
      where: { supabaseUserId: authUser.supabaseUserId },
      update: {
        email: authUser.email,
      },
      create: {
        supabaseUserId: authUser.supabaseUserId,
        email: authUser.email,
      },
    });
  }
}
