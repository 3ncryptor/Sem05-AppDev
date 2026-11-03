import React, { useMemo, useRef } from 'react';
import {
  Animated,
  Clipboard,
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
import {
  ConversationResponseDto,
  MessageResponseDto,
  UserResponseDto,
} from '../types/api';
import {
  formatRelativeTime,
  isFactBotName,
  resolveConversationTitle,
} from '../utils/format';
import { Avatar } from './Avatar';

interface ConversationRowProps {
  conversation: ConversationResponseDto;
  currentUserId?: string;
  usersById: Record<string, UserResponseDto>;
  lastMessage?: MessageResponseDto;
  isPinned?: boolean;
  isMuted?: boolean;
  onPress: () => void;
  onTogglePin?: () => void;
  onToggleMute?: () => void;
}

export const ConversationRow: React.FC<ConversationRowProps> = ({
  conversation,
  currentUserId,
  usersById,
  lastMessage,
  isPinned = false,
  isMuted = false,
  onPress,
  onTogglePin,
  onToggleMute,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const isSwipingRef = useRef(false);

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
      bounciness: 6,
    }).start();
  };

  // Horizontal swipe gesture: Swipe Right to Pin/Unpin, Swipe Left to Mute/Unmute
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 16 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.6,
        onPanResponderGrant: () => {
          isSwipingRef.current = true;
        },
        onPanResponderMove: (_, gesture) => {
          const clamped = Math.max(-92, Math.min(92, gesture.dx));
          translateX.setValue(clamped);
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > 64 && onTogglePin) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            onTogglePin();
          } else if (gesture.dx < -64 && onToggleMute) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            onToggleMute();
          }
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            speed: 28,
            bounciness: 6,
          }).start(() => {
            setTimeout(() => {
              isSwipingRef.current = false;
            }, 60);
          });
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            speed: 28,
            bounciness: 6,
          }).start(() => {
            isSwipingRef.current = false;
          });
        },
      }),
    [onToggleMute, onTogglePin, translateX],
  );

  const isGroup = conversation.type === 'GROUP';
  const title = resolveConversationTitle(conversation, currentUserId, usersById);
  const isBot = isFactBotName(title);

  const timeLabel = formatRelativeTime(
    lastMessage?.createdAt ?? conversation.createdAt,
  );

  const hasImage = Boolean(lastMessage?.imageInfo);
  const isLastFromMe = Boolean(
    lastMessage && currentUserId && lastMessage.senderId === currentUserId,
  );

  // Check if last message is unread for currentUserId
  const isUnreadForMe = Boolean(
    lastMessage &&
      currentUserId &&
      lastMessage.senderId !== currentUserId &&
      lastMessage.status?.[currentUserId]?.read === false,
  );

  // Check read receipt state when the last message was sent by me
  let myLastMessageAllRead = false;
  let myLastMessageDelivered = false;
  if (isLastFromMe && lastMessage?.status) {
    const others = Object.entries(lastMessage.status).filter(
      ([uid]) => uid !== currentUserId,
    );
    myLastMessageAllRead =
      others.length > 0 && others.every(([, st]) => st?.read);
    myLastMessageDelivered =
      others.length > 0 && others.some(([, st]) => st?.delivered || st?.read);
  }

  let previewText = 'Tap to start messaging';
  if (lastMessage) {
    const rawContent = lastMessage.content
      ? lastMessage.content.replace(/^> [^\n]+\n\n/, '')
      : '';
    const senderPrefix = isLastFromMe
      ? ''
      : isGroup && usersById[lastMessage.senderId]
        ? `${usersById[lastMessage.senderId].name.split('@')[0]}: `
        : '';
    if (rawContent) {
      previewText = `${senderPrefix}${rawContent}`;
    } else if (hasImage) {
      previewText = `${senderPrefix}Shared a photo`;
    }
  }

  const leftActionOpacity = translateX.interpolate({
    inputRange: [0, 70],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const rightActionOpacity = translateX.interpolate({
    inputRange: [-70, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.outer} {...panResponder.panHandlers}>
      {/* Background Swipe Rails */}
      <View style={styles.swipeRailContainer} pointerEvents="none">
        <Animated.View style={[styles.swipeActionLeft, { opacity: leftActionOpacity }]}>
          <Ionicons
            name={isPinned ? 'pin-outline' : 'pin'}
            size={17}
            color={COLORS.textInverse}
          />
          <Text style={styles.swipeActionText}>{isPinned ? 'Unpin' : 'Pin'}</Text>
        </Animated.View>

        <Animated.View style={[styles.swipeActionRight, { opacity: rightActionOpacity }]}>
          <Text style={styles.swipeActionText}>{isMuted ? 'Unmute' : 'Mute'}</Text>
          <Ionicons
            name={isMuted ? 'notifications-outline' : 'notifications-off-outline'}
            size={17}
            color={COLORS.textInverse}
          />
        </Animated.View>
      </View>

      <Pressable
        onPress={() => {
          if (!isSwipingRef.current) onPress();
        }}
        onLongPress={() => {
          if (onTogglePin) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            onTogglePin();
          } else {
            Clipboard.setString(conversation.id);
          }
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View
          style={[
            styles.card,
            isPinned && styles.cardPinned,
            isUnreadForMe && styles.cardUnread,
            {
              transform: [{ translateX }, { scale: scaleAnim }],
            },
          ]}
        >
          {/* Left Unread Accent Strip */}
          {isUnreadForMe && <View style={styles.unreadAccentBar} />}

          {/* Avatar with Online or Stacked Group Indicator */}
          <View style={styles.avatarContainer}>
            <Avatar name={title} size={52} isGroup={isGroup} />
            {!isGroup ? (
              <View
                style={[
                  styles.onlineDot,
                  { backgroundColor: isBot ? COLORS.accentLight : COLORS.success },
                ]}
              />
            ) : (
              <View style={styles.groupCountBadge}>
                <Text style={styles.groupCountText}>
                  {conversation.participants_ids.length}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.body}>
            <View style={styles.topLine}>
              <View style={styles.titleRow}>
                {isPinned && (
                  <View style={styles.pinIconWrap}>
                    <Ionicons name="pin" size={12} color={COLORS.accentLight} />
                  </View>
                )}
                <Text
                  style={[styles.title, isUnreadForMe && styles.titleUnread]}
                  numberOfLines={1}
                >
                  {title}
                </Text>
                {isBot && (
                  <View style={styles.botBadge}>
                    <Ionicons name="sparkles" size={10} color={COLORS.accentLight} />
                    <Text style={styles.botBadgeText}>AI</Text>
                  </View>
                )}
                {isMuted && (
                  <Ionicons
                    name="notifications-off-outline"
                    size={13}
                    color={COLORS.textMuted}
                    style={{ marginLeft: 5 }}
                  />
                )}
              </View>

              <Text
                style={[styles.timeText, isUnreadForMe && styles.timeTextUnread]}
              >
                {timeLabel}
              </Text>
            </View>

            <View style={styles.bottomLine}>
              <View style={styles.previewRow}>
                {/* Outgoing Read Receipt Icon right inside the conversation list */}
                {isLastFromMe && (
                  <View style={styles.inlineReceipt}>
                    <Ionicons
                      name={
                        myLastMessageAllRead || myLastMessageDelivered
                          ? 'checkmark-done'
                          : 'checkmark'
                      }
                      size={15}
                      color={
                        myLastMessageAllRead ? COLORS.info : COLORS.textMuted
                      }
                    />
                  </View>
                )}

                {hasImage && (
                  <Ionicons
                    name="image-outline"
                    size={14}
                    color={COLORS.textSecondary}
                    style={styles.previewIcon}
                  />
                )}

                <Text
                  style={[styles.preview, isUnreadForMe && styles.previewUnread]}
                  numberOfLines={1}
                >
                  {previewText}
                </Text>
              </View>

              {/* Right-side Unread Pill, Seen Status, or Quick Pin Action */}
              {isUnreadForMe ? (
                <View style={styles.unreadPill}>
                  <Text style={styles.unreadPillText}>NEW</Text>
                </View>
              ) : isLastFromMe ? (
                <View
                  style={[
                    styles.receiptCapsule,
                    myLastMessageAllRead && styles.receiptCapsuleSeen,
                  ]}
                >
                  <Text
                    style={[
                      styles.receiptLabel,
                      myLastMessageAllRead && styles.receiptLabelSeen,
                    ]}
                  >
                    {myLastMessageAllRead
                      ? 'Seen'
                      : myLastMessageDelivered
                        ? 'Delivered'
                        : 'Sent'}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={onTogglePin}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={isPinned ? 'pin' : 'chevron-forward'}
                    size={14}
                    color={isPinned ? COLORS.accentLight : COLORS.borderLight}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: 10,
    position: 'relative',
  },
  swipeRailContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: SPACING.lg,
    right: SPACING.lg,
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  swipeActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.accentLight,
    height: '100%',
    paddingHorizontal: 18,
    borderRadius: RADIUS.lg,
  },
  swipeActionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.textSecondary,
    height: '100%',
    paddingHorizontal: 18,
    borderRadius: RADIUS.lg,
    marginLeft: 'auto',
  },
  swipeActionText: {
    color: COLORS.textInverse,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: COLORS.bgSecondary,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  cardPinned: {
    backgroundColor: '#FAF8F4',
    borderColor: '#DFD7CA',
  },
  cardUnread: {
    borderColor: COLORS.accentLight,
    backgroundColor: '#FFFDFB',
  },
  unreadAccentBar: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 3.5,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: COLORS.accent,
  },
  avatarContainer: {
    position: 'relative',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    borderWidth: 2.2,
    borderColor: COLORS.bgSecondary,
  },
  groupCountBadge: {
    position: 'absolute',
    bottom: -1,
    right: -2,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.bgSecondary,
  },
  groupCountText: {
    color: COLORS.textInverse,
    fontSize: 9,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    marginLeft: 14,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING.sm,
  },
  pinIconWrap: {
    marginRight: 5,
    transform: [{ rotate: '35deg' }],
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 15.5,
    fontWeight: '600',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  titleUnread: {
    fontWeight: '700',
  },
  botBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 6,
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  botBadgeText: {
    color: COLORS.accentLight,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  timeText: {
    color: COLORS.textMuted,
    fontSize: 11.5,
    fontWeight: '500',
  },
  timeTextUnread: {
    color: COLORS.accentLight,
    fontWeight: '700',
  },
  bottomLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING.sm,
  },
  inlineReceipt: {
    marginRight: 4,
  },
  previewIcon: {
    marginRight: 4,
  },
  preview: {
    color: COLORS.textSecondary,
    fontSize: 13.5,
    flexShrink: 1,
  },
  previewUnread: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  unreadPill: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  unreadPillText: {
    color: COLORS.textInverse,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  receiptCapsule: {
    backgroundColor: COLORS.bgPrimary,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  receiptCapsuleSeen: {
    backgroundColor: 'rgba(91, 123, 154, 0.12)',
  },
  receiptLabel: {
    color: COLORS.textMuted,
    fontSize: 10.5,
    fontWeight: '600',
  },
  receiptLabelSeen: {
    color: COLORS.info,
    fontWeight: '700',
  },
});
