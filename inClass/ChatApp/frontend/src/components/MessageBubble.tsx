import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Clipboard,
  Image,
  LayoutAnimation,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../constants/theme';
import { ReactionIconKey } from '../context/ChatContext';
import { MessageResponseDto, UserResponseDto } from '../types/api';
import { formatMessageTime, getUserColor, isFactBotName } from '../utils/format';
import { Avatar } from './Avatar';

const REACTION_OPTIONS: {
  key: ReactionIconKey;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
}[] = [
  { key: 'heart', icon: 'heart', color: '#C84B31', label: 'Love' },
  { key: 'thumbs-up', icon: 'thumbs-up', color: '#8C6D53', label: 'Agree' },
  { key: 'flame', icon: 'flame', color: '#D97706', label: 'Fire' },
  { key: 'flash', icon: 'flash', color: '#5B7B9A', label: 'Fast' },
  { key: 'sparkles', icon: 'sparkles', color: '#9A7B4F', label: 'Insight' },
  { key: 'checkmark-circle', icon: 'checkmark-circle', color: '#4A7C59', label: 'Done' },
];

interface MessageBubbleProps {
  message: MessageResponseDto;
  isOwn: boolean;
  isGroup: boolean;
  sender?: UserResponseDto;
  usersById: Record<string, UserResponseDto>;
  isFirstInSequence?: boolean;
  isLastInSequence?: boolean;
  isHighlighted?: boolean;
  isStarred?: boolean;
  reactions?: ReactionIconKey[];
  onToggleReaction?: (reaction: ReactionIconKey) => void;
  onToggleStar?: () => void;
  onReply?: (message: MessageResponseDto, senderName: string) => void;
  onPressImage?: (uri: string, caption?: string | null, senderName?: string) => void;
}

/**
 * Parses `> SenderName: quoted snippet\n\nActual message` into structured quote + body
 */
