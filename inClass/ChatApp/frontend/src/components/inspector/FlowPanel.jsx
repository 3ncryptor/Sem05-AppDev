/**
 * FlowPanel: the Inspector's "flow" tab. Live Wire on top, then the
 * slow-mo and explain switches. In explain mode, tap a dot (or pick a
 * recent request) to step through what really happened to it.
 */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  FLOW_DOT_WINDOW_MS,
  FLOW_MAX_DOTS,
  FLOW_RIPPLE_MS,
  FLOW_SLOW_MO,
} from '../../constants/config';
import { fonts, gradient, space, type } from '../../constants/theme';
import { activeDots, activeRipples, explainSteps } from '../../debug/flowEvents';
import { networkStore } from '../../debug/networkStore';
import { useNow } from '../../hooks/useNow';
import { useStore } from '../../hooks/useStore';
import { useTheme } from '../../hooks/useTheme';
import { sessionStore } from '../../store/sessionStore';
import { log } from '../../utils/logger';
import { ExplainSteps } from './ExplainSteps';
import { InspectorChip } from './InspectorChip';
import { LiveWire } from './LiveWire';

const CLOCK_MS = 500;
const RECENT_TO_PICK = 6;

function Legend() {
  const { colors } = useTheme();
  const item = (color, text) => (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[type.caption, { color: colors.textOnSlabMuted }]}>{text}</Text>
    </View>
  );
  return (
    <View style={styles.legend}>
      {item(gradient.colors[1], 'send')}
      {item('#FFFFFF', 'read')}
      {item(colors.textOnSlabMuted, 'poll (no websockets, so we ask)')}
      {item(colors.success, 'ok')}
      {item(colors.danger, 'error')}
    </View>
  );
}

function RecentPicker({ requests, onPick }) {
  const { colors } = useTheme();
  const recent = requests
    .filter((row) => !row.isPoll)
    .slice(-RECENT_TO_PICK)
    .reverse();
  if (!recent.length) {
    return (
      <Text style={[type.meta, { color: colors.textOnSlabMuted }]}>
        send a message, then pick it here or tap its dot
      </Text>
    );
  }
  return (
    <View style={styles.picker}>
      <Text style={[type.meta, { color: colors.textOnSlabMuted }]}>pick a request to explain</Text>
      {recent.map((row) => (
        <Pressable
          key={row.id}
          onPress={() => onPick(row.id)}
          accessibilityRole="button"
          accessibilityLabel={`Explain ${row.method} ${row.path}`}
          style={styles.pickRow}
        >
          <Text style={[styles.mono, { color: colors.textOnSlab }]} numberOfLines={1}>
            {row.method} {row.path} {row.status ?? '...'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/**
 * @param {object} props
 * @param {{ status: string, entries: object[] }} props.server
 */
export function FlowPanel({ server }) {
  const { colors } = useTheme();
  const requests = useStore(networkStore, (state) => state.requests);
  const session = useStore(sessionStore);
  const [isSlow, setIsSlow] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const speed = isSlow ? FLOW_SLOW_MO : 1;
  const now = useNow(CLOCK_MS);

  const dots = activeDots(requests, now, {
    windowMs: FLOW_DOT_WINDOW_MS * speed,
    max: FLOW_MAX_DOTS,
  });
  const ripples = activeRipples(server.entries, now, FLOW_RIPPLE_MS * speed);
  const selected = requests.find((row) => row.id === selectedId) ?? null;
  const steps = selected
    ? explainSteps(selected, {
        baseUrl: session.baseUrl,
        name: session.name,
        serverLines: server.entries.filter((entry) => entry.requestId === selected.id),
      })
    : [];
  const activeNode = steps.length ? steps[Math.min(stepIndex, steps.length - 1)].node : null;

  function pick(id) {
    if (!isExplaining) setIsExplaining(true);
    setSelectedId(id);
    setStepIndex(0);
    log.app(`explain request #${id}`);
  }

  function stopExplaining() {
    setSelectedId(null);
    setStepIndex(0);
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <LiveWire
        dots={dots}
        ripples={ripples}
        speed={speed}
        activeNode={activeNode}
        selectedId={selectedId}
        onPick={pick}
      />
      <Legend />
      {server.status !== 'available' ? (
        <Text style={[type.caption, { color: colors.textOnSlabMuted }]}>
          background ripples need server logs; app-side dots always work
        </Text>
      ) : null}
      <View style={styles.switches}>
        <InspectorChip label="slow-mo" selected={isSlow} onPress={() => setIsSlow(!isSlow)} />
        <InspectorChip
          label="explain"
          selected={isExplaining}
          onPress={() => {
            setIsExplaining(!isExplaining);
            stopExplaining();
          }}
        />
      </View>
      {isExplaining && steps.length ? (
        <ExplainSteps
          steps={steps}
          index={Math.min(stepIndex, steps.length - 1)}
          onStep={setStepIndex}
          onClose={stopExplaining}
        />
      ) : null}
      {isExplaining && !steps.length ? <RecentPicker requests={requests} onPick={pick} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.sm, paddingBottom: space.xl },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: space.xxs },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  switches: { flexDirection: 'row', gap: space.xs },
  picker: { gap: space.xxs },
  pickRow: { paddingVertical: space.xs },
  mono: { fontFamily: fonts.mono, fontSize: 12 },
});
