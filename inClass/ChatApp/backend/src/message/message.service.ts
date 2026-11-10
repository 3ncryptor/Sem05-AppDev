import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto, MessageResponseDto, MessageType } from './dto/message.dto';
import { colorizeName } from '../common/color.util';
import { FILE_META_SELECT, FileMeta, toFileResponse } from '../file/file.mapper';
import { markReceipts } from '../common/receipts.util';

const PAGE_SIZE = 20;

const MESSAGE_SELECT = {
  id: true,
  content: true,
  type: true,
  fileId: true,
  createdAt: true,
  senderId: true,
  conversationId: true,
  status: true,
} as const;

interface StoredMessage {
  id: string;
  content: string;
  type: string;
  fileId: string | null;
  createdAt: Date;
  senderId: string;
  conversationId: string;
  status: unknown;
}

interface ConversationInfo {
  type: string;
  name: string | null;
  participants_ids: string[];
}

function toMessageResponse(message: StoredMessage, file: FileMeta | undefined): MessageResponseDto {
  return {
    id: message.id,
    content: message.content,
    type: message.type as MessageType,
    fileId: message.fileId,
    file: file ? toFileResponse(file) : null,
    createdAt: message.createdAt,
    senderId: message.senderId,
    conversationId: message.conversationId,
    status: message.status as MessageResponseDto['status'],
  };
}

@Injectable()
export class MessageService {
  private readonly logger = new Logger('Chat');

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetch messages for a conversation using cursor-based pagination.
   * - No cursor  → 20 most-recent messages.
   * - With cursor → 20 messages older than the cursor message.
   * Returned oldest-first within the page (natural chat order).
   * Opening a conversation counts as reading it, so the reader's unread
   * messages in it are marked read before the page is loaded.
   */
  async getMessages(conversationId: string, fromMessageCursor: string | undefined, readerId: string) {
    await this.markRead(conversationId, readerId);

    if (fromMessageCursor) {
      const cursorMessage = await this.prisma.message.findUnique({
        where: { id: fromMessageCursor },
        select: { id: true },
      });
      if (!cursorMessage) {
        throw new NotFoundException(`Cursor message '${fromMessageCursor}' not found`);
      }
    }

    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      select: MESSAGE_SELECT,
      ...(fromMessageCursor ? { cursor: { id: fromMessageCursor }, skip: 1 } : {}),
    });

    const filesById = await this.loadFileMeta(messages.map((m) => m.fileId));
    const data = [...messages]
      .reverse()
      .map((m) => toMessageResponse(m, m.fileId ? filesById.get(m.fileId) : undefined));

    return {
      data,
      nextCursor: messages.length === PAGE_SIZE ? messages[messages.length - 1].id : null,
      count: data.length,
    };
  }

  /**
   * Create a new message.
   * senderId comes from the authenticated user, not the request body.
   * An attachment must be a file the sender uploaded via POST /file.
   * Builds default status JSON: sender = delivered+read, others = false.
   */
  async createMessage(dto: CreateMessageDto, senderId: string): Promise<MessageResponseDto> {
    if (!dto.content && !dto.file_id) {
      throw new BadRequestException('Message must contain content or file_id');
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: dto.conversation_id },
    });
    if (!conversation) {
      throw new NotFoundException(`Conversation '${dto.conversation_id}' not found`);
    }

    const file = dto.file_id ? await this.loadOwnFile(dto.file_id, senderId) : undefined;

    const defaultStatus: Record<string, { delivered: boolean; read: boolean }> = {};
    for (const participantId of conversation.participants_ids) {
      const isSender = participantId === senderId;
      defaultStatus[participantId] = { delivered: isSender, read: isSender };
    }

    const message = await this.prisma.message.create({
      data: {
        content: dto.content ?? '',
        type: file ? file.kind : 'TEXT',
        fileId: file?.id ?? null,
        senderId,
        conversationId: dto.conversation_id,
        status: defaultStatus,
      },
      select: MESSAGE_SELECT,
    });

    await this.logMessage(conversation, senderId, message.content, file);
    return toMessageResponse(message, file);
  }

  /** Receipts are a side effect; a failure is logged and never fails the request. */
  private async markRead(conversationId: string, readerId: string) {
    try {
      const count = await markReceipts(this.prisma, readerId, 'read', conversationId);
      if (count > 0) this.logger.log(`${count} message(s) read by user ${readerId} in ${conversationId}`);
    } catch (err) {
      this.logger.warn(`Could not mark messages read for ${readerId}: ${err?.message ?? err}`);
    }
  }

  private async loadOwnFile(fileId: string, senderId: string): Promise<FileMeta> {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      select: FILE_META_SELECT,
    });
    if (!file || file.uploadedBy !== senderId) {
      throw new BadRequestException('file_id must reference a file uploaded by the sender');
    }
    return file;
  }

  private async loadFileMeta(fileIds: (string | null)[]): Promise<Map<string, FileMeta>> {
    const ids = [...new Set(fileIds.filter((id): id is string => id !== null))];
    if (ids.length === 0) return new Map();

    const files = await this.prisma.file.findMany({
      where: { id: { in: ids } },
      select: FILE_META_SELECT,
    });
    return new Map(files.map((f) => [f.id, f]));
  }

  // ─── Interactive Console Logging ────────────────────────────────────────────
  private async logMessage(
    conversation: ConversationInfo,
    senderId: string,
    content: string,
    file: FileMeta | undefined,
  ) {
    // Fetch participant names explicitly — Prisma MongoDB relation joins are unreliable
    const participants = await this.prisma.user.findMany({
      where: { id: { in: conversation.participants_ids } },
      select: { id: true, name: true },
    });

    // Fetch sender separately — sender may not appear in participants lookup if IDs mismatch
    const senderUser =
      participants.find((u) => u.id === senderId) ??
      (await this.prisma.user.findUnique({ where: { id: senderId }, select: { id: true, name: true } }));

    const senderName = senderUser?.name ?? `id:${senderId}`;
    const resolvedSenderId = senderUser?.id ?? senderId;
    const receiverUsers = participants.filter((u) => u.id !== resolvedSenderId);

    const participantNames = participants.map((u) => colorizeName(u.name)).join(', ');
    const convLabel =
      conversation.type === 'DM'
        ? `DM [${participantNames}]`
        : conversation.name
          ? `Group "${conversation.name}"`
          : `Group [${participantNames}]`;

    const coloredReceivers =
      receiverUsers.length > 0 ? receiverUsers.map((u) => colorizeName(u.name)).join(', ') : 'None';

    // Log a [IMAGE]/[FILE] tag instead of file contents
    const textLabel = content ? `\x1b[37m${content}\x1b[0m` : '';
    const fileLabel = file ? `\x1b[35m[${file.kind}]\x1b[0m` : '';
    const contentLabel = [textLabel, fileLabel].filter(Boolean).join(' + ');

    this.logger.log(
      `\x1b[36m[MSG]\x1b[0m \x1b[1m${convLabel}\x1b[0m │ ${colorizeName(senderName)} \x1b[33m➔\x1b[0m ${coloredReceivers} │ "${contentLabel}"`,
    );
  }
}
