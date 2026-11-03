import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AuthCredentials,
  ConversationResponseDto,
  CreateConversationDto,
  CreateMessageDto,
  MessageResponseDto,
  PaginatedMessagesResponseDto,
  UserResponseDto,
} from '../types/api';
import { ApiError } from './client';
import { SAMPLE_BASE64_IMAGES } from '../utils/format';

const MOCK_STORAGE_KEY = '@chatapp_mock_db_v1';
const PAGE_SIZE = 20;

/**
 * Curated facts directly from backend/src/bot/facts.data.ts for FactBot simulation
 */
export const MOCK_FACTS: string[] = [
  "The legendary Fast Inverse Square Root algorithm from Quake III Arena computes 1/sqrt(x) using a bizarre floating-point bit hack and the magic hexadecimal constant 0x5f3759df.",
  "B-trees and B+ trees form the structural backbone of virtually all relational databases and modern filesystems, achieving predictable logarithmic search across terabytes of data.",
  "Git was authored by Linus Torvalds in under two weeks, designed around a content-addressable directed acyclic graph of cryptographic SHA-1 object hashes.",
  "UTF-8 was sketched on a paper placemat in 1992 by Ken Thompson and Rob Pike, encoding Unicode code points into 1 to 4 bytes while preserving ASCII backwards compatibility.",
  "Redis achieves sub-millisecond latency by serving all operational data directly from memory through single-threaded event loops built upon epoll and kqueue.",
  "The CAP theorem proves that any distributed data store can provide at most two of three guarantees simultaneously: consistency, availability, and partition tolerance.",
  "WebAssembly provides a compact, portable binary instruction format that executes sandboxed inside virtual machines at near-native speed.",
  "Consistent hashing maps both server nodes and cache keys to points along a circular mathematical ring, preventing full-cache invalidation when nodes join or leave.",
];

interface MockUserRecord extends UserResponseDto {
  phone: string;
  conversationIds: string[];
}

interface MockDatabase {
  users: MockUserRecord[];
  conversations: ConversationResponseDto[];
  messages: MessageResponseDto[];
  factIndex: number;
}

const BOT_ID = '6ae19000596b5b3b79cac701';
const ARYAN_ID = '6ae190ee596b5b3b79cac735';
const RITESH_ID = '6ae191ea596b5b3b79cac73e';
const ABHINAY_ID = '6ae190cf596b5b3b79cac734';
const PRIYA_ID = '6ae193a1596b5b3b79cac750';
const KABIR_ID = '6ae193b2596b5b3b79cac751';

const CONV_DM_RITESH = '6ae1927c596b5b3b79cac745';
const CONV_DM_FACTBOT = '6ae1927c596b5b3b79cac740';
const CONV_GROUP_STUDY = '6ae1927c596b5b3b79cac749';
const CONV_DM_ABHINAY = '6ae1927c596b5b3b79cac748';

function generateObjectId(): string {
  const timestamp = Math.floor(Date.now() / 1000)
    .toString(16)
    .padStart(8, '0');
  let randomHex = '';
  for (let i = 0; i < 16; i++) {
    randomHex += Math.floor(Math.random() * 16).toString(16);
  }
  return (timestamp + randomHex).slice(0, 24);
}

