/**
 * ToolsPanel: demo switches and facts (buildPlan.md 6.4): pause polling,
 * poll intervals, simulate offline, versions, server-log status, and
 * "copy debug report" (last lines + versions + server, never the password).
 */
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COPIED_HOLD_MS, DEBUG_REPORT_LINES, POLL_CHOICES } from '../../constants/config';
import { space, type } from '../../constants/theme';
import { buildDebugReport } from '../../debug/debugReport';
import { mergeLogs } from '../../debug/filterLogs';
import { logStore } from '../../debug/logStore';
import { setPollInterval, setTools, toolsStore } from '../../debug/toolsStore';
import { useStore } from '../../hooks/useStore';
import { useTheme } from '../../hooks/useTheme';
import { sessionStore } from '../../store/sessionStore';
import { haptics } from '../../utils/haptics';
import { log } from '../../utils/logger';
import { PrimaryButton } from '../ui/PrimaryButton';
import { InspectorChip } from './InspectorChip';
import { ToolRow } from './ToolRow';

const SERVER_LOG_LABELS = {
  idle: 'not checked',
  checking: 'checking',
  available: 'available',
  unsupported: 'not on this server',
  unreachable: "can't reach",
  signedOut: 'sign in first',
};

const VERSIONS = {
  app: Constants.expoConfig?.version ?? 'unknown',
  sdk: Constants.expoConfig?.sdkVersion ?? 'unknown',
  platform: `${Platform.OS} ${Platform.Version}`,
};

function IntervalChips({ choices, value, onPick }) {
  return (
    <View style={styles.chips}>
      {choices.map((ms) => (
        <InspectorChip
          key={ms}
          label={`${ms / 1000}s`}
          selected={value === ms}
          onPress={() => onPick(ms)}
        />
      ))}
    </View>
  );
}

/**
 * @param {object} props
 * @param {{ status: string, entries: object[] }} props.server
 * @param {() => void} props.onRetryServer
 */
export function ToolsPanel({ server, onRetryServer }) {
  const { colors } = useTheme();
  const tools = useStore(toolsStore);
  const session = useStore(sessionStore);
  const [copyStatus, setCopyStatus] = useState('idle');
  const serverLogs = SERVER_LOG_LABELS[server.status] ?? server.status;

  async function copyReport() {
    setCopyStatus('loading');
    const report = buildDebugReport({
      entries: mergeLogs(logStore.get().entries, server.entries),
      lines: DEBUG_REPORT_LINES,
      versions: VERSIONS,
      session: { baseUrl: session.baseUrl, name: session.name },
      serverLogs,
    });
    try {
      await Clipboard.setStringAsync(report);
      haptics.success();
      log.app('debug report copied');
      setCopyStatus('success');
      setTimeout(() => setCopyStatus('idle'), COPIED_HOLD_MS);
    } catch (error) {
      log.error(`copy debug report failed: ${error?.message ?? error}`);
      setCopyStatus('idle');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={[type.meta, { color: colors.textOnSlabMuted }]}>polling</Text>
      <ToolRow
        label="pause polling"
        detail="stops chat and room polls; the Inspector keeps its own"
        toggle={{
          value: tools.pausePolling,
          onChange: (value) => setTools({ pausePolling: value }),
        }}
      />
      <ToolRow
        label="chats every"
        right={
          <IntervalChips
            choices={POLL_CHOICES.conversations}
            value={tools.pollMs.conversations}
            onPick={(ms) => setPollInterval('conversations', ms)}
          />
        }
      />
      <ToolRow
        label="open chat every"
        right={
          <IntervalChips
            choices={POLL_CHOICES.messages}
            value={tools.pollMs.messages}
            onPick={(ms) => setPollInterval('messages', ms)}
          />
        }
      />
      <ToolRow
        label="simulate offline"
        detail="every request fails, to show the connection banner"
        toggle={{
          value: tools.simulateOffline,
          onChange: (value) => setTools({ simulateOffline: value }),
        }}
      />

      <Text style={[type.meta, styles.section, { color: colors.textOnSlabMuted }]}>about</Text>
      <ToolRow label="server" detail={session.baseUrl || 'none'} />
      <ToolRow label="user" detail={session.name || 'signed out'} />
      <ToolRow
        label="app / sdk"
        detail={`${VERSIONS.app} / ${VERSIONS.sdk} on ${VERSIONS.platform}`}
      />
      <ToolRow
        label="server logs"
        detail={serverLogs}
        right={<InspectorChip label="check again" selected={false} onPress={onRetryServer} />}
      />
      <View style={styles.section}>
        <PrimaryButton
          label={copyStatus === 'success' ? 'copied' : 'copy debug report'}
          status={copyStatus}
          variant="onSlab"
          onPress={copyReport}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.xs, paddingBottom: space.xl },
  chips: { flexDirection: 'row', gap: space.xxs },
  section: { marginTop: space.md },
});
