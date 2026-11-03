import React, { useMemo, useState } from 'react';
import {
  FlatList,
  LayoutAnimation,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useChat } from '../../src/context/ChatContext';
import { Avatar } from '../../src/components/Avatar';
import { ConversationRow } from '../../src/components/ConversationRow';
import { ServerStatusBanner } from '../../src/components/ServerStatusBanner';
import { EmptyState } from '../../src/components/EmptyState';
import { ConversationListSkeleton } from '../../src/components/Skeleton';
import { isFactBotName, resolveConversationTitle } from '../../src/utils/format';

type FilterTab = 'ALL' | 'UNREAD' | 'PINNED' | 'DM' | 'GROUP' | 'BOT';

export default function ConversationsListScreen() {
  const router = useRouter();
  const { currentUser, mode } = useAuth();
  const {
    users,
    conversations,
    usersById,
    lastMessageByConvId,
    pinnedConvIds,
    mutedConvIds,
    isLoadingConversations,
    globalError,
    refreshAll,
    startOrGetDm,
    togglePinConversation,
    toggleMuteConversation,
  } = useChat();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');

  const quickContacts = useMemo(
    () => users.filter((u) => u.id !== currentUser?.id).slice(0, 12),
    [currentUser?.id, users],
  );

  // Calculate live metrics for the executive overview pills
  const unreadCount = useMemo(() => {
    if (!currentUser?.id) return 0;
    return conversations.filter((conv) => {
      const last = lastMessageByConvId[conv.id];
      return (
        last &&
        last.senderId !== currentUser.id &&
        last.status?.[currentUser.id]?.read === false
      );
    }).length;
  }, [conversations, currentUser?.id, lastMessageByConvId]);

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = conversations.filter((conv) => {
      const title = resolveConversationTitle(conv, currentUser?.id, usersById);
      const isBot = isFactBotName(title);
      const lastMsgObj = lastMessageByConvId[conv.id];
      const isUnread = Boolean(
        lastMsgObj &&
          currentUser?.id &&
          lastMsgObj.senderId !== currentUser.id &&
          lastMsgObj.status?.[currentUser.id]?.read === false,
      );
      const isPinned = pinnedConvIds.includes(conv.id);

      if (activeFilter === 'UNREAD' && !isUnread) return false;
      if (activeFilter === 'PINNED' && !isPinned) return false;
      if (activeFilter === 'DM' && conv.type !== 'DM') return false;
      if (activeFilter === 'GROUP' && conv.type !== 'GROUP') return false;
      if (activeFilter === 'BOT' && !isBot) return false;

      if (!q) return true;
      const lastMsg = lastMsgObj?.content?.toLowerCase() ?? '';
      return (
        title.toLowerCase().includes(q) ||
        conv.id.toLowerCase().includes(q) ||
        lastMsg.includes(q)
      );
    });

    // Sort Pinned conversations to the top, then by latest message timestamp
    return [...list].sort((a, b) => {
      const aPin = pinnedConvIds.includes(a.id) ? 1 : 0;
      const bPin = pinnedConvIds.includes(b.id) ? 1 : 0;
      if (aPin !== bPin) return bPin - aPin;

      const aTime = new Date(
        lastMessageByConvId[a.id]?.createdAt ?? a.createdAt,
      ).getTime();
      const bTime = new Date(
        lastMessageByConvId[b.id]?.createdAt ?? b.createdAt,
      ).getTime();
      return bTime - aTime;
    });
  }, [
    activeFilter,
    conversations,
    currentUser?.id,
    lastMessageByConvId,
    pinnedConvIds,
    searchQuery,
    usersById,
  ]);

  const handleSelectFilter = (tab: FilterTab) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveFilter(tab);
  };

  const handleQuickChatUser = async (userId: string) => {
    try {
      const conv = await startOrGetDm(userId);
      router.push(`/chat/${conv.id}`);
    } catch {
      router.push('/(tabs)/users');
    }
  };

  const showSkeleton = isLoadingConversations && conversations.length === 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ServerStatusBanner />

      {/* Editorial Luxury Header */}
      <View style={styles.header}>
        <View style={styles.headerLeftCol}>
          <View style={styles.workspaceTagRow}>
            <View
              style={[
                styles.livePulseDot,
                {
                  backgroundColor:
                    mode === 'live' ? COLORS.success : COLORS.warning,
                },
              ]}
            />
            <Text style={styles.headerGreeting}>
              {currentUser?.name?.split('@')[0] ?? 'Workspace'} ·{' '}
              {mode === 'live' ? 'Encrypted Cloud' : 'Simulator'}
            </Text>
          </View>
          <View style={styles.titleCounterRow}>
            <Text style={styles.headerTitle}>Messages</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadTotalBadge}>
                <Text style={styles.unreadTotalBadgeText}>
                  {unreadCount} new
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push('/modal/new-group')}
            activeOpacity={0.7}
          >
            <Ionicons name="people-outline" size={19} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconBtn, styles.iconBtnPrimary]}
            onPress={() => router.push('/(tabs)/users')}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={19} color={COLORS.textInverse} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search & Segmented Filter Pills */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={17} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search conversations, people, or messages..."
            placeholderTextColor={COLORS.textMuted}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={17} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {(
            [
              { key: 'ALL', label: 'All', count: conversations.length, icon: 'layers-outline' },
              { key: 'UNREAD', label: 'Unread', count: unreadCount, icon: 'mail-unread-outline' },
              { key: 'PINNED', label: 'Pinned', count: pinnedConvIds.length, icon: 'pin-outline' },
              { key: 'DM', label: 'Direct', icon: 'person-outline' },
              { key: 'GROUP', label: 'Groups', icon: 'people-outline' },
              { key: 'BOT', label: 'AI Bot', icon: 'sparkles-outline' },
            ] as {
              key: FilterTab;
              label: string;
              count?: number;
              icon: keyof typeof Ionicons.glyphMap;
            }[]
          ).map((tab) => {
            const active = activeFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => handleSelectFilter(tab.key)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={tab.icon}
                  size={13}
                  color={active ? COLORS.textInverse : COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.filterChipText,
                    active && styles.filterChipTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <View
                    style={[
                      styles.filterCountPill,
                      active && styles.filterCountPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterCountText,
                        active && styles.filterCountTextActive,
                      ]}
                    >
                      {tab.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {globalError && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={15} color={COLORS.danger} />
          <Text style={styles.errorBannerText} numberOfLines={2}>
            {globalError}
          </Text>
        </View>
      )}

      {showSkeleton ? (
        <ConversationListSkeleton count={6} />
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isLoadingConversations}
              onRefresh={refreshAll}
              tintColor={COLORS.textSecondary}
            />
          }
          ListHeaderComponent={
            quickContacts.length > 0 && !searchQuery ? (
              <View style={styles.quickStripSection}>
                <View style={styles.quickStripHeaderRow}>
                  <Text style={styles.quickStripTitle}>Active Directory</Text>
                  <Text style={styles.swipeHintText}>
                    Swipe right to pin · left to mute
                  </Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.quickStripScroll}
                >
                  <TouchableOpacity
                    style={styles.quickAvatarItem}
                    onPress={() => router.push('/modal/new-group')}
                    activeOpacity={0.75}
                  >
                    <View style={styles.newGroupCircle}>
                      <Ionicons name="add" size={22} color={COLORS.textPrimary} />
                    </View>
                    <Text style={styles.quickAvatarName} numberOfLines={1}>
                      New Group
                    </Text>
                  </TouchableOpacity>

                  {quickContacts.map((person) => {
                    const isBot = isFactBotName(person.name);
                    return (
                      <TouchableOpacity
                        key={person.id}
                        style={styles.quickAvatarItem}
                        onPress={() => handleQuickChatUser(person.id)}
                        activeOpacity={0.75}
                      >
                        <View
                          style={[
                            styles.quickAvatarRing,
                            isBot && styles.quickAvatarRingBot,
                          ]}
                        >
                          <Avatar name={person.name} size={46} />
                          <View
                            style={[
                              styles.quickOnlineDot,
                              {
                                backgroundColor: isBot
                                  ? COLORS.accentLight
                                  : COLORS.success,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.quickAvatarName} numberOfLines={1}>
                          {person.name.split('@')[0]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : undefined
          }
          renderItem={({ item }) => (
            <ConversationRow
              conversation={item}
              currentUserId={currentUser?.id}
              usersById={usersById}
              lastMessage={lastMessageByConvId[item.id]}
              isPinned={pinnedConvIds.includes(item.id)}
              isMuted={mutedConvIds.includes(item.id)}
              onPress={() => router.push(`/chat/${item.id}`)}
              onTogglePin={() => togglePinConversation(item.id)}
              onToggleMute={() => toggleMuteConversation(item.id)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              iconName="chatbubbles-outline"
              title={
                activeFilter === 'PINNED'
                  ? 'No pinned conversations'
                  : activeFilter === 'UNREAD'
                    ? 'All caught up'
                    : 'No conversations yet'
              }
              subtitle={
                activeFilter === 'PINNED'
                  ? 'Swipe right on any conversation card in your inbox to pin it to the top.'
                  : activeFilter === 'UNREAD'
                    ? 'You have read all incoming messages across your workspace.'
                    : 'Tap any classmate in the Active Directory bar above or browse the full directory.'
              }
              actionLabel={
                activeFilter !== 'ALL' ? 'Show All Chats' : 'Browse Directory'
              }
              onAction={() => {
                if (activeFilter !== 'ALL') {
                  handleSelectFilter('ALL');
                } else {
                  router.push('/(tabs)/users');
                }
              }}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating New Chat Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(tabs)/users')}
        activeOpacity={0.85}
      >
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={22}
          color={COLORS.textInverse}
        />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.bgPrimary,
  },
  headerLeftCol: {
    flex: 1,
  },
  workspaceTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  headerGreeting: {
    color: COLORS.accentLight,
    fontSize: 11.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  titleCounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  unreadTotalBadge: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  unreadTotalBadgeText: {
    color: COLORS.textInverse,
    fontSize: 11,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  iconBtnPrimary: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  searchSection: {
    paddingBottom: SPACING.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgSecondary,
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.lg,
    paddingHorizontal: 14,
    height: 44,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    paddingVertical: 0,
  },
  filterRow: {
    paddingHorizontal: SPACING.lg,
    gap: 8,
    paddingTop: 12,
    paddingBottom: 4,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgTertiary,
  },
  filterChipActive: {
    backgroundColor: COLORS.accent,
  },
  filterChipText: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: COLORS.textInverse,
  },
  filterCountPill: {
    backgroundColor: COLORS.bgSecondary,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.full,
  },
  filterCountPillActive: {
    backgroundColor: 'rgba(250, 248, 245, 0.2)',
  },
  filterCountText: {
    color: COLORS.textPrimary,
    fontSize: 10.5,
    fontWeight: '700',
  },
  filterCountTextActive: {
    color: COLORS.textInverse,
  },
  quickStripSection: {
    marginBottom: SPACING.md,
    paddingTop: 4,
  },
  quickStripHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    marginBottom: 10,
  },
  quickStripTitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  swipeHintText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  quickStripScroll: {
    paddingHorizontal: SPACING.lg,
    gap: 14,
  },
  quickAvatarItem: {
    alignItems: 'center',
    width: 62,
  },
  newGroupCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1.2,
    borderStyle: 'dashed',
    borderColor: COLORS.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAvatarRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    padding: 2,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  quickAvatarRingBot: {
    borderColor: COLORS.accentLight,
  },
  quickOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.bgPrimary,
  },
  quickAvatarName: {
    color: COLORS.textPrimary,
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.dangerSoft,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    marginBottom: SPACING.sm,
  },
  errorBannerText: {
    color: COLORS.danger,
    fontSize: 12.5,
    flex: 1,
  },
  listContent: {
    paddingBottom: 96,
  },
  fab: {
    position: 'absolute',
    right: SPACING.xl,
    bottom: SPACING.xl,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.floating,
  },
});
