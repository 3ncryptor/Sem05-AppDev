/**
 * islandEvents: one named call per moment the island reacts to (V7), so
 * screens stay one line: `islandCopied()`, `islandPhotoDone(true)`.
 * Haptics fire here, on the same beat as the visual, once per action.
 */
import { AccessibilityInfo } from 'react-native';
import { haptics } from '../utils/haptics';
import { confirmIsland, dismissActivity, showActivity } from './islandStore';

const COPIED_MS = 1200;
const RESTORED_MS = 1500;
const NEW_CHAT_MS = 6000;
const UPLOAD_KEY = 'upload';

export function islandCopied() {
  showActivity({ key: 'copied', kind: 'copied', title: 'copied' }, { ttlMs: COPIED_MS });
}

/** @param {string} chatId so a tap on "sending photo" opens that chat */
export function islandPhotoStarted(chatId) {
  showActivity({ key: UPLOAD_KEY, kind: 'upload', title: 'sending photo', chatId });
}

/** @param {boolean} isOk */
export function islandPhotoDone(isOk) {
  dismissActivity(UPLOAD_KEY);
  if (isOk) {
    haptics.success();
    confirmIsland({ title: 'photo sent', icon: 'image' });
  }
}

/**
 * Messages in this chat that failed to send; 0 clears it.
 * @param {string} chatId
 * @param {number} count
 * @param {() => void} onRetry
 */
export function islandFailed(chatId, count, onRetry) {
  const key = `failed:${chatId}`;
  if (!count) {
    dismissActivity(key);
    return;
  }
  haptics.error();
  showActivity({
    key,
    kind: 'failed',
    tone: 'danger',
    title: `${count} not sent`,
    detail: 'tap to retry',
    onPress: onRetry,
  });
}

/** @param {'online' | 'reconnecting' | 'restored'} state */
export function islandConnection(state) {
  if (state === 'reconnecting') {
    showActivity({ key: 'connection', kind: 'connection', tone: 'warn', title: 'reconnecting' });
  } else if (state === 'restored') {
    showActivity(
      { key: 'connection', kind: 'connection', tone: 'success', title: 'back online' },
      { ttlMs: RESTORED_MS },
    );
  } else {
    dismissActivity('connection');
  }
}

/**
 * @param {object} news
 * @param {string} news.chatId
 * @param {string} news.title who it is from, or the group name
 * @param {string} news.sender
 * @param {string} news.preview
 * @param {number} news.count new messages in this batch
 * @param {boolean} news.isGroup
 * @param {number} [news.previousCount] already waiting in the island
 */
export function islandMessage({
  chatId,
  title,
  sender,
  preview,
  count,
  isGroup,
  previousCount = 0,
}) {
  const total = previousCount + count;
  haptics.tap();
  showActivity({
    key: `msg:${chatId}`,
    kind: 'message',
    chatId,
    title,
    sender,
    isGroup,
    preview,
    count: total,
    detail: `${total} new`,
    autoExpand: true,
  });
  AccessibilityInfo.announceForAccessibility?.(
    `New message from ${isGroup ? `${sender} in ${title}` : title}: ${preview}`,
  );
}

/** @param {{ chatId: string, title: string, by: string }} chat */
export function islandNewChat({ chatId, title, by }) {
  showActivity(
    {
      key: `new:${chatId}`,
      kind: 'newChat',
      chatId,
      title,
      detail: by ? `${by} added you` : 'new chat',
    },
    { ttlMs: NEW_CHAT_MS },
  );
}

/** @param {string} name */
export function islandSignedIn(name) {
  confirmIsland({ title: `hi ${name}`, name, icon: 'face' });
}

/** @param {string} name */
export function islandGroupCreated(name) {
  confirmIsland({ title: 'group created', detail: name, icon: 'group' });
}
