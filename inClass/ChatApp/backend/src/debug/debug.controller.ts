import { Controller, Get, Query } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { LogPage, logBuffer } from '../common/log-buffer';
import { DEFAULT_LOGS_PER_PAGE, GetLogsDto } from './dto/get-logs.dto';

/**
 * Local-only route that lets the app's Inspector show server logs.
 * Hidden from Swagger so the API docs stay identical to the class swagger.json.
 * Only registered when DEBUG_LOGS=true; otherwise the route returns 404.
 */
@ApiExcludeController()
@Controller('debug')
export class DebugController {
  @Get('logs')
  getLogs(@Query() query: GetLogsDto): LogPage {
    return logBuffer.since(query.after ?? 0, query.limit ?? DEFAULT_LOGS_PER_PAGE);
  }
}
