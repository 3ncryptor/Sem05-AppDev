import { isMongoId } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';

export type Receipt = 'delivered' | 'read';

/**
 * Marks messages addressed to `userId` as delivered, or as read (which also
 * implies delivered). Only messages whose status map already contains the
 * user are touched, so people outside a conversation never gain receipts.
 * Returns the number of messages updated.
 */
export async function markReceipts(
  prisma: PrismaService,
  userId: string,
  receipt: Receipt,
  conversationId?: string,
): Promise<number> {
  // Ids become part of a field path, so only accept real ObjectIds
  if (!isMongoId(userId) || (conversationId !== undefined && !isMongoId(conversationId))) {
    return 0;
  }

  const statusPath = `status.${userId}`;
  const set =
    receipt === 'read'
      ? { [`${statusPath}.delivered`]: true, [`${statusPath}.read`]: true }
      : { [`${statusPath}.delivered`]: true };

  const result = await prisma.$runCommandRaw({
    update: 'messages',
    updates: [
      {
        q: {
          [`${statusPath}.${receipt}`]: false,
          ...(conversationId ? { conversationId: { $oid: conversationId } } : {}),
        },
        u: { $set: set },
        multi: true,
      },
    ],
  });

  return Number(result.nModified ?? 0);
}
