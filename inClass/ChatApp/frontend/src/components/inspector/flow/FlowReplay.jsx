/**
 * FlowReplay: one request, played step by step on the same map (buildPlan.md
 * 15, screen 4), for explaining the system in the viva. The packet glides to
 * each box in turn; the box lights up and the others dim; a caption says what
 * happens there in plain words, with the exact data under it.
 * Controls: previous / play-pause / next, speed, and tap the step dots to jump.
 */
import Pause from 'lucide-react-native/icons/pause';
import Play from 'lucide-react-native/icons/play';
import SkipBack from 'lucide-react-native/icons/skip-back';
import SkipForward from 'lucide-react-native/icons/skip-forward';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { durations, EASE_IN_OUT } from '../../../constants/motion';
import { fonts, radius, space } from '../../../constants/theme';
import { describeRow } from '../../../debug/describeRequest';
import { centerOf, flowLayout } from '../../../debug/flowLayout';
import { replaySteps } from '../../../debug/flowReplay';
import { replayInFlow } from '../../../debug/inspectorStore';
import { networkStore } from '../../../debug/networkStore';
import { useStore } from '../../../hooks/useStore';
import { useTheme } from '../../../hooks/useTheme';
import { sessionStore } from '../../../store/sessionStore';
import { Icon } from '../../ui/Icon';
import { InspectorChip } from '../InspectorChip';
import { ArchitectureMap } from './ArchitectureMap';

const STEP_MS = 2400;
const SPEEDS = [0.25, 0.5, 1];
const PICKABLE = 8;
const DOT = 12;
const CAPTION_IN = FadeIn.duration(durations.base);

/**
 * @param {object} props
 * @param {number} props.width
 * @param {string | null} props.replayId
 * @param {object[]} props.serverEntries server log lines
 * @param {boolean} props.hasServerLogs
 */
