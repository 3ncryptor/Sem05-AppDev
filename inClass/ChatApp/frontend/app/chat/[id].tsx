import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  LayoutAnimation,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useChat } from '../../src/context/ChatContext';
import { Avatar } from '../../src/components/Avatar';
import { MessageBubble } from '../../src/components/MessageBubble';
import { ServerStatusBanner } from '../../src/components/ServerStatusBanner';
import { ChatHistorySkeleton } from '../../src/components/Skeleton';
import { MessageResponseDto } from '../../src/types/api';
import {
  isFactBotName,
  resolveConversationTitle,
  SAMPLE_BASE64_IMAGES,
} from '../../src/utils/format';

const QUICK_REPLIES = [
  { label: 'Sounds good', icon: 'checkmark-circle-outline' as const },
  { label: 'On my way', icon: 'navigate-outline' as const },
  { label: 'Let us review this', icon: 'document-text-outline' as const },
  { label: 'Got it, thanks', icon: 'thumbs-up-outline' as const },
];

const SLASH_TEMPLATES = [
  {
    cmd: '/standup',
    desc: 'Daily progress update template',
    fill: 'Standup Update — Done: API integration | Next: UI verification | Blockers: None',
  },
  {
    cmd: '/meet',
    desc: 'Request a quick 5-min sync',
    fill: 'Are you free for a quick 5-minute sync right now?',
  },
  {
    cmd: '/review',
    desc: 'Ask for PR / code review',
    fill: 'Could you take a quick look at my latest changes when you have a moment?',
  },
  {
    cmd: '/approved',
    desc: 'Sign off on a deliverable',
    fill: 'Verified and approved. Ready to ship.',
  },
];

