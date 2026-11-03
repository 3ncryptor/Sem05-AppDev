import { COLORS } from '../constants/theme';
import { ConversationResponseDto, UserResponseDto } from '../types/api';

/**
 * Deterministic djb2 hash — identical to backend/src/common/color.util.ts!
 * Always produces the exact same index for the same username.
 */
export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash >>> 0);
}

/**
 * Returns a deterministic high-contrast hex color for any username or title.
 */
export function getUserColor(name?: string | null): string {
  if (!name) return COLORS.accent;
  const idx = hashString(name) % COLORS.userPalette.length;
  return COLORS.userPalette[idx];
}

/**
 * Extracts 1-2 uppercase initials from a display name or email.
 */
export function getInitials(name?: string | null): string {
  if (!name) return '?';
  const cleaned = name.replace(/^\[DM\]\s*/i, '').trim();
  if (!cleaned) return '?';

  // If it's an email like aryan.vibhuti2024@nst..., split on '.' or '@'
  if (cleaned.includes('@')) {
    const localPart = cleaned.split('@')[0];
    const parts = localPart.split(/[._-]/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return localPart.slice(0, 2).toUpperCase();
  }

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
}

/**
 * Resolves the human-readable title of a Conversation from the caller's perspective.
 *
 * Why this matters (see decisions.md D4):
 * In backend/src/conversation/conversation.service.ts:
 * When User A creates a DM with User B, the backend sets `conversation.name = "[DM] " + userB.name`.
 * If User B logs in, `conversation.name` would still say `"[DM] " + userB.name`!
 * By inspecting `participants_ids` and resolving the OTHER participant's ID from `usersById`,
 * both User A and User B always see the other person's name.
 */
export function resolveConversationTitle(
  conversation: ConversationResponseDto | null | undefined,
  currentUserId: string | undefined,
  usersById: Record<string, UserResponseDto>,
): string {
  if (!conversation) return 'Chat';

  if (conversation.type === 'GROUP') {
    if (conversation.name && conversation.name.trim().length > 0) {
      return conversation.name;
    }
    const names = conversation.participants_ids
      .map((id) => usersById[id]?.name)
      .filter(Boolean);
    return names.length > 0 ? names.join(', ') : 'Group Chat';
  }

  // DM conversation: find the other participant
  const otherId =
    conversation.participants_ids.find((id) => id !== currentUserId) ??
    conversation.participants_ids[0];

  if (otherId && usersById[otherId]?.name) {
    return usersById[otherId].name;
  }

  // Fallback to stripping "[DM] " from conversation.name
  if (conversation.name) {
    return conversation.name.replace(/^\[DM\]\s*/i, '').trim() || 'Direct Message';
  }

  return otherId ? `User ${otherId.slice(-6)}` : 'Direct Message';
}

/**
 * Returns the other participant's UserResponseDto in a DM conversation, if available.
 */
export function getDmRecipient(
  conversation: ConversationResponseDto | null | undefined,
  currentUserId: string | undefined,
  usersById: Record<string, UserResponseDto>,
): UserResponseDto | null {
  if (!conversation || conversation.type !== 'DM') return null;
  const otherId =
    conversation.participants_ids.find((id) => id !== currentUserId) ??
    conversation.participants_ids[0];
  return otherId ? usersById[otherId] ?? null : null;
}

/**
 * Checks whether a user or conversation is the automated FactBot.
 */
export function isFactBotName(name?: string | null): boolean {
  if (!name) return false;
  return name.toLowerCase().includes('factbot');
}

/**
 * Formats an ISO date string into a concise relative or clock timestamp.
 */
export function formatRelativeTime(isoString?: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 45) return 'Just now';

  const isSameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isSameDay) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return 'Yesterday';

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/**
 * Formats an ISO timestamp into HH:MM AM/PM for message bubbles.
 */
export function formatMessageTime(isoString?: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Pre-built crisp SVG/PNG Base64 Data URIs so users can test Base64 `imageInfo` messaging
 * on simulators or web even without picking a photo from the device gallery.
 */
export const SAMPLE_BASE64_IMAGES: {
  id: string;
  label: string;
  description: string;
  dataUri: string;
}[] = [
  {
    id: 'neon-grid',
    label: 'Architecture Blueprint',
    description: 'Indigo & Cyan Pixel Card (PNG Base64)',
    // Valid 16x16 Indigo/Cyan PNG encoded in Base64
    dataUri:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAbUlEQVR4nO3PQQrAIBBE0VlK739lT2EhpI2ZScB/8FbD7Mxs2w8Y67oH6A2MoA0MoA0MoA0MoA0MoA0MoA0MoA0MoA0MoA0MoA0MoA0MoA0MoA0MoA0MoA0MoA0MoA0MoA0MoA0MoA0MoA087g8F0W99pAAAAABJRU5ErkJggg==',
  },
  {
    id: 'emerald-pulse',
    label: 'Server Status Badge',
    description: 'Emerald Green Matrix Card (PNG Base64)',
    dataUri:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAa0lEQVR4nO3BMQEAAADCoPVPbQwfoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIC3AcUIAAFkqh/QAAAAAElFTkSuQmCC',
  },
];

