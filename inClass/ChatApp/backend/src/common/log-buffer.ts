import type { RequestContext } from './request-context';

/** One stored log line, as served by GET /debug/logs. */
export interface LogEntry {
  seq: number;
  time: string;
  level: string;
  context: string;
  message: string;
  requestId: string | null;
  isPoll: boolean;
}

export interface LogPage {
  entries: LogEntry[];
  latestSeq: number;
  oldestSeq: number;
}

const MAX_ENTRIES = 500;
const ANSI_CODES = /\x1b\[[0-9;]*m/g;

/**
 * Keeps the most recent server log lines in memory (oldest dropped first).
 * Colour codes are stripped so the app can render plain text.
 */
class LogBuffer {
  private entries: LogEntry[] = [];
  private seq = 0;

  add(level: string, context: string, message: string, request?: RequestContext): void {
    this.seq += 1;
    const entry: LogEntry = {
      seq: this.seq,
      time: new Date().toISOString(),
      level,
      context,
      message: message.replace(ANSI_CODES, ''),
      requestId: request?.requestId ?? null,
      isPoll: request?.isPoll ?? false,
    };
    this.entries = [...this.entries.slice(-(MAX_ENTRIES - 1)), entry];
  }

  /** Entries newer than `after`, oldest first, at most `limit` of them. */
  since(after: number, limit: number): LogPage {
    return {
      entries: this.entries.filter((e) => e.seq > after).slice(0, limit),
      latestSeq: this.seq,
      oldestSeq: this.entries[0]?.seq ?? 0,
    };
  }
}

/** The single in-memory buffer shared by the logger and the debug route. */
export const logBuffer = new LogBuffer();