function formatDateSeparator(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return 'Recent';
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (isToday) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return 'Yesterday';

  return d.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function ActiveChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const conversationId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomComposerPadding = Math.max(
    insets.bottom,
    Platform.OS === 'android' ? 14 : 8,
  );

  const { currentUser } = useAuth();
  const {
    conversations,
    usersById,
    messagesByConvId,
    pinnedConvIds,
    starredMessageIds,
    reactionsByMessageId,
    loadLatestMessages,
    loadOlderMessages,
    sendMessage,
    togglePinConversation,
    toggleStarMessage,
    toggleMessageReaction,
    setActiveViewerImage,
  } = useChat();

  const [inputText, setInputText] = useState('');
  const [stagedImageUri, setStagedImageUri] = useState<string | null>(null);
  const [showImagePickerTray, setShowImagePickerTray] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [showScrollBottomFab, setShowScrollBottomFab] = useState(false);

  // New Pro-Messenger States: Reply Quote, In-Chat Search, Starred Filter, Media Rail
  const [replyingTo, setReplyingTo] = useState<{
    message: MessageResponseDto;
    senderName: string;
  } | null>(null);
  const [showInChatSearch, setShowInChatSearch] = useState(false);
  const [inChatQuery, setInChatQuery] = useState('');
  const [onlyStarredFilter, setOnlyStarredFilter] = useState(false);
  const [showSharedMediaStrip, setShowSharedMediaStrip] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const hasAutoScrolledRef = useRef(false);
  const sendBtnScale = useRef(new Animated.Value(1)).current;

  const conversation = useMemo(
    () => conversations.find((c) => c.id === conversationId),
    [conversationId, conversations],
  );

  const convState = conversationId ? messagesByConvId[conversationId] : undefined;
  const messages = convState?.messages ?? [];
  const nextCursor = convState?.nextCursor ?? null;
  const isLoadingInitial = convState?.isLoadingInitial ?? false;
  const isLoadingMore = convState?.isLoadingMore ?? false;

  const isGroup = conversation?.type === 'GROUP';
  const title = resolveConversationTitle(conversation, currentUser?.id, usersById);
  const isBot = isFactBotName(title);
  const isPinned = Boolean(
    conversationId && pinnedConvIds.includes(conversationId),
  );

  // Extract all shared photos in this conversation for the quick Media Gallery Strip
  const sharedPhotos = useMemo(
    () => messages.filter((m) => Boolean(m.imageInfo)),
    [messages],
  );

  // Filter messages when In-Chat Search or Starred-Only filter is active
  const displayedMessages = useMemo(() => {
    const q = inChatQuery.trim().toLowerCase();
    return messages.filter((m) => {
      if (onlyStarredFilter && !starredMessageIds.includes(m.id)) {
        return false;
      }
      if (!q) return true;
      return (m.content ?? '').toLowerCase().includes(q);
    });
  }, [inChatQuery, messages, onlyStarredFilter, starredMessageIds]);

  const showSlashPalette = inputText.startsWith('/');

  useEffect(() => {
    hasAutoScrolledRef.current = false;
    if (!conversationId) return;
    loadLatestMessages(conversationId, false);

    const interval = setInterval(() => {
      loadLatestMessages(conversationId, true);
    }, 3500);

    return () => clearInterval(interval);
  }, [conversationId, loadLatestMessages]);

  // Auto-scroll to bottom on initial load
  useEffect(() => {
    if (messages.length > 0 && !hasAutoScrolledRef.current) {
      hasAutoScrolledRef.current = true;
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 80);
    }
  }, [messages.length]);

  const animateSendPress = () => {
    Animated.sequence([
      Animated.spring(sendBtnScale, {
        toValue: 0.86,
        useNativeDriver: true,
        speed: 50,
      }),
      Animated.spring(sendBtnScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 35,
        bounciness: 10,
      }),
    ]).start();
  };

  const handleSend = async (customText?: string) => {
    if (!conversationId) return;
    const rawBody = (customText ?? inputText).trim();
    if (!rawBody && !stagedImageUri) return;

    animateSendPress();
    setIsSending(true);
    setSendError(null);

    // Format Quoted Reply prefix if replying to a message
    let finalContent = rawBody;
    if (replyingTo) {
      const cleanSnippet = (replyingTo.message.content || 'Shared a photo')
        .replace(/^> [^\n]+\n\n/, '')
        .replace(/\n+/g, ' ')
        .slice(0, 70);
      finalContent = `> ${replyingTo.senderName}: ${cleanSnippet}\n\n${rawBody || 'Photo'}`;
    }

    try {
      await sendMessage(conversationId, {
        content: finalContent || undefined,
        imageInfo: stagedImageUri || undefined,
      });
      if (!customText) setInputText('');
      setReplyingTo(null);
      setStagedImageUri(null);
      setShowImagePickerTray(false);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (err: any) {
      setSendError(err?.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handlePickFromDeviceGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.45,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.base64) {
          const mime = asset.mimeType || 'image/jpeg';
          setStagedImageUri(`data:${mime};base64,${asset.base64}`);
          setShowImagePickerTray(false);
        } else if (asset.uri?.startsWith('data:')) {
          setStagedImageUri(asset.uri);
          setShowImagePickerTray(false);
        }
      }
    } catch {
      setSendError('Photo library unavailable. Select a sample card below.');
    }
  };

  const toggleAttachmentTray = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowImagePickerTray((prev) => !prev);
  };

  const handleOpenImageFullscreen = (
    uri: string,
    caption?: string | null,
    senderName?: string,
  ) => {
    setActiveViewerImage({
      uri,
      caption,
      senderName,
    });
    router.push('/modal/image-viewer');
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromBottom =
      contentSize.height - layoutMeasurement.height - contentOffset.y;
    setShowScrollBottomFab(distanceFromBottom > 180);
  };

  const showInitialSkeleton = isLoadingInitial && messages.length === 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ServerStatusBanner />

      {/* Elevated Editorial Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={23} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerCenter}
          onPress={() =>
            router.push(`/modal/chat-info?conversationId=${conversationId}`)
          }
          activeOpacity={0.8}
        >
          <View style={styles.headerAvatarWrap}>
            <Avatar name={title} size={40} isGroup={isGroup} />
            <View
              style={[
                styles.activeDot,
                { backgroundColor: isBot ? COLORS.accentLight : COLORS.success },
              ]}
            />
          </View>

          <View style={styles.headerTextCol}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {title}
              </Text>
              {isBot && (
                <View style={styles.botBadge}>
                  <Ionicons name="sparkles" size={10} color={COLORS.accentLight} />
                </View>
              )}
              {isPinned && (
                <Ionicons
                  name="pin"
                  size={12}
                  color={COLORS.accentLight}
                  style={{ marginLeft: 5 }}
                />
              )}
            </View>
            <View style={styles.headerSubtitleRow}>
              <View style={styles.e2eeBadge}>
                <Ionicons name="shield-checkmark-outline" size={10} color={COLORS.success} />
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {isGroup
                    ? `${conversation?.participants_ids.length ?? 0} members · Synced`
                    : isBot
                      ? 'AI stream · Live'
                      : 'Read receipts active'}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Header Action Cluster: Search, Saved Messages, Media Drawer, Details */}
        <View style={styles.headerActionsCluster}>
          <TouchableOpacity
            style={[
              styles.headerActionBtn,
              showInChatSearch && styles.headerActionBtnActive,
            ]}
            onPress={() => {
              LayoutAnimation.configureNext(
                LayoutAnimation.Presets.easeInEaseOut,
              );
              setShowInChatSearch((prev) => {
                if (prev) setInChatQuery('');
                return !prev;
              });
            }}
          >
            <Ionicons
              name="search-outline"
              size={18}
              color={
                showInChatSearch ? COLORS.textInverse : COLORS.textPrimary
              }
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.headerActionBtn,
              onlyStarredFilter && styles.headerActionBtnActive,
            ]}
            onPress={() => {
              LayoutAnimation.configureNext(
                LayoutAnimation.Presets.easeInEaseOut,
              );
              setOnlyStarredFilter((prev) => !prev);
            }}
          >
            <Ionicons
              name={onlyStarredFilter ? 'bookmark' : 'bookmark-outline'}
              size={17}
              color={
                onlyStarredFilter ? COLORS.textInverse : COLORS.textPrimary
              }
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() =>
              router.push(`/modal/chat-info?conversationId=${conversationId}`)
            }
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={18}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Collapsible In-Chat Search & Shared Media Bar */}
      {(showInChatSearch || onlyStarredFilter || sharedPhotos.length > 0) && (
        <View style={styles.subToolbar}>
          {showInChatSearch && (
            <View style={styles.inChatSearchBox}>
              <Ionicons name="search-outline" size={15} color={COLORS.textMuted} />
              <TextInput
                style={styles.inChatSearchInput}
                value={inChatQuery}
                onChangeText={setInChatQuery}
                placeholder="Find in conversation..."
                placeholderTextColor={COLORS.textMuted}
                autoFocus
              />
              {inChatQuery.length > 0 && (
                <Text style={styles.matchCountText}>
                  {displayedMessages.length} matches
                </Text>
              )}
              <TouchableOpacity
                onPress={() => {
                  setInChatQuery('');
                  setShowInChatSearch(false);
                }}
              >
                <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.subToolbarPillsRow}>
            {onlyStarredFilter && (
              <TouchableOpacity
                style={styles.activeFilterBannerPill}
                onPress={() => setOnlyStarredFilter(false)}
              >
                <Ionicons name="bookmark" size={11} color={COLORS.warning} />
                <Text style={styles.activeFilterBannerText}>
                  Showing Saved Messages ({displayedMessages.length})
                </Text>
                <Ionicons name="close" size={12} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}

            {sharedPhotos.length > 0 && (
              <TouchableOpacity
                style={styles.mediaStripToggle}
                onPress={() => {
                  LayoutAnimation.configureNext(
                    LayoutAnimation.Presets.easeInEaseOut,
                  );
                  setShowSharedMediaStrip((prev) => !prev);
                }}
              >
                <Ionicons
                  name="images-outline"
                  size={12}
                  color={COLORS.accentLight}
                />
                <Text style={styles.mediaStripToggleText}>
                  {sharedPhotos.length} Shared{' '}
                  {sharedPhotos.length === 1 ? 'Photo' : 'Photos'}
                </Text>
                <Ionicons
                  name={showSharedMediaStrip ? 'chevron-up' : 'chevron-down'}
                  size={12}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            )}

            {conversationId && (
              <TouchableOpacity
                style={styles.pinChatMiniBtn}
                onPress={() => togglePinConversation(conversationId)}
              >
                <Ionicons
                  name={isPinned ? 'pin' : 'pin-outline'}
                  size={12}
                  color={isPinned ? COLORS.accentLight : COLORS.textSecondary}
                />
                <Text style={styles.pinChatMiniText}>
                  {isPinned ? 'Pinned' : 'Pin chat'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {showSharedMediaStrip && sharedPhotos.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mediaThumbRail}
            >
              {sharedPhotos.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() =>
                    handleOpenImageFullscreen(
                      m.imageInfo!,
                      m.content,
                      usersById[m.senderId]?.name,
                    )
                  }
                  style={styles.mediaRailItem}
                >
                  <Image
                    source={{ uri: m.imageInfo! }}
                    style={styles.mediaRailImg}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {showInitialSkeleton ? (
          <View style={styles.flex}>
            <ChatHistorySkeleton />
          </View>
        ) : (
          <View style={styles.flex}>
            <FlatList
              ref={flatListRef}
              data={displayedMessages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesList}
              showsVerticalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={32}
              ListHeaderComponent={
                <View style={styles.paginationHeader}>
                  {nextCursor ? (
                    <TouchableOpacity
                      style={styles.loadOlderBtn}
                      onPress={() =>
                        conversationId && loadOlderMessages(conversationId)
                      }
                      disabled={isLoadingMore}
                      activeOpacity={0.75}
                    >
                      {isLoadingMore ? (
                        <ActivityIndicator
                          size="small"
                          color={COLORS.textSecondary}
                        />
                      ) : (
                        <>
                          <Ionicons
                            name="arrow-up-outline"
                            size={14}
                            color={COLORS.textSecondary}
                          />
                          <Text style={styles.loadOlderText}>
                            Load earlier messages
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.beginningCard}>
                      <View style={styles.beginningIconCircle}>
                        <Ionicons
                          name={
                            isBot
                              ? 'sparkles-outline'
                              : isGroup
                                ? 'people-outline'
                                : 'shield-checkmark-outline'
                          }
                          size={18}
                          color={COLORS.accentLight}
                        />
                      </View>
                      <Text style={styles.beginningTitle}>{title}</Text>
                      <Text style={styles.beginningSub}>
                        Swipe any message to quote-reply · Double-tap to heart ·
                        Long-press for reactions & receipts
                      </Text>
                    </View>
                  )}
                </View>
              }
              renderItem={({ item, index }) => {
                const prevMsg =
                  index > 0 ? displayedMessages[index - 1] : null;
                const nextMsg =
                  index < displayedMessages.length - 1
                    ? displayedMessages[index + 1]
                    : null;

                const isFirstInSequence =
                  !prevMsg || prevMsg.senderId !== item.senderId;
                const isLastInSequence =
                  !nextMsg || nextMsg.senderId !== item.senderId;

                const currentDayLabel = formatDateSeparator(item.createdAt);
                const prevDayLabel = prevMsg
                  ? formatDateSeparator(prevMsg.createdAt)
                  : null;
                const showDateHeader = currentDayLabel !== prevDayLabel;

                return (
                  <View>
                    {showDateHeader && (
                      <View style={styles.datePillWrap}>
                        <View style={styles.datePillLine} />
                        <View style={styles.datePill}>
                          <Ionicons
                            name="calendar-outline"
                            size={11}
                            color={COLORS.textSecondary}
                          />
                          <Text style={styles.datePillText}>
                            {currentDayLabel}
                          </Text>
                        </View>
                        <View style={styles.datePillLine} />
                      </View>
                    )}
                    <MessageBubble
                      message={item}
                      isOwn={item.senderId === currentUser?.id}
                      isGroup={Boolean(isGroup)}
                      sender={usersById[item.senderId]}
                      usersById={usersById}
                      isFirstInSequence={isFirstInSequence}
                      isLastInSequence={isLastInSequence}
                      isHighlighted={
                        Boolean(inChatQuery.trim()) &&
                        (item.content ?? '')
                          .toLowerCase()
                          .includes(inChatQuery.trim().toLowerCase())
                      }
                      isStarred={starredMessageIds.includes(item.id)}
                      reactions={reactionsByMessageId[item.id] ?? []}
                      onToggleReaction={(reaction) =>
                        toggleMessageReaction(item.id, reaction)
                      }
                      onToggleStar={() => toggleStarMessage(item.id)}
                      onReply={(msg, sName) => {
                        LayoutAnimation.configureNext(
                          LayoutAnimation.Presets.easeInEaseOut,
                        );
                        setReplyingTo({ message: msg, senderName: sName });
                      }}
                      onPressImage={handleOpenImageFullscreen}
                    />
                  </View>
                );
              }}
            />

            {/* Floating Jump-to-Bottom Button */}
            {showScrollBottomFab && (
              <TouchableOpacity
                style={styles.scrollBottomFab}
                onPress={() =>
                  flatListRef.current?.scrollToEnd({ animated: true })
                }
                activeOpacity={0.85}
              >
                <Ionicons
                  name="chevron-down"
                  size={19}
                  color={COLORS.textPrimary}
                />
              </TouchableOpacity>
            )}
          </View>
        )}

        {sendError && (
          <View style={styles.errorStrip}>
            <Ionicons name="alert-circle-outline" size={15} color={COLORS.danger} />
            <Text style={styles.errorStripText}>{sendError}</Text>
            <TouchableOpacity onPress={() => setSendError(null)}>
              <Ionicons name="close" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Slash Command Palette (`/` templates) */}
        {showSlashPalette && (
          <View style={styles.slashTray}>
            <View style={styles.slashHeaderRow}>
              <Ionicons name="flash-outline" size={13} color={COLORS.accentLight} />
              <Text style={styles.slashHeaderTitle}>Quick Commands</Text>
            </View>
            {SLASH_TEMPLATES.map((tpl) => (
              <TouchableOpacity
                key={tpl.cmd}
                style={styles.slashItem}
                onPress={() => setInputText(tpl.fill)}
              >
                <View style={styles.slashCmdBadge}>
                  <Text style={styles.slashCmdText}>{tpl.cmd}</Text>
                </View>
                <Text style={styles.slashDescText} numberOfLines={1}>
                  {tpl.desc}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Minimalist Attachment Sheet */}
        {showImagePickerTray && (
          <View style={styles.attachmentTray}>
            <View style={styles.trayHeader}>
              <Text style={styles.trayTitle}>Share Visual Attachment</Text>
              <TouchableOpacity onPress={toggleAttachmentTray}>
                <Ionicons name="close" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.trayOptionsRow}>
              <TouchableOpacity
                style={styles.galleryPickerCard}
                onPress={handlePickFromDeviceGallery}
                activeOpacity={0.75}
              >
                <Ionicons name="images-outline" size={20} color={COLORS.textPrimary} />
                <Text style={styles.galleryPickerTitle}>Device Gallery</Text>
              </TouchableOpacity>

              {SAMPLE_BASE64_IMAGES.map((sample) => (
                <TouchableOpacity
                  key={sample.id}
                  style={styles.sampleCard}
                  onPress={() => {
                    setStagedImageUri(sample.dataUri);
                    setShowImagePickerTray(false);
                  }}
                  activeOpacity={0.75}
                >
                  <Image
                    source={{ uri: sample.dataUri }}
                    style={styles.sampleThumb}
                  />
                  <Text style={styles.sampleTitle} numberOfLines={1}>
                    {sample.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Active Quote-Reply Banner above Composer */}
        {replyingTo && (
          <View style={styles.replyComposerBanner}>
            <View style={styles.replyAccentBar} />
            <View style={styles.replyBannerBody}>
              <View style={styles.replyBannerTop}>
                <Ionicons
                  name="arrow-undo-outline"
                  size={12}
                  color={COLORS.accentLight}
                />
                <Text style={styles.replyBannerTitle}>
                  Replying to {replyingTo.senderName}
                </Text>
              </View>
              <Text style={styles.replyBannerSub} numberOfLines={1}>
                {(replyingTo.message.content || 'Shared a photo').replace(
                  /^> [^\n]+\n\n/,
                  '',
                )}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                LayoutAnimation.configureNext(
                  LayoutAnimation.Presets.easeInEaseOut,
                );
                setReplyingTo(null);
              }}
              style={styles.replyCloseBtn}
            >
              <Ionicons name="close-circle" size={19} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Staged Photo Preview */}
        {stagedImageUri && (
          <View style={styles.stagedStrip}>
            <Image
              source={{ uri: stagedImageUri }}
              style={styles.stagedThumb}
            />
            <View style={styles.stagedInfo}>
              <Text style={styles.stagedTitle}>Photo ready to send</Text>
              <Text style={styles.stagedSub}>
                {Math.round(stagedImageUri.length / 1024)} KB · Base64 encoded
              </Text>
            </View>
            <TouchableOpacity
              style={styles.removeStagedBtn}
              onPress={() => setStagedImageUri(null)}
            >
              <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* 1-Tap Quick Reply Suggestions & `/` Hint when Input is Empty */}
        {!inputText && !stagedImageUri && !showImagePickerTray && (
          <View style={styles.quickReplyWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickReplyScroll}
              keyboardShouldPersistTaps="handled"
            >
              <TouchableOpacity
                style={styles.slashHintChip}
                onPress={() => setInputText('/')}
                activeOpacity={0.75}
              >
                <Ionicons
                  name="terminal-outline"
                  size={12}
                  color={COLORS.accentLight}
                />
                <Text style={styles.slashHintChipText}>/ Commands</Text>
              </TouchableOpacity>

              {QUICK_REPLIES.map((reply) => (
                <TouchableOpacity
                  key={reply.label}
                  style={styles.quickReplyChip}
                  onPress={() => handleSend(reply.label)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={reply.icon}
                    size={13}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.quickReplyText}>{reply.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Floating Minimalist Input Composer */}
        <View
          style={[
            styles.composerBar,
            { paddingBottom: bottomComposerPadding },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.attachBtn,
              (showImagePickerTray || stagedImageUri) && styles.attachBtnActive,
            ]}
            onPress={toggleAttachmentTray}
            activeOpacity={0.75}
          >
            <Ionicons
              name={showImagePickerTray ? 'close' : 'add'}
              size={22}
              color={
                showImagePickerTray || stagedImageUri
                  ? COLORS.textInverse
                  : COLORS.textPrimary
              }
            />
          </TouchableOpacity>

          <View style={styles.inputPill}>
            <TextInput
              style={styles.composerInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder={
                stagedImageUri
                  ? 'Add a caption...'
                  : replyingTo
                    ? `Reply to ${replyingTo.senderName}...`
                    : 'Message or type / for commands...'
              }
              placeholderTextColor={COLORS.textMuted}
              multiline
              maxLength={2000}
            />

            <Animated.View style={{ transform: [{ scale: sendBtnScale }] }}>
              <TouchableOpacity
                style={[
                  styles.sendBtn,
                  !inputText.trim() && !stagedImageUri && styles.sendBtnDisabled,
                ]}
                onPress={() => handleSend()}
                disabled={isSending || (!inputText.trim() && !stagedImageUri)}
                activeOpacity={0.8}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color={COLORS.textInverse} />
                ) : (
                  <Ionicons name="arrow-up" size={17} color={COLORS.textInverse} />
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    backgroundColor: COLORS.bgSecondary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    ...SHADOWS.card,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatarWrap: {
    position: 'relative',
  },
  activeDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    borderWidth: 2,
    borderColor: COLORS.bgSecondary,
  },
  headerTextCol: {
    flex: 1,
    marginLeft: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  botBadge: {
    marginLeft: 5,
    backgroundColor: COLORS.accentSoft,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  e2eeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 11.5,
  },
  headerActionsCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionBtnActive: {
    backgroundColor: COLORS.accent,
  },
  subToolbar: {
    backgroundColor: COLORS.bgSecondary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  inChatSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgPrimary,
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
    height: 36,
    gap: 6,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderLight,
  },
  inChatSearchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 13,
    paddingVertical: 0,
  },
  matchCountText: {
    color: COLORS.accentLight,
    fontSize: 11,
    fontWeight: '600',
  },
  subToolbarPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  activeFilterBannerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.warningSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  activeFilterBannerText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
  mediaStripToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.bgPrimary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  mediaStripToggleText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  pinChatMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pinChatMiniText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  mediaThumbRail: {
    gap: 8,
    paddingTop: 8,
  },
  mediaRailItem: {
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  mediaRailImg: {
    width: 54,
    height: 54,
  },
  messagesList: {
    paddingVertical: SPACING.md,
  },
  paginationHeader: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  loadOlderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.bgSecondary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  loadOlderText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  beginningCard: {
    alignItems: 'center',
    backgroundColor: COLORS.bgSecondary,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    maxWidth: 310,
    ...SHADOWS.card,
  },
  beginningIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  beginningTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  beginningSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 3,
  },
  datePillWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    paddingHorizontal: SPACING.xl,
    gap: 10,
  },
  datePillLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.borderLight,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.bgSecondary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  datePillText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  scrollBottomFab: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    ...SHADOWS.floating,
  },
  errorStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.dangerSoft,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 8,
  },
  errorStripText: {
    color: COLORS.danger,
    fontSize: 12,
    flex: 1,
  },
  slashTray: {
    backgroundColor: COLORS.bgSecondary,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  slashHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  slashHeaderTitle: {
    color: COLORS.accentLight,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  slashItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  slashCmdBadge: {
    backgroundColor: COLORS.bgPrimary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderLight,
  },
  slashCmdText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  slashDescText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  attachmentTray: {
    backgroundColor: COLORS.bgSecondary,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    padding: SPACING.lg,
  },
  trayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  trayTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  trayOptionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  galleryPickerCard: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderLight,
    gap: 6,
  },
  galleryPickerTitle: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  sampleCard: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
    borderRadius: RADIUS.md,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderLight,
    gap: 6,
  },
  sampleThumb: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  sampleTitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  replyComposerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgSecondary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  replyAccentBar: {
    width: 3,
    height: 32,
    borderRadius: 2,
    backgroundColor: COLORS.accentLight,
    marginRight: 10,
  },
  replyBannerBody: {
    flex: 1,
  },
  replyBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  replyBannerTitle: {
    color: COLORS.accentLight,
    fontSize: 11.5,
    fontWeight: '700',
  },
  replyBannerSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  replyCloseBtn: {
    padding: 4,
  },
  stagedStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgSecondary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  stagedThumb: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgTertiary,
  },
  stagedInfo: {
    flex: 1,
    marginLeft: 12,
  },
  stagedTitle: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  stagedSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  removeStagedBtn: {
    padding: 4,
  },
  quickReplyWrap: {
    paddingVertical: 8,
    backgroundColor: COLORS.bgPrimary,
  },
  quickReplyScroll: {
    paddingHorizontal: SPACING.md,
    gap: 8,
  },
  slashHintChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  slashHintChipText: {
    color: COLORS.accentLight,
    fontSize: 12,
    fontWeight: '700',
  },
  quickReplyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.bgSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderLight,
  },
  quickReplyText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  composerBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.md,
    paddingTop: 10,
    backgroundColor: COLORS.bgSecondary,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    gap: 10,
  },
  attachBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderLight,
  },
  attachBtnActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  inputPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.bgPrimary,
    borderRadius: 22,
    paddingLeft: 16,
    paddingRight: 5,
    paddingVertical: 5,
    minHeight: 42,
    maxHeight: 120,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderLight,
  },
  composerInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14.5,
    paddingTop: Platform.OS === 'ios' ? 6 : 4,
    paddingBottom: Platform.OS === 'ios' ? 6 : 4,
    marginRight: 8,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: COLORS.borderLight,
  },
});
