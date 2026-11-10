import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const MS_PER_HOUR = 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = MS_PER_HOUR;
const DEFAULT_TTL_HOURS = 24;
const BATCH_SIZE = 500;

/** Reads FILE_ORPHAN_TTL_HOURS, falling back to 24 for missing or invalid values. */
export function orphanTtlHours(raw: string | undefined = process.env.FILE_ORPHAN_TTL_HOURS): number {
  const hours = Number(raw);
  return raw && Number.isFinite(hours) && hours > 0 ? hours : DEFAULT_TTL_HOURS;
}

/**
 * Deletes uploads that were never attached to a message.
 * Runs once on startup and then every hour.
 */
@Injectable()
export class FileCleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('FileCleanup');
  private readonly ttlHours = orphanTtlHours();
  private timer?: NodeJS.Timeout;
  private isRunning = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.logger.log(`Removing uploads not sent in any message after ${this.ttlHours}h (checked hourly)`);
    void this.runSafely();
    this.timer = setInterval(() => void this.runSafely(), CLEANUP_INTERVAL_MS);
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  private async runSafely() {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      const deleted = await this.deleteOrphans();
      if (deleted > 0) this.logger.log(`Deleted ${deleted} orphaned upload(s)`);
    } catch (err) {
      this.logger.error(`Orphaned upload cleanup failed: ${err?.message ?? err}`);
    } finally {
      this.isRunning = false;
    }
  }

  /** Deletes files older than the TTL that no message references. Returns how many were deleted. */
  async deleteOrphans(now: Date = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - this.ttlHours * MS_PER_HOUR);
    let deleted = 0;
    let lastId: string | undefined;

    for (;;) {
      const batch = await this.prisma.file.findMany({
        where: { createdAt: { lt: cutoff }, ...(lastId ? { id: { gt: lastId } } : {}) },
        select: { id: true },
        orderBy: { id: 'asc' },
        take: BATCH_SIZE,
      });
      if (batch.length === 0) break;

      deleted += await this.deleteUnreferenced(batch.map((f) => f.id));
      if (batch.length < BATCH_SIZE) break;
      lastId = batch[batch.length - 1].id;
    }
    return deleted;
  }

  private async deleteUnreferenced(fileIds: string[]): Promise<number> {
    const referenced = await this.prisma.message.findMany({
      where: { fileId: { in: fileIds } },
      select: { fileId: true },
    });
    const referencedIds = new Set(referenced.map((m) => m.fileId));
    const orphanIds = fileIds.filter((id) => !referencedIds.has(id));
    if (orphanIds.length === 0) return 0;

    const { count } = await this.prisma.file.deleteMany({ where: { id: { in: orphanIds } } });
    return count;
  }
}
