import React, { useMemo } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useChat } from '../../src/context/ChatContext';
import { Avatar } from '../../src/components/Avatar';
import { resolveConversationTitle } from '../../src/utils/format';

export default function ChatInfoModalScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const cid = Array.isArray(conversationId) ? conversationId[0] : conversationId;
  const router = useRouter();

  const { currentUser } = useAuth();
  const {
    conversations,
    usersById,
    messagesByConvId,
    pinnedConvIds,
    mutedConvIds,
    starredMessageIds,
    togglePinConversation,
    toggleMuteConversation,
    setActiveViewerImage,
  } = useChat();

  const conversation = conversations.find((c) => c.id === cid);
  const title = resolveConversationTitle(conversation, currentUser?.id, usersById);

  const messages = useMemo(
    () => (cid ? messagesByConvId[cid]?.messages ?? [] : []),
    [cid, messagesByConvId],
  );

  const sharedMedia = useMemo(
    () => messages.filter((m) => Boolean(m.imageInfo)),
    [messages],
  );

  const starredInConv = useMemo(
    () => messages.filter((m) => starredMessageIds.includes(m.id)),
    [messages, starredMessageIds],
  );

  if (!conversation) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Conversation not found.</Text>
      </View>
    );
  }

  const isPinned = pinnedConvIds.includes(conversation.id);
  const isMuted = mutedConvIds.includes(conversation.id);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Card with Quick Toggles */}
      <View style={styles.heroCard}>
        <Avatar
          name={title}
          size={76}
          isGroup={conversation.type === 'GROUP'}
        />
        <Text style={styles.heroTitle}>{title}</Text>
        <View style={styles.heroBadgeRow}>
          <Ionicons
            name="shield-checkmark-outline"
            size={12}
            color={COLORS.success}
          />
          <Text style={styles.heroSub}>
            {conversation.type === 'GROUP'
              ? `Group · ${conversation.participants_ids.length} members`
              : 'Direct Message · Encrypted'}
          </Text>
        </View>

        <View style={styles.quickActionGrid}>
          <TouchableOpacity
            style={[
              styles.quickActionTile,
              isPinned && styles.quickActionTileActive,
            ]}
            onPress={() => togglePinConversation(conversation.id)}
            activeOpacity={0.75}
          >
            <Ionicons
              name={isPinned ? 'pin' : 'pin-outline'}
              size={18}
              color={isPinned ? COLORS.textInverse : COLORS.textPrimary}
            />
            <Text
              style={[
                styles.quickActionLabel,
                isPinned && styles.quickActionLabelActive,
              ]}
            >
              {isPinned ? 'Pinned' : 'Pin Chat'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.quickActionTile,
              isMuted && styles.quickActionTileActive,
            ]}
            onPress={() => toggleMuteConversation(conversation.id)}
            activeOpacity={0.75}
          >
            <Ionicons
              name={
                isMuted
                  ? 'notifications-off'
                  : 'notifications-outline'
              }
              size={18}
              color={isMuted ? COLORS.textInverse : COLORS.textPrimary}
            />
            <Text
              style={[
                styles.quickActionLabel,
                isMuted && styles.quickActionLabelActive,
              ]}
            >
              {isMuted ? 'Muted' : 'Mute'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Shared Photos Grid */}
      {sharedMedia.length > 0 && (
        <>
          <Text style={styles.groupLabel}>
            Shared Media ({sharedMedia.length})
          </Text>
          <View style={styles.mediaGridCard}>
            <View style={styles.mediaGrid}>
              {sharedMedia.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={styles.mediaThumbWrap}
                  onPress={() => {
                    setActiveViewerImage({
                      uri: m.imageInfo!,
                      caption: m.content,
                      senderName: usersById[m.senderId]?.name,
                    });
                    router.push('/modal/image-viewer');
                  }}
                >
                  <Image
                    source={{ uri: m.imageInfo! }}
                    style={styles.mediaThumb}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </>
      )}

      {/* Saved / Starred Messages */}
      {starredInConv.length > 0 && (
        <>
          <Text style={styles.groupLabel}>
            Saved Messages ({starredInConv.length})
          </Text>
          <View style={styles.card}>
            {starredInConv.map((m, idx) => (
              <View
                key={m.id}
                style={[
                  styles.starredRow,
                  idx < starredInConv.length - 1 && styles.participantRowBorder,
                ]}
              >
                <Ionicons name="bookmark" size={14} color={COLORS.warning} />
                <View style={styles.starredBody}>
                  <Text style={styles.starredSender}>
                    {usersById[m.senderId]?.name?.split('@')[0] ?? 'Member'}
                  </Text>
                  <Text style={styles.starredText} numberOfLines={2}>
                    {(m.content || 'Shared a photo').replace(
                      /^> [^\n]+\n\n/,
                      '',
                    )}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Members List */}
      <Text style={styles.groupLabel}>
        Members ({conversation.participants_ids.length})
      </Text>
      <View style={styles.card}>
        {conversation.participants_ids.map((pid, idx, arr) => {
          const user = usersById[pid];
          const isMe = pid === currentUser?.id;
          const isCreator = pid === conversation.createdBy;

          return (
            <TouchableOpacity
              key={pid}
              style={[
                styles.participantRow,
                idx < arr.length - 1 && styles.participantRowBorder,
              ]}
              onPress={() => router.push(`/modal/user-profile?userId=${pid}`)}
              activeOpacity={0.7}
            >
              <Avatar name={user?.name ?? pid} size={40} />
              <View style={styles.participantInfo}>
                <Text style={styles.participantName} numberOfLines={1}>
                  {user?.name ?? `User ${pid.slice(-6)}`}
                  {isMe ? ' (You)' : ''}
                </Text>
                <Text style={styles.participantBio} numberOfLines={1}>
                  {user?.bio || 'Member'}
                </Text>
              </View>
              {isCreator && (
                <View style={styles.creatorBadge}>
                  <Text style={styles.creatorBadgeText}>Admin</Text>
                </View>
              )}
              <Ionicons
                name="chevron-forward"
                size={16}
                color={COLORS.textMuted}
                style={{ marginLeft: 6 }}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Metadata */}
      <Text style={styles.groupLabel}>Metadata</Text>
      <View style={styles.card}>
        <View style={styles.metaRow}>
          <Text style={styles.metaKey}>Conversation ID</Text>
          <Text style={styles.metaVal}>{conversation.id}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaKey}>Messages Loaded</Text>
          <Text style={styles.metaVal}>{messages.length}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaKey}>Created</Text>
          <Text style={styles.metaVal}>
            {new Date(conversation.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  center: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  groupLabel: {
    color: COLORS.textSecondary,
    fontSize: 11.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 4,
  },
  heroCard: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
    ...SHADOWS.card,
  },
  heroTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
  },
  heroSub: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
  },
  quickActionGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: SPACING.lg,
    width: '100%',
  },
  quickActionTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.bgPrimary,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderLight,
  },
  quickActionTileActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  quickActionLabel: {
    color: COLORS.textPrimary,
    fontSize: 12.5,
    fontWeight: '600',
  },
  quickActionLabelActive: {
    color: COLORS.textInverse,
  },
  mediaGridCard: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
    ...SHADOWS.card,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mediaThumbWrap: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    backgroundColor: COLORS.bgTertiary,
  },
  mediaThumb: {
    width: '100%',
    height: '100%',
  },
  card: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
    ...SHADOWS.card,
  },
  starredRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
  },
  starredBody: {
    flex: 1,
  },
  starredSender: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  starredText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  participantRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  participantInfo: {
    flex: 1,
    marginLeft: 12,
  },
  participantName: {
    color: COLORS.textPrimary,
    fontSize: 14.5,
    fontWeight: '600',
  },
  participantBio: {
    color: COLORS.textSecondary,
    fontSize: 12.5,
    marginTop: 2,
  },
  creatorBadge: {
    backgroundColor: COLORS.bgTertiary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  creatorBadgeText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  metaKey: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  metaVal: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '500',
  },
});