function parseQuotedContent(raw?: string | null): {
  quotedAuthor: string | null;
  quotedText: string | null;
  bodyText: string;
} {
  if (!raw) {
    return { quotedAuthor: null, quotedText: null, bodyText: '' };
  }
  const match = raw.match(/^> ([^:\n]+): ([^\n]+)\n\n([\s\S]*)$/);
  if (!match) {
    return { quotedAuthor: null, quotedText: null, bodyText: raw };
  }
  return {
    quotedAuthor: match[1].trim(),
    quotedText: match[2].trim(),
    bodyText: match[3].trim(),
  };
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  isGroup,
  sender,
  usersById,
  isFirstInSequence = true,
  isLastInSequence = true,
  isHighlighted = false,
  isStarred = false,
  reactions = [],
  onToggleReaction,
  onToggleStar,
  onReply,
  onPressImage,
}) => {
  const [showStatusBreakdown, setShowStatusBreakdown] = useState(false);
  const [showActionDock, setShowActionDock] = useState(false);
  const [copiedFeedback, setCopiedFeedback] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(8)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const swipeX = useRef(new Animated.Value(0)).current;
  const heartBurstScale = useRef(new Animated.Value(0)).current;
  const lastTapRef = useRef<number>(0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 210,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        speed: 26,
        bounciness: 4,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const senderName = sender?.name ?? `User ${message.senderId.slice(-6)}`;
  const senderShortName = senderName.split('@')[0];
  const senderColor = getUserColor(senderName);
  const isBot = isFactBotName(senderName);

  // Swipe-to-Reply Gesture (like Telegram / WhatsApp / Instagram)
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.7,
        onPanResponderMove: (_, gesture) => {
          const offset = isOwn
            ? Math.max(-68, Math.min(0, gesture.dx))
            : Math.min(68, Math.max(0, gesture.dx));
          swipeX.setValue(offset);
        },
        onPanResponderRelease: (_, gesture) => {
          const triggered = isOwn ? gesture.dx < -44 : gesture.dx > 44;
          if (triggered && onReply) {
            onReply(message, senderShortName);
          }
          Animated.spring(swipeX, {
            toValue: 0,
            useNativeDriver: true,
            speed: 30,
            bounciness: 6,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(swipeX, {
            toValue: 0,
            useNativeDriver: true,
            speed: 30,
            bounciness: 6,
          }).start();
        },
      }),
    [isOwn, message, onReply, senderShortName, swipeX],
  );

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 5,
    }).start();
  };

  // Single tap toggles Read Receipt drawer; Double-tap triggers Heart Reaction burst
  const handleBubbleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 280) {
      // Double Tap -> Heart Reaction + Spring Burst
      onToggleReaction?.('heart');
      heartBurstScale.setValue(0.3);
      Animated.sequence([
        Animated.spring(heartBurstScale, {
          toValue: 1.25,
          useNativeDriver: true,
          speed: 35,
          bounciness: 12,
        }),
        Animated.timing(heartBurstScale, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start();
      setShowActionDock(false);
    } else {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      if (showActionDock) {
        setShowActionDock(false);
      } else {
        setShowStatusBreakdown((prev) => !prev);
      }
    }
    lastTapRef.current = now;
  };

  const handleLongPress = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowActionDock((prev) => !prev);
  };

  const handleCopyText = () => {
    if (message.content) {
      Clipboard.setString(message.content.replace(/^> [^\n]+\n\n/, ''));
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 1800);
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowActionDock(false);
  };

  // Inspect per-recipient delivery & read receipts from message.status
  const statusEntries = Object.entries(message.status || {}).filter(
    ([uid]) => uid !== message.senderId,
  );
  const readUsers = statusEntries
    .filter(([, st]) => st?.read)
    .map(([uid]) => usersById[uid]?.name ?? uid);
  const readCount = readUsers.length;
  const deliveredCount = statusEntries.filter(
    ([, st]) => st?.delivered || st?.read,
  ).length;
  const totalRecipients = statusEntries.length;

  const allRead = totalRecipients > 0 && readCount === totalRecipients;
  const anyRead = readCount > 0;
  const anyDelivered = deliveredCount > 0;

  let receiptText = 'Sent';
  let receiptIcon: keyof typeof Ionicons.glyphMap = 'checkmark';
  let receiptColor = 'rgba(250, 248, 245, 0.72)';

  if (allRead) {
    receiptText =
      isGroup && totalRecipients > 1 ? `Seen by ${readCount}` : 'Seen';
    receiptIcon = 'checkmark-done';
    receiptColor = '#93C5FD';
  } else if (anyRead) {
    receiptText = `Seen ${readCount}/${totalRecipients}`;
    receiptIcon = 'checkmark-done';
    receiptColor = '#93C5FD';
  } else if (anyDelivered) {
    receiptText = 'Delivered';
    receiptIcon = 'checkmark-done';
    receiptColor = 'rgba(250, 248, 245, 0.85)';
  }

  const { quotedAuthor, quotedText, bodyText } = parseQuotedContent(
    message.content,
  );

  return (
    <View style={styles.outerBlock}>
      {/* Floating Reaction & Quick-Action Dock on Long-Press */}
      {showActionDock && (
        <View
          style={[
            styles.actionDockWrap,
            isOwn ? styles.actionDockRight : styles.actionDockLeft,
          ]}
        >
          {/* 6 Vector Icon Reactions */}
          <View style={styles.reactionPillBar}>
            {REACTION_OPTIONS.map((item) => {
              const active = reactions.includes(item.key);
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    styles.reactionIconBtn,
                    active && styles.reactionIconBtnActive,
                  ]}
                  onPress={() => {
                    LayoutAnimation.configureNext(
                      LayoutAnimation.Presets.easeInEaseOut,
                    );
                    onToggleReaction?.(item.key);
                    setShowActionDock(false);
                  }}
                >
                  <Ionicons
                    name={item.icon}
                    size={16}
                    color={active ? item.color : COLORS.textPrimary}
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Secondary Quick Actions: Reply, Star, Copy, Receipts */}
          <View style={styles.quickToolsRow}>
            {onReply && (
              <TouchableOpacity
                style={styles.quickToolChip}
                onPress={() => {
                  onReply(message, senderShortName);
                  setShowActionDock(false);
                }}
              >
                <Ionicons
                  name="arrow-undo-outline"
                  size={13}
                  color={COLORS.textPrimary}
                />
                <Text style={styles.quickToolText}>Reply</Text>
              </TouchableOpacity>
            )}

            {onToggleStar && (
              <TouchableOpacity
                style={styles.quickToolChip}
                onPress={() => {
                  onToggleStar();
                  setShowActionDock(false);
                }}
              >
                <Ionicons
                  name={isStarred ? 'bookmark' : 'bookmark-outline'}
                  size={13}
                  color={isStarred ? COLORS.warning : COLORS.textPrimary}
                />
                <Text style={styles.quickToolText}>
                  {isStarred ? 'Saved' : 'Save'}
                </Text>
              </TouchableOpacity>
            )}

            {bodyText ? (
              <TouchableOpacity
                style={styles.quickToolChip}
                onPress={handleCopyText}
              >
                <Ionicons
                  name="copy-outline"
                  size={13}
                  color={COLORS.textPrimary}
                />
                <Text style={styles.quickToolText}>Copy</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={styles.quickToolChip}
              onPress={() => {
                LayoutAnimation.configureNext(
                  LayoutAnimation.Presets.easeInEaseOut,
                );
                setShowStatusBreakdown((prev) => !prev);
                setShowActionDock(false);
              }}
            >
              <Ionicons
                name="checkmark-done-outline"
                size={13}
                color={COLORS.textPrimary}
              />
              <Text style={styles.quickToolText}>Receipts</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.wrapper,
          isOwn ? styles.wrapperOwn : styles.wrapperOther,
          {
            marginTop: isFirstInSequence ? 8 : 2,
            marginBottom:
              reactions.length > 0 ? 14 : isLastInSequence ? 5 : 2,
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { translateX: swipeX },
              { scale: scaleAnim },
            ],
          },
        ]}
      >
        {/* Left Avatar Column for Incoming Messages */}
        {!isOwn && (
          <View style={styles.avatarGutter}>
            {isLastInSequence ? (
              <Avatar name={senderName} size={28} />
            ) : (
              <View style={{ width: 28 }} />
            )}
          </View>
        )}

        <Pressable
          onPress={handleBubbleTap}
          onLongPress={handleLongPress}
          delayLongPress={230}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            styles.bubble,
            isOwn ? styles.bubbleOwn : styles.bubbleOther,
            isOwn && !isLastInSequence && styles.bubbleOwnMiddle,
            !isOwn && !isLastInSequence && styles.bubbleOtherMiddle,
            isHighlighted && styles.bubbleHighlighted,
          ]}
        >
          {/* Double-Tap Heart Burst Animation Overlay */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.heartBurstOverlay,
              {
                opacity: heartBurstScale,
                transform: [{ scale: heartBurstScale }],
              },
            ]}
          >
            <View style={styles.heartBurstCircle}>
              <Ionicons name="heart" size={22} color="#C84B31" />
            </View>
          </Animated.View>

          {/* Copied Feedback Toast Pill */}
          {copiedFeedback && (
            <View style={styles.copiedBadge}>
              <Ionicons name="checkmark" size={11} color={COLORS.textInverse} />
              <Text style={styles.copiedBadgeText}>Copied to clipboard</Text>
            </View>
          )}

          {/* Sender Attribution on First Bubble of Sequence */}
          {!isOwn && isFirstInSequence && (isGroup || isBot) && (
            <View style={styles.senderRow}>
              {isBot && (
                <Ionicons
                  name="sparkles"
                  size={11}
                  color={COLORS.accentLight}
                  style={styles.botIcon}
                />
              )}
              <Text
                style={[styles.senderName, { color: senderColor }]}
                numberOfLines={1}
              >
                {senderShortName}
              </Text>
              {isBot && (
                <View style={styles.aiMicroTag}>
                  <Text style={styles.aiMicroTagText}>AI Insight</Text>
                </View>
              )}
            </View>
          )}

          {/* Quoted Reply Card inside Bubble */}
          {quotedAuthor && quotedText && (
            <View
              style={[
                styles.quotedBox,
                isOwn ? styles.quotedBoxOwn : styles.quotedBoxOther,
              ]}
            >
              <View style={styles.quotedHeaderRow}>
                <Ionicons
                  name="return-down-forward-outline"
                  size={11}
                  color={isOwn ? '#D6C7B8' : COLORS.accentLight}
                />
                <Text
                  style={[
                    styles.quotedAuthor,
                    isOwn ? styles.quotedAuthorOwn : styles.quotedAuthorOther,
                  ]}
                  numberOfLines={1}
                >
                  {quotedAuthor}
                </Text>
              </View>
              <Text
                style={[
                  styles.quotedSnippet,
                  isOwn ? styles.quotedSnippetOwn : styles.quotedSnippetOther,
                ]}
                numberOfLines={2}
              >
                {quotedText}
              </Text>
            </View>
          )}

          {/* Base64 Image Attachment */}
          {message.imageInfo ? (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() =>
                onPressImage?.(message.imageInfo!, bodyText, senderName)
              }
              style={styles.imageContainer}
            >
              <Image
                source={{ uri: message.imageInfo }}
                style={styles.imageAttachment}
                resizeMode="cover"
              />
              <View style={styles.expandIconPill}>
                <Ionicons
                  name="expand-outline"
                  size={13}
                  color={COLORS.textInverse}
                />
              </View>
            </TouchableOpacity>
          ) : null}

          {/* Text Content */}
          {bodyText ? (
            <Text
              style={[
                styles.content,
                isOwn ? styles.contentOwn : styles.contentOther,
              ]}
            >
              {bodyText}
            </Text>
          ) : null}

          {/* Timestamp, Star Bookmark & Explicit Read Receipt Pill */}
          <View style={styles.footer}>
            {isStarred && (
              <Ionicons
                name="bookmark"
                size={11}
                color={isOwn ? '#FCD34D' : COLORS.warning}
              />
            )}

            <Text style={[styles.time, isOwn ? styles.timeOwn : styles.timeOther]}>
              {formatMessageTime(message.createdAt)}
            </Text>

            {isOwn && (
              <View style={styles.receiptBadge}>
                <Ionicons name={receiptIcon} size={13} color={receiptColor} />
                <Text style={[styles.receiptText, { color: receiptColor }]}>
                  {receiptText}
                </Text>
              </View>
            )}
          </View>

          {/* Expandable Per-Participant Read Receipt Inspector */}
          {showStatusBreakdown && (
            <View
              style={[
                styles.statusDrawer,
                isOwn ? styles.statusDrawerOwn : styles.statusDrawerOther,
              ]}
            >
              <View style={styles.statusDrawerHeader}>
                <Ionicons
                  name="checkmark-done-circle-outline"
                  size={13}
                  color={isOwn ? 'rgba(250,248,245,0.85)' : COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.statusDrawerTitle,
                    isOwn ? styles.statusTextOwn : styles.statusTextOther,
                  ]}
                >
                  Delivery & Read Matrix
                </Text>
              </View>

              {Object.entries(message.status || {}).map(([uid, st]) => {
                const uName =
                  usersById[uid]?.name?.split('@')[0] ?? uid.slice(-6);
                const isSender = uid === message.senderId;
                return (
                  <View key={uid} style={styles.statusItemRow}>
                    <View style={styles.statusUserRow}>
                      <Avatar name={uName} size={18} />
                      <Text
                        style={[
                          styles.statusUser,
                          isOwn ? styles.statusTextOwn : styles.statusTextOther,
                        ]}
                      >
                        {uName} {isSender ? '(You)' : ''}
                      </Text>
                    </View>
                    <View style={styles.statusRightRow}>
                      <Ionicons
                        name={
                          st?.read
                            ? 'checkmark-done'
                            : st?.delivered
                              ? 'checkmark-done-outline'
                              : 'checkmark-outline'
                        }
                        size={12}
                        color={
                          st?.read
                            ? isOwn
                              ? '#93C5FD'
                              : COLORS.info
                            : isOwn
                              ? 'rgba(250,248,245,0.65)'
                              : COLORS.textMuted
                        }
                      />
                      <Text
                        style={[
                          styles.statusMeta,
                          isOwn ? styles.statusTextOwn : styles.statusTextOther,
                        ]}
                      >
                        {st?.read ? 'Seen' : st?.delivered ? 'Delivered' : 'Sent'}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Attached Vector Reaction Pills */}
          {reactions.length > 0 && (
            <View
              style={[
                styles.attachedReactionsBar,
                isOwn
                  ? styles.attachedReactionsOwn
                  : styles.attachedReactionsOther,
              ]}
            >
              {reactions.map((rKey) => {
                const meta = REACTION_OPTIONS.find((o) => o.key === rKey);
                if (!meta) return null;
                return (
                  <TouchableOpacity
                    key={rKey}
                    style={styles.attachedReactionChip}
                    onPress={() => onToggleReaction?.(rKey)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name={meta.icon} size={12} color={meta.color} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </Pressable>

        {/* Instagram/Messenger-style Stacked Mini Seen Avatars under Last Outgoing Message */}
        {isOwn && isLastInSequence && readUsers.length > 0 && (
          <View style={styles.miniSeenAvatarCluster}>
            {readUsers.slice(0, 3).map((uName, idx) => (
              <View
                key={`${uName}-${idx}`}
                style={[styles.miniSeenAvatarItem, { marginLeft: idx > 0 ? -5 : 0 }]}
              >
                <Avatar name={uName} size={15} />
              </View>
            ))}
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerBlock: {
    position: 'relative',
  },
  wrapper: {
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  wrapperOwn: {
    justifyContent: 'flex-end',
  },
  wrapperOther: {
    justifyContent: 'flex-start',
  },
  avatarGutter: {
    marginRight: 8,
    marginBottom: 2,
  },
  bubble: {
    maxWidth: '79%',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    position: 'relative',
    ...SHADOWS.card,
  },
  bubbleOwn: {
    backgroundColor: COLORS.accent,
    borderBottomRightRadius: 4,
  },
  bubbleOwnMiddle: {
    borderBottomRightRadius: 16,
  },
  bubbleOther: {
    backgroundColor: COLORS.bgSecondary,
    borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  bubbleOtherMiddle: {
    borderBottomLeftRadius: 16,
  },
  bubbleHighlighted: {
    borderWidth: 1.5,
    borderColor: COLORS.accentLight,
  },
  heartBurstOverlay: {
    position: 'absolute',
    top: '25%',
    left: '40%',
    zIndex: 20,
  },
  heartBurstCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.bgSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.floating,
  },
  copiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(28, 25, 23, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    marginBottom: 6,
  },
  copiedBadgeText: {
    color: COLORS.textInverse,
    fontSize: 10,
    fontWeight: '600',
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  botIcon: {
    marginRight: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  aiMicroTag: {
    marginLeft: 6,
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: RADIUS.full,
  },
  aiMicroTagText: {
    color: COLORS.accentLight,
    fontSize: 9.5,
    fontWeight: '700',
  },
  quotedBox: {
    borderLeftWidth: 3,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 7,
  },
  quotedBoxOwn: {
    backgroundColor: 'rgba(250, 248, 245, 0.11)',
    borderLeftColor: '#D6C7B8',
  },
  quotedBoxOther: {
    backgroundColor: COLORS.bgPrimary,
    borderLeftColor: COLORS.accentLight,
  },
  quotedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  quotedAuthor: {
    fontSize: 11,
    fontWeight: '700',
  },
  quotedAuthorOwn: {
    color: '#E6DBD0',
  },
  quotedAuthorOther: {
    color: COLORS.accentLight,
  },
  quotedSnippet: {
    fontSize: 12,
    lineHeight: 16,
  },
  quotedSnippetOwn: {
    color: 'rgba(250, 248, 245, 0.82)',
  },
  quotedSnippetOther: {
    color: COLORS.textSecondary,
  },
  imageContainer: {
    marginBottom: 6,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.bgTertiary,
    position: 'relative',
  },
  imageAttachment: {
    width: 224,
    height: 156,
  },
  expandIconPill: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(28, 25, 23, 0.65)',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    fontSize: 15,
    lineHeight: 21,
    letterSpacing: -0.1,
  },
  contentOwn: {
    color: COLORS.textInverse,
  },
  contentOther: {
    color: COLORS.textPrimary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 5,
    gap: 5,
  },
  time: {
    fontSize: 10.5,
  },
  timeOwn: {
    color: 'rgba(250, 248, 245, 0.65)',
  },
  timeOther: {
    color: COLORS.textMuted,
  },
  receiptBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  receiptText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  statusDrawer: {
    marginTop: 8,
    paddingTop: 7,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statusDrawerOwn: {
    borderTopColor: 'rgba(250, 248, 245, 0.2)',
  },
  statusDrawerOther: {
    borderTopColor: COLORS.border,
  },
  statusDrawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 5,
  },
  statusDrawerTitle: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 3,
  },
  statusUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusUser: {
    fontSize: 11,
    fontWeight: '500',
  },
  statusMeta: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextOwn: {
    color: 'rgba(250, 248, 245, 0.9)',
  },
  statusTextOther: {
    color: COLORS.textSecondary,
  },
  actionDockWrap: {
    marginHorizontal: SPACING.md,
    marginTop: 6,
    marginBottom: 2,
    zIndex: 30,
  },
  actionDockRight: {
    alignItems: 'flex-end',
  },
  actionDockLeft: {
    alignItems: 'flex-start',
    marginLeft: 48,
  },
  reactionPillBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgSecondary,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    ...SHADOWS.floating,
  },
  reactionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionIconBtnActive: {
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.accentLight,
  },
  quickToolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  quickToolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.bgSecondary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  quickToolText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
  attachedReactionsBar: {
    position: 'absolute',
    bottom: -11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.bgSecondary,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.borderLight,
    ...SHADOWS.card,
  },
  attachedReactionsOwn: {
    right: 10,
  },
  attachedReactionsOther: {
    left: 10,
  },
  attachedReactionChip: {
    paddingHorizontal: 2,
  },
  miniSeenAvatarCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
    marginBottom: 2,
  },
  miniSeenAvatarItem: {
    borderWidth: 1.5,
    borderColor: COLORS.bgPrimary,
    borderRadius: 9,
  },
});
