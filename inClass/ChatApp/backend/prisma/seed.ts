/**
 * Seeds demo users, conversations and messages for local testing.
 *
 *   docker exec chatapp_api npm run seed
 *
 * Safe to run repeatedly: existing users and conversations are reused,
 * and messages are only added to conversations that have none yet.
 */
import { PrismaClient } from '@prisma/client';

const DEMO_PASSWORD = 'demo123';
const DEMO_USERS = ['aarav', 'diya', 'kabir', 'meera', 'rohan'];
const MINUTES_BETWEEN_MESSAGES = 3;
const MS_PER_MINUTE = 60 * 1000;

// 1x1 PNG so image messages can be tested without real photos
const PIXEL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

type SeedMessage = { from: string; text?: string; image?: string };

interface SeedConversation {
  type: 'DM' | 'GROUP';
  name: string | null;
  members: string[];
  messages: SeedMessage[];
}

const CONVERSATIONS: SeedConversation[] = [
  {
    type: 'DM',
    name: null,
    members: ['aarav', 'diya'],
    messages: [
      { from: 'aarav', text: 'Hey Diya, did you finish the Expo assignment?' },
      { from: 'diya', text: 'Almost. Stuck on the navigation part' },
      { from: 'aarav', text: 'The Expo Router docs helped me a lot' },
      { from: 'diya', text: 'Thanks, will check them tonight' },
    ],
  },
  {
    type: 'DM',
    name: null,
    members: ['aarav', 'kabir'],
    messages: [
      { from: 'kabir', text: 'Are we meeting in the lab tomorrow?' },
      { from: 'aarav', text: 'Yes, 10 am' },
    ],
  },
  {
    type: 'DM',
    name: null,
    members: ['diya', 'meera'],
    messages: [
      { from: 'meera', text: 'Can you share the notes from today?' },
      { from: 'diya', text: 'Sure, sending them in a bit' },
    ],
  },
  {
    type: 'GROUP',
    name: 'Study Group',
    members: ['aarav', 'diya', 'kabir', 'meera'],
    messages: [
      { from: 'meera', text: 'Welcome to the study group!' },
      { from: 'kabir', text: 'Here is the whiteboard from today', image: 'whiteboard.png' },
      { from: 'aarav', text: 'Quiz is on Friday, right?' },
      { from: 'diya', text: 'Yes, chapters 3 and 4' },
      { from: 'meera', text: 'Let us revise together on Thursday' },
    ],
  },
];

const prisma = new PrismaClient();

async function ensureUser(name: string): Promise<string> {
  const existing = await prisma.user.findUnique({ where: { name } });
  if (existing) {
    if (existing.phone !== DEMO_PASSWORD) {
      console.warn(`  ! ${name} already exists with a different password; left unchanged`);
    }
    return existing.id;
  }
  const user = await prisma.user.create({
    data: { name, phone: DEMO_PASSWORD, conversationIds: [] },
  });
  return user.id;
}

async function ensureConversation(seed: SeedConversation, ids: string[]): Promise<string> {
  const existing = await prisma.conversation.findFirst({
    where: {
      type: seed.type,
      participants_ids: { hasEvery: ids },
      ...(seed.type === 'GROUP' ? { name: seed.name } : {}),
    },
  });
  if (existing) return existing.id;

  const conversation = await prisma.conversation.create({
    data: { type: seed.type, name: seed.name, createdBy: ids[0], participants_ids: ids },
  });
  await prisma.user.updateMany({
    where: { id: { in: ids } },
    data: { conversationIds: { push: conversation.id } },
  });
  return conversation.id;
}

/** Everyone has read every message except the last one in each conversation. */
function buildStatus(memberIds: string[], senderId: string, isLast: boolean) {
  const status: Record<string, { delivered: boolean; read: boolean }> = {};
  for (const id of memberIds) {
    const isSender = id === senderId;
    status[id] = { delivered: true, read: isSender || !isLast };
  }
  return status;
}

async function uploadImage(fileName: string, uploaderId: string): Promise<string> {
  const bytes = Buffer.from(PIXEL_PNG_BASE64, 'base64');
  const file = await prisma.file.create({
    data: {
      name: fileName,
      mimeType: 'image/png',
      size: bytes.length,
      kind: 'IMAGE',
      data: new Uint8Array(bytes),
      uploadedBy: uploaderId,
    },
  });
  return file.id;
}

async function seedMessages(
  seed: SeedConversation,
  conversationId: string,
  idsByName: Map<string, string>,
): Promise<number> {
  const alreadySeeded = await prisma.message.count({ where: { conversationId } });
  if (alreadySeeded > 0) return 0;

  const memberIds = seed.members.map((m) => idsByName.get(m));
  const start = Date.now() - seed.messages.length * MINUTES_BETWEEN_MESSAGES * MS_PER_MINUTE;

  for (const [index, message] of seed.messages.entries()) {
    const senderId = idsByName.get(message.from);
    const fileId = message.image ? await uploadImage(message.image, senderId) : null;
    await prisma.message.create({
      data: {
        content: message.text ?? '',
        type: fileId ? 'IMAGE' : 'TEXT',
        fileId,
        senderId,
        conversationId,
        createdAt: new Date(start + index * MINUTES_BETWEEN_MESSAGES * MS_PER_MINUTE),
        status: buildStatus(memberIds, senderId, index === seed.messages.length - 1),
      },
    });
  }
  return seed.messages.length;
}

async function main() {
  const idsByName = new Map<string, string>();
  for (const name of DEMO_USERS) {
    idsByName.set(name, await ensureUser(name));
  }

  let messageCount = 0;
  for (const seed of CONVERSATIONS) {
    const ids = seed.members.map((m) => idsByName.get(m));
    const conversationId = await ensureConversation(seed, ids);
    messageCount += await seedMessages(seed, conversationId, idsByName);
  }

  console.log(`Seeded ${DEMO_USERS.length} users, ${CONVERSATIONS.length} conversations, ${messageCount} new messages`);
  console.log(`Log in as any of: ${DEMO_USERS.join(', ')}  (password: ${DEMO_PASSWORD})`);
  console.log('rohan has no chats yet, so you can test starting a new conversation.');
}

main()
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
