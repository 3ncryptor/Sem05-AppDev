import {
  AuthCredentials,
  ConnectionMode,
  ConversationResponseDto,
  CreateConversationDto,
  CreateMessageDto,
  MessageResponseDto,
  PaginatedMessagesResponseDto,
  UserResponseDto,
} from '../types/api';
import { httpRequest } from './client';
import { mockBackend } from './mockServer';

export interface ApiClientConfig {
  mode: ConnectionMode;
  baseUrl: string;
  credentials: AuthCredentials;
}

/**
 * Unified API Endpoints Layer
 * Routes transparently to either the Live NestJS Backend (`http://10.7.1.51:3000` / `localhost:3000`)
 * or the Local Stateful Mock Engine (`mockServer.ts`).
 */
export const chatApi = {
  /**
   * GET /user/profile?user_id=<optional>
   */
  async getProfile(config: ApiClientConfig, userId?: string): Promise<UserResponseDto> {
    if (config.mode === 'mock') {
      return mockBackend.getProfile(config.credentials, userId);
    }
    return httpRequest<UserResponseDto>({
      method: 'GET',
      path: '/user/profile',
      query: userId ? { user_id: userId } : undefined,
      credentials: config.credentials,
      baseUrl: config.baseUrl,
    });
  },

  /**
   * GET /user
   */
  async getAllUsers(config: ApiClientConfig): Promise<UserResponseDto[]> {
    if (config.mode === 'mock') {
      return mockBackend.getAllUsers(config.credentials);
    }
    return httpRequest<UserResponseDto[]>({
      method: 'GET',
      path: '/user',
      credentials: config.credentials,
      baseUrl: config.baseUrl,
    });
  },

  /**
   * GET /conversation
   */
  async getConversations(config: ApiClientConfig): Promise<ConversationResponseDto[]> {
    if (config.mode === 'mock') {
      return mockBackend.getConversations(config.credentials);
    }
    return httpRequest<ConversationResponseDto[]>({
      method: 'GET',
      path: '/conversation',
      credentials: config.credentials,
      baseUrl: config.baseUrl,
    });
  },

  /**
   * POST /conversation
   */
  async createConversation(
    config: ApiClientConfig,
    dto: CreateConversationDto,
  ): Promise<ConversationResponseDto> {
    if (config.mode === 'mock') {
      return mockBackend.createConversation(config.credentials, dto);
    }
    return httpRequest<ConversationResponseDto>({
      method: 'POST',
      path: '/conversation',
      body: dto,
      credentials: config.credentials,
      baseUrl: config.baseUrl,
    });
  },

  /**
   * GET /message?conversation_id=<id>&from_message_cursor=<optional>
   */
  async getMessages(
    config: ApiClientConfig,
    conversationId: string,
    fromMessageCursor?: string,
  ): Promise<PaginatedMessagesResponseDto> {
    if (config.mode === 'mock') {
      return mockBackend.getMessages(config.credentials, conversationId, fromMessageCursor);
    }
    return httpRequest<PaginatedMessagesResponseDto>({
      method: 'GET',
      path: '/message',
      query: {
        conversation_id: conversationId,
        from_message_cursor: fromMessageCursor,
      },
      credentials: config.credentials,
      baseUrl: config.baseUrl,
    });
  },

  /**
   * POST /message
   */
  async createMessage(
    config: ApiClientConfig,
    dto: CreateMessageDto,
  ): Promise<MessageResponseDto> {
    if (config.mode === 'mock') {
      return mockBackend.createMessage(config.credentials, dto);
    }
    return httpRequest<MessageResponseDto>({
      method: 'POST',
      path: '/message',
      body: dto,
      credentials: config.credentials,
      baseUrl: config.baseUrl,
    });
  },
};

