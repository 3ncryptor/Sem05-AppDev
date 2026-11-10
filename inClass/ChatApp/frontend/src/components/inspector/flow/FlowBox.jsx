/**
 * FlowBox: one part of the architecture on the flow map (a screen, the
 * AuthGuard, a MongoDB collection ...). It glows when a packet passes:
 * green for ok, red for a failure, softer for a background poll. A database
 * collection also shows a tiny table: a read lights its rows, a write slides a
 * new row in. In replay the current box is lit and the others are dimmed.
 */
import Cog from 'lucide-react-native/icons/cog';
import Hash from 'lucide-react-native/icons/hash';
import Layers from 'lucide-react-native/icons/layers';
import Route from 'lucide-react-native/icons/route';
import Send from 'lucide-react-native/icons/send';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import Smartphone from 'lucide-react-native/icons/smartphone';
import Table2 from 'lucide-react-native/icons/table-2';
import Wifi from 'lucide-react-native/icons/wifi';
import DatabaseZap from 'lucide-react-native/icons/database-zap';
import { memo, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { EASE_OUT } from '../../../constants/motion';
import { fonts, gradient } from '../../../constants/theme';
import { onFlowVisit } from '../../../debug/flowBus';
import { nodeInfo } from '../../../debug/flowPath';
import { useTheme } from '../../../hooks/useTheme';
import { Icon } from '../../ui/Icon';

const ICONS = {
  screen: Smartphone,
  store: Layers,
  client: Send,
  http: Wifi,
  middleware: Hash,
  guard: ShieldCheck,
  controller: Route,
  service: Cog,
  prisma: DatabaseZap,
};
const COLLECTIONS = ['users', 'conversations', 'messages', 'files'];
const GLOW_IN_MS = 140;
const GLOW_OUT_MS = 520;
const ROWS = 3;

/**
 * @param {object} props
 * @param {string} props.id node id
 * @param {{ x: number, y: number, w: number, h: number }} props.box
 * @param {'lit' | 'dim' | 'normal'} [props.focus] replay emphasis
 * @param {(id: string) => void} props.onPress
 */
function FlowBoxView({ id, box, focus = 'normal', onPress }) {
  const { colors } = useTheme();
  const glow = useSharedValue(0);
  const tone = useSharedValue(0); // 0 ok, 1 bad, 0.5 poll (mixes a calmer colour)
  const read = useSharedValue(0);
  const write = useSharedValue(0);
  const isCollection = COLLECTIONS.includes(id);
  const info = nodeInfo(id);

  // Each visit waits in JS, then plays: a second withDelay on the same shared value would
  // cancel the first, so the way down would never glow (only the way back).
  useEffect(() => {
    const timers = new Set();
    const play = (visit) => {
      tone.set(visit.tone === 'bad' ? 1 : visit.tone === 'poll' ? 0.5 : 0);
      glow.set(
        withSequence(
          withTiming(visit.tone === 'poll' ? 0.55 : 1, { duration: GLOW_IN_MS, easing: EASE_OUT }),
          withTiming(0, { duration: GLOW_OUT_MS }),
        ),
      );
      if (!isCollection || visit.tone === 'bad') return;
      const target = visit.op === 'write' ? write : read;
      target.set(
        withSequence(
          withTiming(1, { duration: 260, easing: EASE_OUT }),
          withTiming(0, { duration: 600 }),
        ),
      );
    };
    const stop = onFlowVisit((visit) => {
      if (visit.node !== id) return;
      const timer = setTimeout(
        () => {
          timers.delete(timer);
          play(visit);
        },
        Math.max(0, visit.delayMs),
      );
      timers.add(timer);
    });
    return () => {
      stop();
      timers.forEach(clearTimeout);
    };
  }, [id, isCollection, glow, tone, read, write]);

  const ok = colors.success;
  const bad = colors.dangerOnSlab;
  const calm = gradient.colors[2];
  const boxStyle = useAnimatedStyle(() => {
    const lit = interpolateColor(tone.get(), [0, 0.5, 1], [ok, calm, bad]);
    return {
      borderColor: interpolateColor(glow.get(), [0, 1], ['rgba(255,255,255,0.08)', lit]),
      transform: [{ scale: 1 + 0.04 * glow.get() }],
    };
  });
  const rowStyle = useAnimatedStyle(() => ({ opacity: 0.35 + 0.65 * read.get() }));
  const newRowStyle = useAnimatedStyle(() => ({
    opacity: write.get(),
    transform: [{ translateX: (1 - write.get()) * -12 }],
  }));

  const opacity = focus === 'dim' ? 0.35 : 1;
  const background = focus === 'lit' ? colors.textOnSlab : colors.slabRaised;
  const ink = focus === 'lit' ? '#0A0D0C' : colors.textOnSlab;

  return (
    <Pressable
      onPress={() => onPress(id)}
      style={[styles.hit, { left: box.x, top: box.y, width: box.w, height: box.h, opacity }]}
      accessibilityRole="button"
      accessibilityLabel={`${info.title}. ${info.plain}`}
    >
      <Animated.View style={[styles.box, { backgroundColor: background }, boxStyle]}>
        <View style={styles.head}>
          <Icon as={isCollection ? Table2 : ICONS[id]} color={ink} size={14} />
          <Text style={[styles.title, { color: ink }]} numberOfLines={1}>
            {info.title}
          </Text>
        </View>
        {isCollection ? (
          <View style={styles.table}>
            {Array.from({ length: ROWS }, (_, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.row,
                  { backgroundColor: ink, width: `${90 - index * 18}%` },
                  rowStyle,
                ]}
              />
            ))}
            <Animated.View
              style={[styles.row, styles.newRow, { backgroundColor: ok }, newRowStyle]}
            />
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

export const FlowBox = memo(FlowBoxView);

const styles = StyleSheet.create({
  hit: { position: 'absolute' },
  box: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 6,
    justifyContent: 'center',
    gap: 5,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  title: { flexShrink: 1, fontFamily: fonts.medium, fontSize: 11 },
  table: { gap: 3 },
  row: { height: 3, borderRadius: 2 },
  newRow: { width: '60%' },
});
