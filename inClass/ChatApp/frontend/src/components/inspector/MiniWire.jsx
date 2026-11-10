/**
 * MiniWire: the overview's small animated picture of the system:
 *
 *   (app) ════════► (server) ════════► (database)
 *         ◄════════          ◄════════
 *
 * One pulse per finished request: it runs along the top lane to the server
 * (and on to the database when the request touches it), then home along the
 * bottom lane. Green for ok, red for a failure (a failure that never reached
 * the server turns back halfway). Nothing moves without traffic.
 */
import Database from 'lucide-react-native/icons/database';
import Server from 'lucide-react-native/icons/server';
import Smartphone from 'lucide-react-native/icons/smartphone';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { fonts } from '../../constants/theme';
import { networkStore } from '../../debug/networkStore';
import { touchesDatabase } from '../../debug/flowPath';
import { useTheme } from '../../hooks/useTheme';
import { Icon } from '../ui/Icon';

const HEIGHT = 96;
const NODE = 44;
const UPPER = 30;
const LOWER = 58;
const RUN_MS = 1100;
const MAX_PULSES = 8;
const SEEN_LIMIT = 600;
const DOT = 7;

function Pulse({ pulse, width, onDone }) {
  const progress = useSharedValue(0);
  const appX = NODE / 2;
  const serverX = width / 2;
  const dbX = width - NODE / 2;
  const farX = pulse.reachedServer ? (pulse.toDatabase ? dbX : serverX) : (appX + serverX) / 2;

  useEffect(() => {
    progress.set(
      withTiming(1, { duration: RUN_MS, easing: Easing.inOut(Easing.quad) }, (done) => {
        if (done) scheduleOnRN(onDone, pulse.key);
      }),
    );
    // a pulse is planned once; onDone changes identity every render and must not restart it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => {
    const p = progress.get();
    const out = p < 0.5;
    const t = out ? p * 2 : (p - 0.5) * 2;
    const x = out ? appX + (farX - appX) * t : farX - (farX - appX) * t;
    return {
      opacity: p < 0.04 || p > 0.96 ? 0 : 1,
      transform: [{ translateX: x - DOT / 2 }, { translateY: (out ? UPPER : LOWER) - DOT / 2 }],
    };
  });

  return <Animated.View style={[styles.pulse, { backgroundColor: pulse.color }, style]} />;
}

/** @param {{ width: number }} props */
export function MiniWire({ width }) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const [pulses, setPulses] = useState([]);

  useEffect(() => {
    const keyOf = (row) => `${row.id}:${row.state}`;
    let seen = new Set(networkStore.get().requests.map(keyOf));
    return networkStore.subscribe((state) => {
      const finished = state.requests.filter(
        (row) => row.state !== 'pending' && !seen.has(keyOf(row)),
      );
      finished.forEach((row) => seen.add(keyOf(row)));
      // keep the memory of seen requests to what the store still holds
      if (seen.size > SEEN_LIMIT) seen = new Set(state.requests.map(keyOf));
      if (!finished.length) return;
      const fresh = finished.map((row) => ({
        key: `${row.id}:${row.state}`,
        color: row.state === 'ok' ? colors.success : colors.dangerOnSlab,
        reachedServer: row.status !== undefined,
        toDatabase: row.state === 'ok' && touchesDatabase(row),
      }));
      setPulses((current) => [...current, ...fresh].slice(-MAX_PULSES));
    });
  }, [colors.success, colors.dangerOnSlab]);

  function remove(key) {
    setPulses((current) => current.filter((item) => item.key !== key));
  }

  const node = (icon, label, align) => (
    <View style={[styles.node, align]}>
      <View style={[styles.circle, { backgroundColor: colors.slabRaised }]}>
        <Icon as={icon} color={colors.textOnSlab} size={20} />
      </View>
      <Text style={[styles.label, { color: colors.textOnSlabMuted }]}>{label}</Text>
    </View>
  );

  return (
    <View
      style={[styles.wrap, { width }]}
      accessibilityLabel="The app, the server and the database"
    >
      <View style={[styles.lane, { top: UPPER, backgroundColor: colors.slabRaised }]} />
      <View style={[styles.lane, { top: LOWER, backgroundColor: colors.slabRaised }]} />
      {node(Smartphone, 'app', styles.left)}
      {node(Server, 'server', styles.middle)}
      {node(Database, 'database', styles.right)}
      {reduceMotion || !width
        ? null
        : pulses.map((pulse) => (
            <Pulse key={pulse.key} pulse={pulse} width={width} onDone={remove} />
          ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: HEIGHT },
  lane: { position: 'absolute', left: NODE / 2, right: NODE / 2, height: 2, borderRadius: 1 },
  node: { position: 'absolute', top: UPPER - NODE / 2 + 14, alignItems: 'center', gap: 4 },
  left: { left: 0 },
  middle: { left: '50%', marginLeft: -NODE / 2 },
  right: { right: 0 },
  circle: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontFamily: fonts.medium, fontSize: 11 },
  pulse: { position: 'absolute', top: 0, left: 0, width: DOT, height: DOT, borderRadius: DOT / 2 },
});
