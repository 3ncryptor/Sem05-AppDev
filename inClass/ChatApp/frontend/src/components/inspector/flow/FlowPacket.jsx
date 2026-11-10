/**
 * FlowPacket: one request travelling the architecture map (buildPlan.md 15).
 * It goes down the real path (screen -> ... -> the collection, or as far as it
 * got) as an outlined "GET" / "POST" packet, and comes back up as a filled
 * packet showing the status: green for ok, red for a failure. Background polls
 * are smaller and quieter. It announces its visits to the boxes (flowBus) so
 * each box glows exactly when the packet passes.
 */
import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { fonts } from '../../../constants/theme';
import { emitFlowVisit } from '../../../debug/flowBus';
import { routePolyline } from '../../../debug/flowLayout';
import { routeOf } from '../../../debug/flowPath';
import { useTheme } from '../../../hooks/useTheme';

const PILL_H = 18;
const POLL_SCALE = 0.75;

/** Position at distance d along a polyline (worklet). */
function pointAt(xs, ys, lengths, d) {
  'worklet';
  for (let index = 1; index < lengths.length; index += 1) {
    if (d <= lengths[index]) {
      const span = lengths[index] - lengths[index - 1] || 1;
      const t = (d - lengths[index - 1]) / span;
      return {
        x: xs[index - 1] + (xs[index] - xs[index - 1]) * t,
        y: ys[index - 1] + (ys[index] - ys[index - 1]) * t,
      };
    }
  }
  return { x: xs[xs.length - 1] ?? 0, y: ys[ys.length - 1] ?? 0 };
}

/**
 * @param {object} props
 * @param {object} props.row networkStore row (finished)
 * @param {object} props.nodes layout boxes
 * @param {number} props.oneWayMs time to go down (the same again to come back)
 * @param {(key: string) => void} props.onDone
 * @param {string} props.packetKey
 */
export function FlowPacket({ row, nodes, oneWayMs, onDone, packetKey }) {
  const { colors } = useTheme();
  const progress = useSharedValue(0);
  const route = routeOf(row);
  const line = routePolyline(route.down, nodes);
  const isOk = row.state === 'ok';
  const tone = !isOk ? 'bad' : row.isPoll ? 'poll' : 'ok';
  const color = isOk ? colors.success : colors.dangerOnSlab;

  useEffect(() => {
    // announce every visit once: down, then back up (not past the stop)
    route.down.forEach((node, index) => {
      const at = line.total ? (line.lengths[index] / line.total) * oneWayMs : 0;
      const back = 2 * oneWayMs - at;
      const isCollection = index === route.down.length - 1 && route.collection === node;
      emitFlowVisit({ node, delayMs: at, tone, op: isCollection ? route.op : undefined });
      if (index < route.down.length - 1) emitFlowVisit({ node, delayMs: back, tone });
    });
    progress.set(
      // linear, so each box lights exactly when the packet reaches it
      withTiming(2, { duration: oneWayMs * 2, easing: Easing.linear }, (done) => {
        if (done) scheduleOnRN(onDone, packetKey);
      }),
    );
    // a packet is planned once, when it is created
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // the path is copied to the UI thread once; the worklet only captures primitives and it
  const path = useSharedValue(line);
  const scale = row.isPoll ? POLL_SCALE : 1;
  const moveStyle = useAnimatedStyle(() => {
    const { xs, ys, lengths, total } = path.get();
    const p = progress.get();
    const d = p <= 1 ? p * total : (2 - p) * total;
    const point = pointAt(xs, ys, lengths, d);
    return {
      opacity: p > 1.97 ? 0 : 1,
      transform: [{ translateX: point.x - 22 }, { translateY: point.y - PILL_H / 2 }, { scale }],
    };
  });
  const goingStyle = useAnimatedStyle(() => ({ opacity: progress.get() <= 1 ? 1 : 0 }));
  const comingStyle = useAnimatedStyle(() => ({ opacity: progress.get() > 1 ? 1 : 0 }));

  return (
    <Animated.View pointerEvents="none" style={[styles.packet, moveStyle]}>
      <Animated.View
        style={[
          styles.pill,
          styles.outline,
          { borderColor: color, backgroundColor: colors.slab },
          goingStyle,
        ]}
      >
        <Text style={[styles.label, { color }]}>{row.method}</Text>
      </Animated.View>
      <Animated.View style={[styles.pill, styles.filled, { backgroundColor: color }, comingStyle]}>
        <Text style={[styles.label, { color: '#0A0D0C' }]}>{row.status ?? 'ERR'}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  packet: { position: 'absolute', top: 0, left: 0, width: 44, height: PILL_H },
  pill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: PILL_H / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outline: { borderWidth: 1.5 },
  filled: {},
  label: { fontFamily: fonts.semibold, fontSize: 10 },
});
