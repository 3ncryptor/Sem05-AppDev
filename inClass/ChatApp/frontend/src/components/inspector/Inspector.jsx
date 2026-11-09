/**
 * Inspector: the in-app debug console (buildPlan.md 6). A dark sheet with
 * logs, network, flow (Live Wire) and tools tabs, mounted once in the root layout so it opens
 * over any screen, signed in or not. Server logs are checked when it opens
 * and polled only while it stays open.
 */
import X from 'lucide-react-native/icons/x';
import { StyleSheet, Text, View } from 'react-native';
import { space, type } from '../../constants/theme';
import { closeInspector, inspectorStore, setInspectorTab } from '../../debug/inspectorStore';
import { checkServerLogs } from '../../debug/serverLogStore';
import { useServerLogs } from '../../hooks/useServerLogs';
import { useStore } from '../../hooks/useStore';
import { useTheme } from '../../hooks/useTheme';
import { RingButton } from '../ui/RingButton';
import { SegmentedPill } from '../ui/SegmentedPill';
import { Sheet } from '../ui/Sheet';
import { FlowPanel } from './FlowPanel';
import { LogsPanel } from './LogsPanel';
import { NetworkPanel } from './NetworkPanel';
import { ToolsPanel } from './ToolsPanel';

const TAB_OPTIONS = [
  { value: 'logs', label: 'logs' },
  { value: 'network', label: 'network' },
  { value: 'flow', label: 'flow' },
  { value: 'tools', label: 'tools' },
];

function TabBody({ tab, server }) {
  if (tab === 'network') return <NetworkPanel serverEntries={server.entries} />;
  if (tab === 'flow') return <FlowPanel server={server} />;
  if (tab === 'tools') return <ToolsPanel server={server} onRetryServer={checkServerLogs} />;
  return <LogsPanel server={server} onRetryServer={checkServerLogs} />;
}

export function Inspector() {
  const { colors } = useTheme();
  const { isOpen, tab } = useStore(inspectorStore);
  const server = useServerLogs(isOpen);

  return (
    <Sheet visible={isOpen} onClose={closeInspector} style={styles.sheet}>
      <View style={styles.header}>
        <Text style={[type.title, { color: colors.textOnSlab }]} accessibilityRole="header">
          inspector
        </Text>
        <RingButton
          icon={X}
          variant="slab"
          size={40}
          onPress={closeInspector}
          accessibilityLabel="Close inspector"
        />
      </View>
      <SegmentedPill options={TAB_OPTIONS} value={tab} onChange={setInspectorTab} on="slab" />
      <View style={styles.body}>
        <TabBody tab={tab} server={server} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  sheet: { height: '88%', paddingHorizontal: space.md, gap: space.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.xs,
  },
  body: { flex: 1 },
});
