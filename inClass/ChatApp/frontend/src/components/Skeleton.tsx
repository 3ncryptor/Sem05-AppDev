import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../constants/theme';

interface SkeletonBoxProps {
  width?: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const SkeletonBox: React.FC<SkeletonBoxProps> = ({
  width = '100%',
  height,
  borderRadius = RADIUS.sm,
  style,
}) => {
  const pulseAnim = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.45,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        styles.box,
        {
          width,
          height,
          borderRadius,
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
};

/**
 * Shimmering skeleton rows for the Conversations and Directory lists
 */
export const ConversationListSkeleton: React.FC<{ count?: number }> = ({
  count = 6,
}) => {
  return (
    <View style={styles.listWrapper}>
      {Array.from({ length: count }).map((_, idx) => (
        <View key={idx} style={styles.rowCard}>
          <SkeletonBox width={50} height={50} borderRadius={25} />
          <View style={styles.rowBody}>
            <View style={styles.rowTop}>
              <SkeletonBox width={idx % 2 === 0 ? '48%' : '62%'} height={15} />
              <SkeletonBox width={42} height={11} />
            </View>
            <SkeletonBox
              width={idx % 2 === 0 ? '82%' : '68%'}
              height={13}
              style={{ marginTop: 8 }}
            />
          </View>
        </View>
      ))}
    </View>
  );
};

/**
 * Shimmering alternating left/right chat bubble skeletons for the Chat Room
 */
export const ChatHistorySkeleton: React.FC = () => {
  const bubbles = [
    { own: false, width: '66%' as const, height: 52 },
    { own: true, width: '54%' as const, height: 46 },
    { own: false, width: '74%' as const, height: 68 },
    { own: true, width: '62%' as const, height: 48 },
    { own: false, width: '48%' as const, height: 44 },
    { own: true, width: '70%' as const, height: 58 },
  ];

  return (
    <View style={styles.chatWrapper}>
      {bubbles.map((b, i) => (
        <View
          key={i}
          style={[
            styles.bubbleRow,
            b.own ? styles.bubbleRowOwn : styles.bubbleRowOther,
          ]}
        >
          <SkeletonBox
            width={b.width}
            height={b.height}
            borderRadius={20}
            style={b.own ? styles.skeletonBubbleOwn : styles.skeletonBubbleOther}
          />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    backgroundColor: '#E3DDD2',
  },
  listWrapper: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    gap: 10,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: COLORS.bgSecondary,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  rowBody: {
    flex: 1,
    marginLeft: 14,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatWrapper: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    gap: 12,
  },
  bubbleRow: {
    flexDirection: 'row',
  },
  bubbleRowOwn: {
    justifyContent: 'flex-end',
  },
  bubbleRowOther: {
    justifyContent: 'flex-start',
  },
  skeletonBubbleOwn: {
    backgroundColor: '#D5CEC2',
  },
  skeletonBubbleOther: {
    backgroundColor: '#E8E3DA',
  },
});

