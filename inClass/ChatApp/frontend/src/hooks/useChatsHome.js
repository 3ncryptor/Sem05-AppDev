/**
 * useChatsHome: everything the Chats home shows (V6), built from the chat
 * list (useConversations) and what the inbox checker knows (last message,
 * unread). Display-ready rows, ordered by activity, newest first.
 */
import { greeting, unreadSummary, activeFaces, byActivity } from '../inbox/homeSummary';
import { messagePreview, totalUnread } from '../inbox/inboxLogic';
import { inboxStore } from '../inbox/inboxStore';
import { conversationTitle, memberNames } from '../utils/conversationTitle';
import { formatChatTime } from '../utils/format';
import { useConversations } from './useConversations';
import { useNow } from './useNow';
import { useStore } from './useStore';

const RAIL_LIMIT = 10;
/** Times like "9:41 am" and "yesterday" only need a refresh each minute. */
const CLOCK_TICK_MS = 60000;

function senderLabel(message, myId, usersById) {
  if (!message) return '';
  if (message.senderId === myId) return 'you';
  return usersById[message.senderId]?.name ?? 'someone';
}

export function useChatsHome() {
  const chats = useConversations();
  const byChat = useStore(inboxStore, (state) => state.byChat);
  const now = useNow(CLOCK_TICK_MS);
  const { myId, usersById } = chats;

  const info = (id) => {
    const entry = byChat[id];
    const latest = entry?.latest ?? null;
    return {
      latest,
      unread: entry?.unread ?? 0,
      time: latest ? formatChatTime(latest.createdAt, now) : '',
      lastAt: latest ? Date.parse(latest.createdAt) || 0 : 0,
    };
  };

  const dms = byActivity(chats.dms, byChat).map((dm) => {
    const { latest, unread, time, lastAt } = info(dm.id);
    const mine = latest?.senderId === myId;
    const text = messagePreview(latest);
    return {
      id: dm.id,
      name: conversationTitle(dm, myId, usersById),
      preview: text && mine ? `you: ${text}` : text,
      time,
      unread,
      lastAt,
    };
  });

  const groups = byActivity(chats.groups, byChat).map((group) => {
    const { latest, unread } = info(group.id);
    const text = messagePreview(latest);
    return {
      id: group.id,
      title: conversationTitle(group, myId, usersById),
      names: memberNames(group, myId, usersById),
      preview: text ? `${senderLabel(latest, myId, usersById)}: ${text}` : '',
      unread,
    };
  });

  const total = totalUnread(byChat);
  return {
    ...chats,
    dms,
    groups,
    faces: activeFaces(dms, RAIL_LIMIT),
    myName: usersById[myId]?.name ?? '',
    greeting: greeting(new Date(now).getHours()),
    summary: unreadSummary(total),
    hasUnread: total.messages > 0,
  };
}
