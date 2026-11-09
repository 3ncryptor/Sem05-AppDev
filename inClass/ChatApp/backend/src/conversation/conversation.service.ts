import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { markReceipts } from '../common/receipts.util';
import { CreateConversationDto } from './dto/conversation.dto';

@Injectable()
export class ConversationService {
  private readonly logger = new Logger('Receipts');

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns all conversations the user is a participant in,
   * sorted by createdAt descending (newest first).
   * Fetching the list counts as the user's app receiving their messages,
   * so their undelivered messages are marked delivered.
   */
  async getUserConversations(userId: string) {
    await this.markDelivered(userId);
    return this.prisma.conversation.findMany({
      where: {
        participants_ids: {
          has: userId,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        type: true,
        createdAt: true,
        createdBy: true,
        participants_ids: true,
      },
    });
  }

  /** Receipts are a side effect; a failure is logged and never fails the request. */
  private async markDelivered(userId: string) {
    try {
      await markReceipts(this.prisma, userId, 'delivered');
    } catch (err) {
      this.logger.warn(`Could not mark messages delivered for ${userId}: ${err?.message ?? err}`);
    }
  }

  /**
   * Creates a new conversation (DM or GROUP), or returns an existing DM.
   * The authenticated caller is automatically added as creator and participant.
   */
  async createConversation(dto: CreateConversationDto, callerId: string) {
    const participantIds = new Set<string>();
    if (dto.participants_ids) {
      for (const id of dto.participants_ids) participantIds.add(id);
    }

    // Remove caller if caller passed their own ID in participants
    participantIds.delete(callerId);

    if (participantIds.size === 0) {
      throw new BadRequestException('At least one other participant is required');
    }

    const participantsArray = Array.from(participantIds);

    // Verify all participants exist
    const foundUsers = await this.prisma.user.findMany({
      where: { id: { in: participantsArray } },
      select: { id: true, name: true },
    });

    if (foundUsers.length !== participantsArray.length) {
      throw new NotFoundException('One or more participant users not found');
    }

    const type = dto.type ?? (participantsArray.length > 1 ? 'GROUP' : 'DM');

    // For DMs: return existing conversation if one already exists between caller and recipient
    if (type === 'DM' && participantsArray.length === 1) {
      const otherId = participantsArray[0];
      const existing = await this.prisma.conversation.findFirst({
        where: {
          type: 'DM',
          participants_ids: {
            hasEvery: [callerId, otherId],
          },
        },
      });

      if (existing) {
        return existing;
      }
    }

    // Always include caller in participants_ids
    const allParticipantIds = [callerId, ...participantsArray];

    // DMs have no name; clients show the other participant's name instead
    const conversationName = type === 'DM' ? null : (dto.name ?? null);

    const conversation = await this.prisma.conversation.create({
      data: {
        type,
        name: conversationName,
        createdBy: callerId,
        participants_ids: allParticipantIds,
      },
    });

    // Update conversationIds for all participants
    await this.prisma.user.updateMany({
      where: { id: { in: allParticipantIds } },
      data: {
        conversationIds: {
          push: conversation.id,
        },
      },
    });

    return conversation;
  }
}
