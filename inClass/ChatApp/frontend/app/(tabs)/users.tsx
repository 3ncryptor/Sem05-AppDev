import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { ServerStatusBanner } from '../../src/components/ServerStatusBanner';
import { EmptyState } from '../../src/components/EmptyState';
import { ConversationListSkeleton } from '../../src/components/Skeleton';
import { UserResponseDto } from '../../src/types/api';
import { isFactBotName } from '../../src/utils/format';

export default function UserDirectoryScreen() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { users, isLoadingDirectory, refreshUsers, startOrGetDm } = useChat();

  const [searchQuery, setSearchQuery] = useState('');
  const [startingDmUserId, setStartingDmUserId] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        (u.bio && u.bio.toLowerCase().includes(q)),
    );
  }, [searchQuery, users]);

  const featuredUsers = useMemo(
    () =>
      users
        .filter((u) => u.id !== currentUser?.id)
        .slice(0, 6),
    [currentUser?.id, users],
  );

  const handleStartDm = async (targetUser: UserResponseDto) => {
    if (targetUser.id === currentUser?.id) {
      router.push(`/modal/user-profile?userId=${targetUser.id}`);
      return;
    }

    setErrorBanner(null);
    setStartingDmUserId(targetUser.id);
    try {
      const conv = await startOrGetDm(targetUser.id);
      router.push(`/chat/${conv.id}`);
    } catch (err: any) {
      setErrorBanner(err?.message || 'Failed to start conversation');
    } finally {
      setStartingDmUserId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ServerStatusBanner />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerSuper}>Workspace Network</Text>
          <Text style={styles.headerTitle}>Directory</Text>
        </View>
        <TouchableOpacity
          style={styles.newGroupBtn}
          onPress={() => router.push('/modal/new-group')}
          activeOpacity={0.8}
        >
          <Ionicons name="people-outline" size={16} color={COLORS.textInverse} />
          <Text style={styles.newGroupBtnText}>New Group</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBarWrapper}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={17} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search people by name, email, or bio..."
            placeholderTextColor={COLORS.textMuted}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={17} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {errorBanner && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={15} color={COLORS.danger} />
          <Text style={styles.errorText}>{errorBanner}</Text>
        </View>
      )}

      {isLoadingDirectory && users.length === 0 ? (
        <ConversationListSkeleton count={6} />
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isLoadingDirectory}
              onRefresh={() => {
                refreshUsers();
              }}
              tintColor={COLORS.textSecondary}
            />
          }
          ListHeaderComponent={
            featuredUsers.length > 0 && !searchQuery ? (
              <View style={styles.spotlightSection}>
                <View style={styles.spotlightHeaderRow}>
                  <Text style={styles.sectionTitle}>Instant Connect</Text>
                  <Text style={styles.sectionMeta}>{users.length} members</Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.spotlightScroll}
                >
                  {featuredUsers.map((person) => {
                    const isBot = isFactBotName(person.name);
                    return (
                      <TouchableOpacity
                        key={person.id}
                        style={styles.spotlightCard}
                        onPress={() => handleStartDm(person)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.spotlightAvatarWrap}>
                          <Avatar name={person.name} size={46} />
                          <View
                            style={[
                              styles.spotlightOnlineDot,
                              {
                                backgroundColor: isBot
                                  ? COLORS.accentLight
                                  : COLORS.success,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.spotlightName} numberOfLines={1}>
                          {person.name.split('@')[0]}
                        </Text>
                        <Text style={styles.spotlightRole} numberOfLines={1}>
                          {isBot ? 'AI Assistant' : person.bio || 'Member'}
                        </Text>
                        <View style={styles.spotlightActionPill}>
                          <Ionicons
                            name="paper-plane-outline"
                            size={11}
                            color={COLORS.textPrimary}
                          />
                          <Text style={styles.spotlightActionText}>Message</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <Text style={[styles.sectionTitle, styles.allMembersTitle]}>
                  All Members
                </Text>
              </View>
            ) : undefined
          }
          renderItem={({ item }) => {
            const isSelf = item.id === currentUser?.id;
            const isBot = isFactBotName(item.name);
            const isBusy = startingDmUserId === item.id;

            return (
              <TouchableOpacity
                style={styles.userCard}
                onPress={() => handleStartDm(item)}
                activeOpacity={0.75}
              >
                <View style={styles.avatarWrap}>
                  <Avatar name={item.name} size={48} />
                  <View
                    style={[
                      styles.onlineDot,
                      {
                        backgroundColor: isBot
                          ? COLORS.accentLight
                          : COLORS.success,
                      },
                    ]}
                  />
                </View>

                <View style={styles.userInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.userName} numberOfLines={1}>
                      {item.name.split('@')[0]}
                    </Text>
                    {isSelf && (
                      <View style={styles.tagPill}>
                        <Text style={styles.tagPillText}>You</Text>
                      </View>
                    )}
                    {isBot && (
                      <View style={styles.botPill}>
                        <Ionicons
                          name="sparkles"
                          size={10}
                          color={COLORS.accentLight}
                        />
                        <Text style={styles.botPillText}>AI Bot</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.userBio} numberOfLines={1}>
                    {item.bio || item.name}
                  </Text>
                </View>

                <View style={styles.actionsCol}>
                  <TouchableOpacity
                    style={styles.iconCircle}
                    onPress={() =>
                      router.push(`/modal/user-profile?userId=${item.id}`)
                    }
                  >
                    <Ionicons
                      name="person-outline"
                      size={16}
                      color={COLORS.textSecondary}
                    />
                  </TouchableOpacity>

                  {!isSelf && (
                    <View style={styles.chatIconCircle}>
                      {isBusy ? (
                        <ActivityIndicator
                          size="small"
                          color={COLORS.textInverse}
                        />
                      ) : (
                        <Ionicons
                          name="chatbubble-outline"
                          size={15}
                          color={COLORS.textInverse}
                        />
                      )}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              iconName="people-outline"
              title="No people found"
              subtitle="Try adjusting your search query or pull down to refresh."
              actionLabel="Refresh"
              onAction={() => {
                refreshUsers();
              }}
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  },
  headerSuper: {
    color: COLORS.accentLight,
    fontSize: 11.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 2,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  newGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    ...SHADOWS.card,
  },
  newGroupBtnText: {
    color: COLORS.textInverse,
    fontSize: 12.5,
    fontWeight: '600',
  },
  searchBarWrapper: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgSecondary,
    borderRadius: RADIUS.lg,
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.dangerSoft,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 8,
    marginBottom: SPACING.sm,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12.5,
  },
  spotlightSection: {
    marginBottom: SPACING.sm,
  },
  spotlightHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    marginBottom: 10,
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 11.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionMeta: {
    color: COLORS.textMuted,
    fontSize: 11.5,
    fontWeight: '500',
  },
  spotlightScroll: {
    paddingHorizontal: SPACING.lg,
    gap: 10,
    paddingBottom: SPACING.md,
  },
  spotlightCard: {
    width: 122,
    backgroundColor: COLORS.bgSecondary,
    borderRadius: RADIUS.lg,
    padding: 12,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  spotlightAvatarWrap: {
    position: 'relative',
    marginBottom: 8,
  },
  spotlightOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.bgSecondary,
  },
  spotlightName: {
    color: COLORS.textPrimary,
    fontSize: 13.5,
    fontWeight: '700',
  },
  spotlightRole: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
    marginBottom: 8,
  },
  spotlightActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.bgPrimary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderLight,
  },
  spotlightActionText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
  allMembersTitle: {
    paddingHorizontal: SPACING.lg,
    marginTop: 4,
    marginBottom: 8,
  },
  listContent: {
    paddingBottom: SPACING.xxxl,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: 9,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: COLORS.bgSecondary,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  avatarWrap: {
    position: 'relative',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.bgSecondary,
  },
  userInfo: {
    flex: 1,
    marginLeft: 14,
    marginRight: SPACING.sm,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  userName: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  tagPill: {
    marginLeft: 6,
    backgroundColor: COLORS.bgTertiary,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  tagPillText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  botPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 6,
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  botPillText: {
    color: COLORS.accentLight,
    fontSize: 10,
    fontWeight: '700',
  },
  userBio: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
  },
  actionsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderLight,
  },
  chatIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