export function FlowReplay({ width, replayId, serverEntries, hasServerLogs }) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const requests = useStore(networkStore, (state) => state.requests);
  const session = useStore(sessionStore);
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(0.5);
  const layout = flowLayout(width);

  const finished = requests.filter((row) => row.state !== 'pending');
  const choices = [...finished]
    .reverse()
    .filter((row) => !row.isPoll)
    .slice(0, PICKABLE);
  // With nothing chosen, pin the newest request once, so a new request finishing does not
  // restart the replay in the middle of an explanation.
  const [pinnedId, setPinnedId] = useState(null);
  if (!replayId && !pinnedId && choices[0]) setPinnedId(choices[0].id);
  const chosenId = replayId ?? pinnedId;
  const row = finished.find((item) => item.id === chosenId) ?? choices[0] ?? finished.at(-1);
  const steps = row
    ? replaySteps(row, {
        name: session.name,
        baseUrl: session.baseUrl,
        serverLines: serverEntries.filter((entry) => entry.requestId === row.id),
        hasServerLogs,
      })
    : [];
  const current = steps[Math.min(step, steps.length - 1)];
  const passed = new Set(steps.slice(0, step + 1).map((item) => item.node));

  // restart when another request is chosen
  const rowId = row?.id;
  const [shownId, setShownId] = useState(rowId);
  if (rowId !== shownId) {
    setShownId(rowId);
    setStep(0);
    setIsPlaying(true);
  }

  // playing stops by itself at the last step (derived, not stored)
  const isAtEnd = step >= steps.length - 1;
  const isRunning = isPlaying && !isAtEnd;
  useEffect(() => {
    if (!isRunning) return undefined;
    const timer = setTimeout(() => setStep((value) => value + 1), STEP_MS / (speed * 2));
    return () => clearTimeout(timer);
  }, [isRunning, step, speed]);

  const target = current ? centerOf(layout.nodes[current.node]) : { x: 0, y: 0 };
  const x = useSharedValue(target.x);
  const y = useSharedValue(target.y);
  useEffect(() => {
    const move = { duration: reduceMotion ? 0 : 520 / speed, easing: EASE_IN_OUT };
    x.set(withTiming(target.x, move));
    y.set(withTiming(target.y, move));
  }, [target.x, target.y, speed, reduceMotion, x, y]);
  const packetStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() - 22 }, { translateY: y.get() - 9 }],
  }));

  if (!row) {
    return (
      <Text style={[styles.empty, { color: colors.textOnSlabMuted }]}>
        No requests yet. Use the app, then come back to replay one.
      </Text>
    );
  }

  const isBack = Boolean(current?.isReturn);
  const isOk = row.state === 'ok';
  const packetColor = isBack ? (isOk ? colors.success : colors.dangerOnSlab) : colors.textOnSlab;
  const focusOf = (id) => (id === current?.node ? 'lit' : passed.has(id) ? 'normal' : 'dim');

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {choices.map((item) => (
          <InspectorChip
            key={item.id}
            label={`${describeRow(item)} · ${item.status ?? 'failed'}`}
            selected={item.id === row.id}
            onPress={() => replayInFlow(item.id)}
          />
        ))}
      </ScrollView>

      <ArchitectureMap
        width={width}
        layout={layout}
        isFlowing={false}
        fromCode={!hasServerLogs}
        focusOf={focusOf}
        onPressNode={() => {}}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.packet,
            isBack
              ? { backgroundColor: packetColor }
              : { borderColor: packetColor, borderWidth: 1.5, backgroundColor: colors.slab },
            packetStyle,
          ]}
        >
          <Text style={[styles.packetText, { color: isBack ? '#0A0D0C' : packetColor }]}>
            {isBack ? (row.status ?? 'ERR') : row.method}
          </Text>
        </Animated.View>
      </ArchitectureMap>

      <Animated.View
        key={step}
        entering={CAPTION_IN}
        style={[styles.caption, { backgroundColor: colors.slabRaised }]}
      >
        <Text style={[styles.stepCount, { color: colors.textOnSlabMuted }]}>
          step {step + 1} of {steps.length}
          {current?.fromCode ? ' · from the code' : ''}
        </Text>
        <Text style={[styles.plain, { color: colors.textOnSlab }]}>{current?.plain}</Text>
        <Text style={[styles.technical, { color: colors.textOnSlabMuted }]} selectable>
          {current?.technical}
        </Text>
      </Animated.View>

      <View style={styles.dots} accessibilityLabel={`Step ${step + 1} of ${steps.length}`}>
        {steps.map((item, index) => (
          <Pressable
            key={`${item.node}-${index}`}
            onPress={() => {
              setIsPlaying(false);
              setStep(index);
            }}
            hitSlop={6}
            accessibilityLabel={`Go to step ${index + 1}`}
          >
            <View
              style={[
                styles.dot,
                { backgroundColor: index <= step ? colors.textOnSlab : colors.slabRaised },
              ]}
            />
          </Pressable>
        ))}
      </View>

      <View style={styles.controls}>
        <Control
          icon={SkipBack}
          label="Previous step"
          onPress={() => {
            setIsPlaying(false);
            setStep(Math.max(0, step - 1));
          }}
        />
        <Control
          icon={isRunning ? Pause : Play}
          label={isRunning ? 'Pause' : 'Play'}
          isMain
          onPress={() => {
            if (isAtEnd) {
              setStep(0);
              setIsPlaying(true);
            } else {
              setIsPlaying(!isRunning);
            }
          }}
        />
        <Control
          icon={SkipForward}
          label="Next step"
          onPress={() => {
            setIsPlaying(false);
            setStep(Math.min(steps.length - 1, step + 1));
          }}
        />
        <View style={styles.speeds}>
          {SPEEDS.map((value) => (
            <InspectorChip
              key={value}
              label={`${value}x`}
              selected={speed === value}
              onPress={() => setSpeed(value)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function Control({ icon, label, onPress, isMain = false }) {
  const { colors } = useTheme();
  const size = isMain ? 52 : 42;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.control,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isMain ? colors.textOnSlab : colors.slabRaised,
        },
      ]}
    >
      <Icon as={icon} color={isMain ? '#0A0D0C' : colors.textOnSlab} size={isMain ? 22 : 18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  chips: { gap: space.xs },
  packet: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 44,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packetText: { fontFamily: fonts.semibold, fontSize: 10 },
  caption: { borderRadius: radius.bubble, padding: space.md, gap: 6 },
  stepCount: { fontFamily: fonts.medium, fontSize: 12 },
  plain: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22 },
  technical: { fontFamily: fonts.mono, fontSize: 11, lineHeight: 16 },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  control: { alignItems: 'center', justifyContent: 'center' },
  speeds: { flexDirection: 'row', gap: 4, marginLeft: 'auto' },
  empty: { fontFamily: fonts.regular, fontSize: 13, textAlign: 'center', marginTop: space.xl },
});
