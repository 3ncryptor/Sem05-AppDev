/**
 * Chats tab (buildPlan.md 5.2): group carousel on top, direct chats below,
 * pull to refresh, polling every 5 s, a connection banner, skeletons on
 * first load and an empty state with a shortcut to People.
 */
import MessageCircle from 'lucide-react-native/icons/message-circle';
import WifiOff from 'lucide-react-native/icons/wifi-off';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChatsHeader } from '../../src/components/chats/ChatsHeader';
import { ChatsSkeleton } from '../../src/components/chats/ChatsSkeleton';
import { DmRow } from '../../src/components/chats/DmRow';
import { GroupCarousel } from '../../src/components/chats/GroupCarousel';
import { MembersSheet } from '../../src/components/chats/MembersSheet';
import { TAB_BAR_CLEARANCE } from '../../src/components/navigation/FloatingTabBar';
import { ConnectionBanner } from '../../src/components/ui/ConnectionBanner';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { STAGGER_MS } from '../../src/constants/motion';
import { gradient, space, type } from '../../src/constants/theme';
import { useConversations } from '../../src/hooks/useConversations';
import { useTheme } from '../../src/hooks/useTheme';
import { conversationTitle, memberNames } from '../../src/utils/conversationTitle';
import { log } from '../../src/utils/logger';

function openChat(id) {
  log.nav(`chats -> chat/${id}`);
  router.push(`/chat/${id}`);
}

export default function Chats() {
  const { colors } = useTheme();
  const chats = useConversations();
  const [membersOf, setMembersOf] = useState(null);
  const myName = chats.usersById[chats.myId]?.name ?? '';

  const groups = chats.groups.map((group) => ({
    id: group.id,
    title: conversationTitle(group, chats.myId, chats.usersById),
    names: memberNames(group, chats.myId, chats.usersById),
  }));
  const dms = chats.dms.map((dm) => ({
    id: dm.id,
    name: conversationTitle(dm, chats.myId, chats.usersById),
  }));
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
    return groups.length ? (
      <View style={styles.section}>
        {label('groups')}
        <GroupCarousel groups={groups} onOpen={openChat} onShowMembers={setMembersOf} />
      </View>
    ) : null;
  }

  const hasList = chats.status === 'ready' && !isEmpty;

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface }]}>
      <ChatsHeader myName={myName} />
      <ConnectionBanner state={chats.connection} />
      <FlatList
        data={hasList ? dms : []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            {renderBody()}
            {hasList && dms.length ? label('direct') : null}
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * STAGGER_MS)} style={styles.row}>
            <DmRow name={item.name} onPress={() => openChat(item.id)} />
          </Animated.View>
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
