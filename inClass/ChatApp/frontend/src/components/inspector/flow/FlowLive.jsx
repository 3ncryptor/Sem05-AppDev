/**
 * FlowLive: the architecture map with every request travelling through it as
 * it happens (buildPlan.md 15, screen 3). A polling strip underneath ticks
 * once per background check. Tap a box to learn what it does.
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { FLOW_SLOW_MO } from '../../../constants/config';
import { fonts, space } from '../../../constants/theme';
import { flowLayout } from '../../../debug/flowLayout';
import { networkStore } from '../../../debug/networkStore';
import { useNow } from '../../../hooks/useNow';
import { useStore } from '../../../hooks/useStore';
import { useTheme } from '../../../hooks/useTheme';
import { InspectorChip } from '../InspectorChip';
import { ArchitectureMap } from './ArchitectureMap';
import { FlowPacket } from './FlowPacket';
import { NodeInfoCard } from './NodeInfoCard';

const ONE_WAY_MS = 1100;
const MAX_PACKETS = 8;
const SEEN_LIMIT = 600;
const STRIP_WINDOW_MS = 30000;
const TICK_MS = 1000;

function PollingStrip({ requests, now, width }) {
  const { colors } = useTheme();
  const polls = requests.filter((row) => row.isPoll && now - row.startedAt < STRIP_WINDOW_MS);
  return (
    <View style={styles.strip}>
      <Text style={[styles.stripTitle, { color: colors.textOnSlabMuted }]}>
        background checks (polling), last 30 s: {polls.length}
      </Text>
      <View style={[styles.track, { width, backgroundColor: colors.slabRaised }]}>
        {polls.map((row) => (
          <View
            key={row.id}
            style={[
              styles.tick,
              {
                left: (1 - (now - row.startedAt) / STRIP_WINDOW_MS) * (width - 3),
                backgroundColor:
                  row.state === 'error' ? colors.dangerOnSlab : colors.textOnSlabMuted,
              },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.note, { color: colors.textOnSlabMuted }]}>
        The server cannot push, so the app asks on a timer. Each tick is one ask.
      </Text>
    </View>
  );
}

/**
 * @param {object} props
 * @param {number} props.width
 * @param {boolean} props.fromCode
 */
export function FlowLive({ width, fromCode }) {
  const reduceMotion = useReducedMotion();
  const requests = useStore(networkStore, (state) => state.requests);
  const now = useNow(TICK_MS);
  const [packets, setPackets] = useState([]);
  const [isSlow, setIsSlow] = useState(false);
  const [showPolls, setShowPolls] = useState(true);
  const [picked, setPicked] = useState(null);
  const layout = flowLayout(width);
  const oneWayMs = ONE_WAY_MS * (isSlow ? FLOW_SLOW_MO : 1);

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
      const fresh = finished.filter((row) => showPolls || !row.isPoll);
      if (!fresh.length) return;
      setPackets((current) =>
        [...current, ...fresh.map((row) => ({ key: `${row.id}:${row.state}`, row }))].slice(
          -MAX_PACKETS,
        ),
      );
    });
  }, [showPolls]);

  function remove(key) {
    setPackets((current) => current.filter((packet) => packet.key !== key));
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.chips}>
        <InspectorChip label="slow-mo" selected={isSlow} onPress={() => setIsSlow(!isSlow)} />
        <InspectorChip
          label="show polls"
          selected={showPolls}
          onPress={() => setShowPolls(!showPolls)}
        />
      </View>
      <ArchitectureMap
        width={width}
        layout={layout}
        isFlowing={packets.length > 0}
        fromCode={fromCode}
        onPressNode={setPicked}
      >
        {reduceMotion
          ? null
          : packets.map((packet) => (
              <FlowPacket
                key={packet.key}
                packetKey={packet.key}
                row={packet.row}
                nodes={layout.nodes}
                oneWayMs={oneWayMs}
                onDone={remove}
              />
            ))}
      </ArchitectureMap>
      {picked ? (
        <NodeInfoCard id={picked} requests={requests} onClose={() => setPicked(null)} />
      ) : null}
      <PollingStrip requests={requests} now={now} width={width} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  chips: { flexDirection: 'row', gap: space.xs },
  strip: { gap: 6 },
  stripTitle: { fontFamily: fonts.medium, fontSize: 12 },
  track: { height: 18, borderRadius: 9, overflow: 'hidden' },
  tick: { position: 'absolute', top: 4, width: 3, height: 10, borderRadius: 2 },
  note: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17 },
});