function createInitialMockDb(): MockDatabase {
  const now = Date.now();
  const min = 60 * 1000;

  const users: MockUserRecord[] = [
    {
      id: ARYAN_ID,
      name: 'aryan.vibhuti2024@nst.rishihood.edu.in',
      phone: 'Aryan@1122334455',
      bio: 'Sem 05 AppDev · React Native & NestJS Explorer',
      conversationIds: [CONV_DM_RITESH, CONV_DM_FACTBOT, CONV_GROUP_STUDY, CONV_DM_ABHINAY],
    },
    {
      id: RITESH_ID,
      name: 'Ritesh',
      phone: 'ritesh123',
      bio: 'Course Instructor · Systems & Architecture',
      conversationIds: [CONV_DM_RITESH, CONV_GROUP_STUDY],
    },
    {
      id: ABHINAY_ID,
      name: 'abhinay',
      phone: 'abhinay123',
      bio: 'Full-Stack & Distributed Systems',
      conversationIds: [CONV_GROUP_STUDY, CONV_DM_ABHINAY],
    },
    {
      id: BOT_ID,
      name: 'FactBot',
      phone: 'BOT_001',
      bio: 'Automated Fact Stream (every 10s)',
      conversationIds: [CONV_DM_FACTBOT],
    },
    {
      id: PRIYA_ID,
      name: 'Priya Sharma',
      phone: 'priya123',
      bio: 'UI/UX & Mobile Engineering',
      conversationIds: [CONV_GROUP_STUDY],
    },
    {
      id: KABIR_ID,
      name: 'Kabir Verma',
      phone: 'kabir123',
      bio: 'Backend & Prisma ORM Enthusiast',
      conversationIds: [],
    },
  ];

  const conversations: ConversationResponseDto[] = [
    {
      id: CONV_DM_RITESH,
      name: '[DM] Ritesh',
      type: 'DM',
      createdAt: new Date(now - 15 * min).toISOString(),
      createdBy: ARYAN_ID,
      participants_ids: [ARYAN_ID, RITESH_ID],
    },
    {
      id: CONV_GROUP_STUDY,
      name: 'Team Study Group',
      type: 'GROUP',
      createdAt: new Date(now - 45 * min).toISOString(),
      createdBy: ARYAN_ID,
      participants_ids: [ARYAN_ID, RITESH_ID, ABHINAY_ID, PRIYA_ID],
    },
    {
      id: CONV_DM_FACTBOT,
      name: '[DM] FactBot',
      type: 'DM',
      createdAt: new Date(now - 90 * min).toISOString(),
      createdBy: BOT_ID,
      participants_ids: [BOT_ID, ARYAN_ID],
    },
    {
      id: CONV_DM_ABHINAY,
      name: '[DM] abhinay',
      type: 'DM',
      createdAt: new Date(now - 180 * min).toISOString(),
      createdBy: ARYAN_ID,
      participants_ids: [ARYAN_ID, ABHINAY_ID],
    },
  ];

  // Generate 25 messages in CONV_DM_RITESH so reverse-cursor pagination (PAGE_SIZE = 20) can be demonstrated right away!
  const riteshMessages: MessageResponseDto[] = [];
  const earlyTopics = [
    { from: RITESH_ID, text: 'Welcome to the Sem 05 Mobile App Development lab!' },
    { from: ARYAN_ID, text: 'Good morning Sir! Setting up the React Native Expo client now.' },
    { from: RITESH_ID, text: 'Remember: our NestJS AuthGuard checks plaintext Basic <username>:<password>.' },
    { from: ARYAN_ID, text: 'Noted Sir — standard Base64 encoding returns 401 Unauthorized, so I built a custom header injector.' },
    { from: RITESH_ID, text: 'Great. Also check the ValidationPipe in main.ts — forbidNonWhitelisted is true.' },
    { from: ARYAN_ID, text: 'Yes! I inspected CreateConversationDto and saw it uses participants_ids: string[] for both DMs and Groups.' },
    { from: RITESH_ID, text: 'Spot on. How are you handling DM conversation names since the DB stores [DM] <recipient>?' },
    { from: ARYAN_ID, text: 'Our ChatContext resolves the other participant ID from the cached GET /user directory so both sides see the right name.' },
    { from: RITESH_ID, text: 'What about reverse-cursor pagination on GET /message?' },
    { from: ARYAN_ID, text: 'Each page loads 20 messages (oldest-to-newest) and returns nextCursor. Scrolling up passes from_message_cursor!' },
    { from: RITESH_ID, text: 'Did you notice we also added 10MB JSON body support in main.ts?' },
    { from: ARYAN_ID, text: 'Yes! For imageInfo Base64 data URIs in CreateMessageDto.' },
    { from: RITESH_ID, text: 'Try sending both text and Base64 images in the chat thread.' },
    { from: ARYAN_ID, text: 'Will do! I also added a full-screen lightbox modal when tapping any image bubble.' },
    { from: RITESH_ID, text: 'Does your app also handle FactBot messages when BOT_MODE=true?' },
    { from: ARYAN_ID, text: 'Yes Sir, FactBot has a dedicated 🤖 badge and live polling picks up new facts automatically.' },
    { from: RITESH_ID, text: 'Let us test pagination with more than 20 messages in this thread.' },
    { from: ARYAN_ID, text: 'Message #18 in the history — scrolling to the top will load the older page via nextCursor.' },
    { from: RITESH_ID, text: 'Message #19 — cursor pagination prevents duplicate shifts when new messages arrive.' },
    { from: ARYAN_ID, text: 'Message #20 — almost at the latest page boundary!' },
    { from: RITESH_ID, text: 'Message #21 — this message starts the most recent 20-message window.' },
    { from: ARYAN_ID, text: 'Here is an architecture card sent via Base64 imageInfo:', imageInfo: SAMPLE_BASE64_IMAGES[0].dataUri },
    { from: RITESH_ID, text: 'The Base64 image rendered cleanly inside the React Native Image component!' },
    { from: ARYAN_ID, text: 'Hello Sir' },
  ];

  earlyTopics.forEach((item, idx) => {
    const senderId = item.from;
    const otherId = senderId === ARYAN_ID ? RITESH_ID : ARYAN_ID;
    riteshMessages.push({
      id: `6ae19286596b5b3b79cac7${(10 + idx).toString().padStart(2, '0')}`,
      content: item.text,
      imageInfo: item.imageInfo ?? null,
      createdAt: new Date(now - (earlyTopics.length - idx) * 2 * min).toISOString(),
      senderId,
      conversationId: CONV_DM_RITESH,
      status: {
        [senderId]: { delivered: true, read: true },
        [otherId]: { delivered: true, read: idx < earlyTopics.length - 1 },
      },
    });
  });

  const otherMessages: MessageResponseDto[] = [
    {
      id: '6ae19286596b5b3b79cac801',
      content: 'Hey everyone! Welcome to the Team Study Group for Sem05 AppDev.',
      imageInfo: null,
      createdAt: new Date(now - 40 * min).toISOString(),
      senderId: ARYAN_ID,
      conversationId: CONV_GROUP_STUDY,
      status: {
        [ARYAN_ID]: { delivered: true, read: true },
        [RITESH_ID]: { delivered: true, read: true },
        [ABHINAY_ID]: { delivered: true, read: true },
        [PRIYA_ID]: { delivered: true, read: false },
      },
    },
    {
      id: '6ae19286596b5b3b79cac802',
      content: 'I just cloned rt-nst-ru/MobileApp-Bakcend-5thSem into the backend folder.',
      imageInfo: null,
      createdAt: new Date(now - 35 * min).toISOString(),
      senderId: ABHINAY_ID,
      conversationId: CONV_GROUP_STUDY,
      status: {
        [ABHINAY_ID]: { delivered: true, read: true },
        [ARYAN_ID]: { delivered: true, read: true },
        [RITESH_ID]: { delivered: true, read: true },
        [PRIYA_ID]: { delivered: true, read: true },
      },
    },
    {
      id: '6ae19286596b5b3b79cac803',
      content: 'The deterministic djb2 avatar colors match the backend console logs!',
      imageInfo: null,
      createdAt: new Date(now - 25 * min).toISOString(),
      senderId: PRIYA_ID,
      conversationId: CONV_GROUP_STUDY,
      status: {
        [PRIYA_ID]: { delivered: true, read: true },
        [ARYAN_ID]: { delivered: true, read: true },
        [RITESH_ID]: { delivered: true, read: true },
        [ABHINAY_ID]: { delivered: true, read: true },
      },
    },
    {
      id: '6ae19286596b5b3b79cac901',
      content: MOCK_FACTS[0],
      imageInfo: null,
      createdAt: new Date(now - 20 * min).toISOString(),
      senderId: BOT_ID,
      conversationId: CONV_DM_FACTBOT,
      status: {
        [BOT_ID]: { delivered: true, read: true },
        [ARYAN_ID]: { delivered: true, read: true },
      },
    },
    {
      id: '6ae19286596b5b3b79cac902',
      content: MOCK_FACTS[1],
      imageInfo: null,
      createdAt: new Date(now - 5 * min).toISOString(),
      senderId: BOT_ID,
      conversationId: CONV_DM_FACTBOT,
      status: {
        [BOT_ID]: { delivered: true, read: true },
        [ARYAN_ID]: { delivered: true, read: false },
      },
    },
    {
      id: '6ae19286596b5b3b79cac950',
      content: 'Hey Aryan, let me know once the Expo Router screens are ready to test!',
      imageInfo: null,
      createdAt: new Date(now - 120 * min).toISOString(),
      senderId: ABHINAY_ID,
      conversationId: CONV_DM_ABHINAY,
      status: {
        [ABHINAY_ID]: { delivered: true, read: true },
        [ARYAN_ID]: { delivered: true, read: true },
      },
    },
  ];

  return {
    users,
    conversations,
    messages: [...riteshMessages, ...otherMessages],
    factIndex: 2,
  };
}

