import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const MAX_LOGS_PER_PAGE = 500;
export const DEFAULT_LOGS_PER_PAGE = 200;

/** Query for GET /debug/logs. */
export class GetLogsDto {
  /** Return entries with a sequence number greater than this (0 = from the start). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  after?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LOGS_PER_PAGE)
  limit?: number;
}
