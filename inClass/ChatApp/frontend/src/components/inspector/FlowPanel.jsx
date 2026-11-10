/**
 * FlowPanel: the Inspector's flow tab (buildPlan.md 15, screens 3 and 4).
 * How the app, the backend and the database work together, animated:
 * - live: every request travels the real architecture as it happens
 * - replay: one request, step by step, with plain captions (for the viva)
 * The backend and database boxes say "from the code" when the server does
 * not share its logs (the teacher's server).
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { space } from '../../constants/theme';
import { inspectorStore, replayInFlow, stopReplay } from '../../debug/inspectorStore';
import { useStore } from '../../hooks/useStore';
import { SegmentedPill } from '../ui/SegmentedPill';
import { FlowLive } from './flow/FlowLive';
import { FlowReplay } from './flow/FlowReplay';

const MODES = [
  { value: 'live', label: 'live' },
  { value: 'replay', label: 'replay' },
];

/** @param {{ server: { status: string, entries: object[] } }} props */
export function FlowPanel({ server }) {
  const replayId = useStore(inspectorStore, (state) => state.replayId);
  const [mode, setMode] = useState(replayId ? 'replay' : 'live');
  const [width, setWidth] = useState(0);
  const hasServerLogs = server.status === 'available';

  // "replay in flow" from a request switches this tab to replay
  const [lastReplayId, setLastReplayId] = useState(replayId);
  if (replayId !== lastReplayId) {
    setLastReplayId(replayId);
    if (replayId) setMode('replay');
  }

  function choose(next) {
    setMode(next);
    if (next === 'live') stopReplay();
    else if (!replayId) replayInFlow(null);
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width - space.sm * 2)}
    >
      <SegmentedPill options={MODES} value={mode} onChange={choose} on="slab" />
      {width ? (
        <View style={styles.body}>
          {mode === 'live' ? (
            <FlowLive width={width} fromCode={!hasServerLogs} />
          ) : (
            <FlowReplay
              width={width}
              replayId={replayId}
              serverEntries={server.entries}
              hasServerLogs={hasServerLogs}
            />
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.md, paddingBottom: space.lg },
  body: { paddingHorizontal: space.sm },
});
