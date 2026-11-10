/**
 * IslandGlance: what you get by tapping (or pulling down) the resting island
 * (W1). A status card, not a notification:
 *
 *   ╭──────────────── [camera] ────────────────╮
 *   │ (o) 3 new in 2 chats                   > │   tap: the newest unread chat
 *   │ * class server · ok 24 ms · checked 3 s  │
 *   │ ( new group )  ( people )  ( inspector ) │
 *   ╰───────────────────────────────────────────╯
 *
 * Touching it keeps it open; it closes by itself a few seconds after.
 */
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { fonts } from '../../constants/theme';
import { logStore } from '../../debug/logStore';
import { networkStore } from '../../debug/networkStore';
import { unreadSummary } from '../../inbox/homeSummary';
import { totalUnread } from '../../inbox/inboxLogic';
import { inboxStore } from '../../inbox/inboxStore';
import { useNow } from '../../hooks/useNow';
import { useStore } from '../../hooks/useStore';
import { openChatFromIsland, runIslandIntent } from '../../island/islandActions';
import { closeGlance, holdGlance } from '../../island/islandStore';
import { sessionStore } from '../../store/sessionStore';
import { formatAgo } from '../../utils/format';
import { log } from '../../utils/logger';
import { Icon } from '../ui/Icon';
import { PressableScale } from '../ui/PressableScale';
import { island } from './islandTheme';

const TICK_MS = 1000;

function newestUnreadChat(byChat) {
  const unread = Object.entries(byChat).filter(([, entry]) => entry.unread > 0);
  if (!unread.length) return null;
  const at = ([, entry]) => Date.parse(entry.latest?.createdAt ?? '') || 0;
  return unread.reduce((newest, item) => (at(item) > at(newest) ? item : newest))[0];
}

function serverLine(baseUrl, lastRequest) {
  const host = baseUrl ? baseUrl.replace(/^https?:\/\//, '') : 'no server';
  if (!lastRequest) return { text: `${host} · waiting`, tone: island.muted };
  if (lastRequest.state === 'error') return { text: `${host} · unreachable`, tone: island.danger };
  return { text: `${host} · ok ${lastRequest.durationMs} ms`, tone: island.success };
}

function go(path) {
  closeGlance();
  log.nav(`island glance -> ${path}`);
  router.push(path);
}

/** @param {{ topGap: number }} props */
export function IslandGlance({ topGap }) {
  const now = useNow(TICK_MS);
  const byChat = useStore(inboxStore, (state) => state.byChat);
  const baseUrl = useStore(sessionStore, (state) => state.baseUrl);
  const lastAt = useStore(logStore, (state) => state.heartbeat.lastAt);
  const lastRequest = useStore(networkStore, (state) =>
    [...state.requests].reverse().find((row) => row.state !== 'pending'),
  );

  const total = totalUnread(byChat);
  const target = newestUnreadChat(byChat);
  const server = serverLine(baseUrl, lastRequest);
  const checked = lastAt ? ` · checked ${formatAgo(lastAt, now)}` : '';

  return (
    <View style={[styles.card, { paddingTop: topGap }]} onTouchStart={holdGlance}>
      <PressableScale
        onPress={() => (target ? openChatFromIsland(target) : go('/chats'))}
        accessibilityLabel={target ? `${unreadSummary(total)}, open the newest` : 'All caught up'}
      >
        <View style={styles.row}>
          <Icon
            as={MessageCircle}
            color={total.messages ? island.accent : island.muted}
            size={18}
          />
          <Text style={styles.title} numberOfLines={1}>
            {unreadSummary(total)}
          </Text>
          <Icon as={ChevronRight} color={island.muted} size={16} />
        </View>
      </PressableScale>
      <View style={styles.row} accessibilityLabel={`server ${server.text}${checked}`}>
        <View style={[styles.dot, { backgroundColor: server.tone }]} />
        <Text style={styles.meta} numberOfLines={1}>
          {server.text}
          {checked}
        </Text>
      </View>
      <View style={styles.actions}>
        <Shortcut label="new group" onPress={() => go('/new-group')} />
        <Shortcut label="people" onPress={() => go('/people')} />
        <Shortcut label="inspector" onPress={() => runIslandIntent('inspector', null)} />
      </View>
    </View>
  );
}

function Shortcut({ label, onPress }) {
  return (
    <PressableScale onPress={onPress} accessibilityLabel={label} style={styles.grow}>
      <View style={styles.shortcut}>
        <Text style={styles.shortcutText}>{label}</Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, paddingHorizontal: 16, paddingBottom: 14, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, color: island.text, fontFamily: fonts.semibold, fontSize: 15 },
  meta: { flex: 1, color: island.muted, fontFamily: fonts.regular, fontSize: 12 },
  dot: { width: 7, height: 7, borderRadius: 4, marginHorizontal: 5 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 'auto' },
  grow: { flex: 1 },
  shortcut: {
    height: 36,
    borderRadius: 18,
    backgroundColor: island.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutText: { color: island.text, fontFamily: fonts.medium, fontSize: 13 },
});