let memoryDb: MockDatabase | null = null;

async function getDb(): Promise<MockDatabase> {
  if (memoryDb) return memoryDb;
  try {
    const raw = await AsyncStorage.getItem(MOCK_STORAGE_KEY);
    if (raw) {
      memoryDb = JSON.parse(raw);
      return memoryDb!;
    }
  } catch {
    // Fallback to in-memory
  }
  memoryDb = createInitialMockDb();
  await saveDb(memoryDb);
  return memoryDb;
}

async function saveDb(db: MockDatabase): Promise<void> {
  memoryDb = db;
  try {
    await AsyncStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Ignore storage write quota errors
  }
}

export async function resetMockDatabase(): Promise<void> {
  memoryDb = createInitialMockDb();
  await saveDb(memoryDb);
}

/**
 * Mirrors backend/src/auth/auth.guard.ts:
 * Finds user by `name === username`.
 * If not found, auto-creates user with `{ name: username, phone: password }`.
 * If found, checks `user.phone === password`.
 */
async function authenticateMockUser(creds: AuthCredentials): Promise<MockUserRecord> {
  const username = creds.username.trim();
  const password = creds.password.trim();

  if (!username || !password) {
    throw new ApiError('Username and password must not be empty', 401);
  }

  const db = await getDb();
  let user = db.users.find((u) => u.name === username);

  if (!user) {
    user = {
      id: generateObjectId(),
      name: username,
      phone: password,
      bio: 'Auto-provisioned via Basic Auth',
      conversationIds: [],
    };
    db.users.push(user);
    await saveDb(db);
  } else {
    if (user.phone && user.phone !== password) {
      throw new ApiError(`Invalid password for user '${username}'`, 401);
    }
  }

  return user;
}

