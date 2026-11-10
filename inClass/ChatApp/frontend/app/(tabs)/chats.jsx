/**
 * Chats tab (buildPlan.md 5.2, V6): a notch with a greeting and the unread
 * summary, a "recently active" rail of faces, the group carousel, then direct
 * chats with last message, time and unread badge, ordered by activity.
 * Connection changes show in the notch island (V7), not a banner.
 * Pull to refresh, polling, skeletons on first load and an empty state with a
 * shortcut to People. When a new message moves a row to the top it glides
 * there (a calm layout transition) instead of jumping.
 */
import MessageCircle from 'lucide-react-native/icons/message-circle';
import WifiOff from 'lucide-react-native/icons/wifi-off';
import { router } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { ActiveRail } from '../../src/components/chats/ActiveRail';
import { ChatsHeader } from '../../src/components/chats/ChatsHeader';
import { ChatsSkeleton } from '../../src/components/chats/ChatsSkeleton';
import { DmRow } from '../../src/components/chats/DmRow';
import { GroupCarousel } from '../../src/components/chats/GroupCarousel';
import { MembersSheet } from '../../src/components/chats/MembersSheet';
import { TAB_BAR_CLEARANCE } from '../../src/components/navigation/FloatingTabBar';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { durations, EASE_IN_OUT } from '../../src/constants/motion';
import { gradient, space, type } from '../../src/constants/theme';
import { useChatsHome } from '../../src/hooks/useChatsHome';
import { useTheme } from '../../src/hooks/useTheme';
import { log } from '../../src/utils/logger';

/** Rows glide to their new place; built once at module scope. */
const ROW_MOVE = LinearTransition.duration(durations.indicator).easing(EASE_IN_OUT);

function openChat(id) {
  log.nav(`chats -> chat/${id}`);
  router.push(`/chat/${id}`);
}

export default function Chats() {
  const { colors } = useTheme();
  const chats = useChatsHome();
  const [membersOf, setMembersOf] = useState(null);
  const { groups, dms, faces, myName } = chats;
  const sheetGroup = groups.find((group) => group.id === membersOf);
  const isEmpty = chats.status === 'ready' && !groups.length && !dms.length;

  const label = (text) => (
    <Text style={[type.caption, styles.label, { color: colors.textTertiary }]}>{text}</Text>
  );

  function renderBody() {
    if (chats.status === 'loading' || chats.status === 'idle') return <ChatsSkeleton />;
    if (chats.status === 'error') {
      return (
        <EmptyState
          icon={WifiOff}
          title="can't load chats"
          message={chats.error}
          actionLabel="Try again"
          onAction={chats.refresh}
        />
      );
    }
    if (isEmpty) {
      return (
        <EmptyState
          icon={MessageCircle}
          title="no chats yet"
          message="Start a conversation with someone from your class."
          actionLabel="find people"
          onAction={() => router.navigate('/people')}
        />
      );
    }
    return (
      <>
        {faces.length ? (
          <View style={styles.section}>
            {label('recently active')}
            <ActiveRail faces={faces} onOpen={openChat} />
          </View>
        ) : null}
        {groups.length ? (
          <View style={styles.section}>
            {label('groups')}
            <GroupCarousel groups={groups} onOpen={openChat} onShowMembers={setMembersOf} />
          </View>
        ) : null}
      </>
    );
  }

  const hasList = chats.status === 'ready' && !isEmpty;

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface }]}>
      <ChatsHeader
        myName={myName}
        greeting={chats.greeting}
        summary={chats.summary}
        hasUnread={chats.hasUnread}
      />
      <Animated.FlatList
        data={hasList ? dms : []}
        itemLayoutAnimation={ROW_MOVE}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            {renderBody()}
            {hasList && dms.length ? label('direct') : null}
          </View>
        }
        renderItem={({ item }) => (
          // No entering on virtualized rows: recycled rows would replay it while scrolling.
          <View style={styles.row}>
            <DmRow
              name={item.name}
              preview={item.preview}
              time={item.time}
              unread={item.unread}
              onPress={() => openChat(item.id)}
            />
          </View>
        )}
        contentContainerStyle={{ paddingTop: space.md, paddingBottom: TAB_BAR_CLEARANCE }}
        refreshControl={
          <RefreshControl
            refreshing={chats.isRefreshing}
            onRefresh={chats.refresh}
            tintColor={gradient.colors[1]}
            colors={gradient.colors}
          />
        }
      />
      <MembersSheet
        visible={Boolean(sheetGroup)}
        onClose={() => setMembersOf(null)}
        title={sheetGroup?.title ?? ''}
        names={sheetGroup?.names ?? []}
        myName={myName}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  section: { gap: space.xs, marginBottom: space.md },
  label: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: space.lg,
    marginBottom: space.xs,
  },
  row: { paddingHorizontal: space.md, marginBottom: space.xs },
});
