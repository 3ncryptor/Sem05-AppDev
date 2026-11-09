import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ConversationModule } from './conversation/conversation.module';
import { MessageModule } from './message/message.module';
import { BotModule } from './bot/bot.module';
import { FileModule } from './file/file.module';
import { DebugModule } from './debug/debug.module';

const isBotMode = process.env.BOT_MODE === 'true';
const isDebugLogs = process.env.DEBUG_LOGS === 'true';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UserModule,
    ConversationModule,
    MessageModule,
    FileModule,
    // BotModule only loaded when BOT_MODE=true
    ...(isBotMode ? [BotModule] : []),
    // DebugModule (GET /debug/logs for the app's Inspector) only when DEBUG_LOGS=true
    ...(isDebugLogs ? [DebugModule] : []),
  ],
})
export class AppModule {}
