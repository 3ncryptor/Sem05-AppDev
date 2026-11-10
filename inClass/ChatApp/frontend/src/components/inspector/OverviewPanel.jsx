/**
 * OverviewPanel: the Inspector's first tab (buildPlan.md 15, screen 2).
 * A live picture of the app, the server and the database, three numbers, one
 * plain sentence about how things are, and the last problem (tap it to open
 * that request in network).
 */
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import TriangleAlert from 'lucide-react-native/icons/triangle-alert';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { fonts, radius, space } from '../../constants/theme';
import { lastFinished, summarizeConnection } from '../../debug/connectionSummary';
import { describeOutcome, describeRow } from '../../debug/describeRequest';
import { openRequest } from '../../debug/inspectorStore';
import { networkStore } from '../../debug/networkStore';
import { lastProblem, overviewSentence, overviewStats } from '../../debug/overviewStats';
import { toolsStore } from '../../debug/toolsStore';
import { useNow } from '../../hooks/useNow';
import { useStore } from '../../hooks/useStore';
import { useTheme } from '../../hooks/useTheme';
import { sessionStore } from '../../store/sessionStore';
import { formatAgo } from '../../utils/format';
import { Icon } from '../ui/Icon';
import { PressableScale } from '../ui/PressableScale';
import { MiniWire } from './MiniWire';

const TICK_MS = 1000;

function Tile({ value, label, tone }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: colors.slabRaised }]} accessible>
      <Text style={[styles.value, { color: tone ?? colors.textOnSlab }]}>{value}</Text>
      <Text style={[styles.tileLabel, { color: colors.textOnSlabMuted }]}>{label}</Text>
    </View>
  );
}

export function OverviewPanel() {
  const { colors } = useTheme();
  const now = useNow(TICK_MS);
  const [width, setWidth] = useState(0);
  const requests = useStore(networkStore, (state) => state.requests);
  const tools = useStore(toolsStore);
  const baseUrl = useStore(sessionStore, (state) => state.baseUrl);

  const stats = overviewStats(requests, now);
  const connection = summarizeConnection(baseUrl, lastFinished(requests));
  const problem = lastProblem(requests);
  const sentence = overviewSentence({
    tone: connection.tone,
    failed: stats.failed,
    pollMs: tools.pollMs,
    isPaused: tools.pausePolling,
  });
  const seconds = (ms) => `${Math.round(ms / 1000)} s`;

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View
        style={[styles.card, { backgroundColor: colors.slabRaised }]}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width - space.md * 2)}
      >
        <MiniWire width={width} />
      </View>

      <View style={styles.tiles}>
        <Tile value={stats.perMinute} label="requests this minute" />
        <Tile
          value={stats.failed}
          label="failed"
          tone={stats.failed ? colors.dangerOnSlab : undefined}
        />
        <Tile
          value={stats.typicalMs === null ? '-' : `${stats.typicalMs} ms`}
          label="typical time"
        />
      </View>

      <View style={styles.sentence}>
        <Text style={[styles.plain, { color: colors.textOnSlab }]}>{sentence}</Text>
        <Text style={[styles.technical, { color: colors.textOnSlabMuted }]}>
          polling: chats {seconds(tools.pollMs.conversations)}, open chat{' '}
          {seconds(tools.pollMs.messages)}, inbox round {seconds(tools.pollMs.inbox)}
          {tools.inboxChecks ? '' : ' (off)'}
        </Text>
      </View>

      {problem ? (
        <PressableScale
          onPress={() => openRequest(problem.id)}
          accessibilityLabel="Open the last problem in network"
        >
          <View style={[styles.problem, { backgroundColor: colors.slabRaised }]}>
            <Icon as={TriangleAlert} color={colors.dangerOnSlab} size={20} />
            <View style={styles.grow}>
              <Text style={[styles.plain, { color: colors.textOnSlab }]} numberOfLines={1}>
                last problem: {describeRow(problem)},{' '}
                {describeOutcome({
                  status: problem.status,
                  kind: problem.status ? 'http' : 'network',
                  message: problem.error,
                })}
              </Text>
              <Text style={[styles.technical, { color: colors.textOnSlabMuted }]}>
                {problem.method} {problem.path} · {formatAgo(problem.startedAt, now)}
              </Text>
            </View>
            <Icon as={ChevronRight} color={colors.textOnSlabMuted} size={18} />
          </View>
        </PressableScale>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.md, paddingTop: space.xs, paddingBottom: space.lg },
  card: { borderRadius: radius.card, padding: space.md },
  tiles: { flexDirection: 'row', gap: space.xs },
  tile: { flex: 1, borderRadius: 22, padding: space.sm, gap: 2 },
  value: { fontFamily: fonts.semibold, fontSize: 24 },
  tileLabel: { fontFamily: fonts.regular, fontSize: 12 },
  sentence: { gap: space.xs, paddingHorizontal: space.xxs },
  plain: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21 },
  technical: { fontFamily: fonts.mono, fontSize: 11, lineHeight: 16 },
  problem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: 22,
  },
  grow: { flex: 1, gap: 2 },
});
