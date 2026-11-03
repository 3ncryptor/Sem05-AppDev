/**
 * 1:1 TypeScript Interfaces matching the NestJS + Prisma + MongoDB Backend DTOs
 * Source: backend/src/user/dto/user.dto.ts
 *         backend/src/conversation/dto/conversation.dto.ts
 *         backend/src/message/dto/message.dto.ts
 */

export interface UserResponseDto {
  id: string;
  name: string;
  bio?: string | null;
}

export type ConversationType = 'DM' | 'GROUP';

export interface CreateConversationDto {
  type?: ConversationType;
  name?: string;
  participants_ids?: string[];
}

export interface ConversationResponseDto {
  id: string;
  name?: string | null;
  type: ConversationType | string;
  createdAt: string;
  createdBy: string;
  participants_ids: string[];
}

export interface GetMessagesDto {
  conversation_id: string;
  from_message_cursor?: string;
}

export interface CreateMessageDto {
  conversation_id: string;
  content?: string;
  imageInfo?: string;
}

export interface MessageDeliveryStatus {
  delivered: boolean;
  read: boolean;
}

export interface MessageResponseDto {
  id: string;
  content?: string | null;
  imageInfo?: string | null;
  createdAt: string;
  senderId: string;
  conversationId: string;
  status: Record<string, MessageDeliveryStatus>;
}

export interface PaginatedMessagesResponseDto {
  data: MessageResponseDto[];
  nextCursor?: string | null;
  count: number;
}

export type ConnectionMode = 'live' | 'mock';

export interface AuthCredentials {
  username: string;
  password: string;
}

