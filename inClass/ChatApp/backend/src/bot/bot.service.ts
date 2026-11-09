import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FACTS } from './facts.data';

// ─── Single Fixed Bot User ──────────────────────────────────────────────────
const BOT_USER = { name: 'FactBot', phone: 'BOT_001', bio: 'I am a FactBot' };

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotService.name);
  private timer: NodeJS.Timeout | null = null;
  private botUserId: string | null = null;
  private factIndex = 0;

  constructor(private readonly prisma: PrismaService) { }

  async onModuleInit() {
    this.logger.log('Bot simulation enabled (BOT_MODE=true)');
    await this.seedBotUser();

    // Start 10-second ticker
    this.timer = setInterval(() => {
      this.sendBotMessages();
    }, 10_000);

    this.logger.log(
      `FactBot active (${BOT_USER.name}): sending facts every 10s to all real users.`,
    );
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.logger.log('Bot simulation stopped.');
    }
  }

  // ─── Seed single fixed bot user ─────────────────────────────────────────────
  private async seedBotUser() {
    let user = await this.prisma.user.findUnique({
      where: { name: BOT_USER.name },
    });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          name: BOT_USER.name,
          phone: BOT_USER.phone,
          bio: BOT_USER.bio,
          conversationIds: [],
        },
      });
    } else if (user.bio !== BOT_USER.bio) {
      // Older versions stored an emoji in the bio; keep it plain text
      user = await this.prisma.user.update({ where: { id: user.id }, data: { bio: BOT_USER.bio } });
    }
    this.botUserId = user.id;
  }

  // ─── Core loop: every tick, EVERY real user gets a fact in the same DM ───
  private async sendBotMessages() {
    try {
      if (!this.botUserId) return;

      // Get all real (non-bot) users
      const realUsers = await this.prisma.user.findMany({
        where: {
          name: { not: BOT_USER.name },
        },
      });

      if (realUsers.length === 0) {
        this.logger.debug('No real users found yet — skipping bot tick.');
        return;
      }

      this.logger.log('\x1b[35m[BOT]\x1b[0m \x1b[1mBot is chatting...\x1b[0m');

      for (const realUser of realUsers) {
        // Reuse existing DM with bot or create a single one
        const conversation = await this.findOrCreateDm(realUser.id);
        if (!conversation) continue;

        // Pick next fact (cycle)
        const fact = FACTS[this.factIndex % FACTS.length];
        this.factIndex++;

        // Build status payload
        const status: Record<string, { delivered: boolean; read: boolean }> = {
          [this.botUserId]: { delivered: true, read: true },
          [realUser.id]: { delivered: false, read: false },
        };

        await this.prisma.message.create({
          data: {
            content: fact,
            senderId: this.botUserId,
            conversationId: conversation.id,
            status,
          },
        });
      }
    } catch (err) {
      this.logger.error('Bot message tick failed:', err?.message ?? err);
    }
  }

  // ─── Find existing DM with FactBot or create a single new one ─────────────
  private async findOrCreateDm(realUserId: string) {
    if (!this.botUserId) return null;

    // Check if DM already exists between this real user and FactBot
    const existing = await this.prisma.conversation.findFirst({
      where: {
        type: 'DM',
        participants_ids: {
          hasEvery: [this.botUserId, realUserId],
        },
      },
    });

    if (existing) {
      // DMs are unnamed; clear names left over from older versions
      if (existing.name !== null) {
        await this.prisma.conversation.update({
          where: { id: existing.id },
          data: { name: null },
        });
        existing.name = null;
      }
      return existing;
    }

    // No existing DM — create one with FactBot
    const conversation = await this.prisma.conversation.create({
      data: {
        name: null,
        type: 'DM',
        createdBy: this.botUserId,
        participants_ids: [this.botUserId, realUserId],
      },
    });

    // Link conversation to both users
    await this.prisma.user.updateMany({
      where: { id: { in: [this.botUserId, realUserId] } },
      data: {
        conversationIds: {
          push: conversation.id,
        },
      },
    });

    return conversation;
  }
}