export const mockBackend = {
  /**
   * GET /user/profile?user_id=<optional>
   */
  async getProfile(creds: AuthCredentials, userId?: string): Promise<UserResponseDto> {
    const caller = await authenticateMockUser(creds);
    const db = await getDb();
    const targetId = userId || caller.id;
    const found = db.users.find((u) => u.id === targetId);
    if (!found) {
      throw new ApiError(`User with id '${targetId}' not found`, 404);
    }
    return {
      id: found.id,
      name: found.name,
      bio: found.bio ?? null,
    };
  },

  /**
   * GET /user
   */
  async getAllUsers(creds: AuthCredentials): Promise<UserResponseDto[]> {
    await authenticateMockUser(creds);
    const db = await getDb();
    return [...db.users]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((u) => ({
        id: u.id,
        name: u.name,
        bio: u.bio ?? null,
      }));
  },

  /**
   * GET /conversation
   */
  async getConversations(creds: AuthCredentials): Promise<ConversationResponseDto[]> {
    const caller = await authenticateMockUser(creds);
    const db = await getDb();
    return db.conversations
      .filter((c) => c.participants_ids.includes(caller.id))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  /**
   * POST /conversation
   * Exact port of backend/src/conversation/conversation.service.ts
   */
  async createConversation(
    creds: AuthCredentials,
    dto: CreateConversationDto,
  ): Promise<ConversationResponseDto> {
    const caller = await authenticateMockUser(creds);
    const db = await getDb();

    const participantIds = new Set<string>();
    if (dto.participants_ids) {
      for (const id of dto.participants_ids) participantIds.add(id);
    }
    participantIds.delete(caller.id);

    if (participantIds.size === 0) {
      throw new ApiError('At least one other participant is required', 400);
    }

    const participantsArray = Array.from(participantIds);
    const foundUsers = db.users.filter((u) => participantsArray.includes(u.id));
    if (foundUsers.length !== participantsArray.length) {
      throw new ApiError('One or more participant users not found', 404);
    }

    const type = dto.type ?? (participantsArray.length > 1 ? 'GROUP' : 'DM');

    if (type === 'DM' && participantsArray.length === 1) {
      const otherId = participantsArray[0];
      const existing = db.conversations.find(
        (c) =>
          c.type === 'DM' &&
          c.participants_ids.includes(caller.id) &&
          c.participants_ids.includes(otherId),
      );
      if (existing) {
        return existing;
      }
    }

    const allParticipantIds = [caller.id, ...participantsArray];
    let conversationName: string | null = dto.name ?? null;
    if (type === 'DM') {
      const otherUser = foundUsers.find((u) => u.id === participantsArray[0]);
      conversationName = `[DM] ${otherUser?.name ?? participantsArray[0]}`;
    }

    const created: ConversationResponseDto = {
      id: generateObjectId(),
      type,
      name: conversationName,
      createdAt: new Date().toISOString(),
      createdBy: caller.id,
      participants_ids: allParticipantIds,
    };

    db.conversations.unshift(created);
    await saveDb(db);
    return created;
  },

  /**
   * GET /message?conversation_id=<id>&from_message_cursor=<optional>
   * Exact port of backend/src/message/message.service.ts
   */
  async getMessages(
    creds: AuthCredentials,
    conversationId: string,
    fromMessageCursor?: string,
  ): Promise<PaginatedMessagesResponseDto> {
    const caller = await authenticateMockUser(creds);
    const db = await getDb();

    // Sort descending by createdAt (newest first), matching Prisma orderBy: { createdAt: 'desc' }
    const allDesc = db.messages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    let startIndex = 0;
    if (fromMessageCursor) {
      const cursorIdx = allDesc.findIndex((m) => m.id === fromMessageCursor);
      if (cursorIdx === -1) {
        throw new ApiError(`Cursor message '${fromMessageCursor}' not found`, 404);
      }
      startIndex = cursorIdx + 1; // skip: 1
    }

    const pageDesc = allDesc.slice(startIndex, startIndex + PAGE_SIZE);

    // Mark messages as delivered & read for the caller
    let mutated = false;
    for (const msg of pageDesc) {
      if (msg.senderId !== caller.id) {
        const st = msg.status[caller.id];
        if (!st || !st.delivered || !st.read) {
          msg.status[caller.id] = { delivered: true, read: true };
          mutated = true;
        }
      }
    }
    if (mutated) {
      await saveDb(db);
    }

    const sortedOldestFirst = [...pageDesc].reverse();

    return {
      data: sortedOldestFirst,
      nextCursor: pageDesc.length === PAGE_SIZE ? pageDesc[pageDesc.length - 1].id : null,
      count: sortedOldestFirst.length,
    };
  },

  /**
   * POST /message
   * Exact port of backend/src/message/message.service.ts
   */
  async createMessage(
    creds: AuthCredentials,
    dto: CreateMessageDto,
  ): Promise<MessageResponseDto> {
    const caller = await authenticateMockUser(creds);
    if (!dto.content && !dto.imageInfo) {
      throw new ApiError('Message must contain content or imageInfo', 400);
    }

    const db = await getDb();
    const conversation = db.conversations.find((c) => c.id === dto.conversation_id);
    if (!conversation) {
      throw new ApiError(`Conversation '${dto.conversation_id}' not found`, 404);
    }

    let normalizedImageInfo: string | null = null;
    if (dto.imageInfo) {
      normalizedImageInfo = dto.imageInfo.startsWith('data:')
        ? dto.imageInfo
        : `data:image/jpeg;base64,${dto.imageInfo}`;
    }

    const defaultStatus: Record<string, { delivered: boolean; read: boolean }> = {};
    for (const participantId of conversation.participants_ids) {
      defaultStatus[participantId] =
        participantId === caller.id
          ? { delivered: true, read: true }
          : { delivered: false, read: false };
    }

    const message: MessageResponseDto = {
      id: generateObjectId(),
      content: dto.content ?? null,
      imageInfo: normalizedImageInfo,
      createdAt: new Date().toISOString(),
      senderId: caller.id,
      conversationId: dto.conversation_id,
      status: defaultStatus,
    };

    db.messages.push(message);
    await saveDb(db);
    return message;
  },

  /**
   * Simulates a single tick of backend/src/bot/bot.service.ts (`FactBot`)
   */
  async triggerFactBotTick(creds: AuthCredentials): Promise<MessageResponseDto | null> {
    const caller = await authenticateMockUser(creds);
    const db = await getDb();

    let botConv = db.conversations.find(
      (c) =>
        c.type === 'DM' &&
        c.participants_ids.includes(BOT_ID) &&
        c.participants_ids.includes(caller.id),
    );

    if (!botConv) {
      botConv = {
        id: generateObjectId(),
        name: '[DM] FactBot',
        type: 'DM',
        createdAt: new Date().toISOString(),
        createdBy: BOT_ID,
        participants_ids: [BOT_ID, caller.id],
      };
      db.conversations.unshift(botConv);
    }

    const fact = MOCK_FACTS[db.factIndex % MOCK_FACTS.length];
    db.factIndex = (db.factIndex + 1) % MOCK_FACTS.length;

    const msg: MessageResponseDto = {
      id: generateObjectId(),
      content: fact,
      imageInfo: null,
      createdAt: new Date().toISOString(),
      senderId: BOT_ID,
      conversationId: botConv.id,
      status: {
        [BOT_ID]: { delivered: true, read: true },
        [caller.id]: { delivered: false, read: false },
      },
    };

    db.messages.push(msg);
    await saveDb(db);
    return msg;
  },
};

