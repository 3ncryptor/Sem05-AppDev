import { Module } from '@nestjs/common';
import { DebugController } from './debug.controller';

/** Server-log route for the app's Inspector. Loaded only when DEBUG_LOGS=true. */
@Module({
  controllers: [DebugController],
})
export class DebugModule {}
