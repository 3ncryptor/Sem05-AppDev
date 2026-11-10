/**
 * ToolsPanel: demo switches and facts as cards (buildPlan.md 6.4, 15): pause polling,
 * poll intervals, simulate offline, versions, server-log status, and
 * "copy debug report" (last lines + versions + server, never the password).
 */
import * as Clipboard from 'expo-clipboard';
import CloudOff from 'lucide-react-native/icons/cloud-off';
import Info from 'lucide-react-native/icons/info';
import Radio from 'lucide-react-native/icons/radio';
import RefreshCw from 'lucide-react-native/icons/refresh-cw';
import Constants from 'expo-constants';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { COPIED_HOLD_MS, DEBUG_REPORT_LINES, POLL_CHOICES } from '../../constants/config';
import { space } from '../../constants/theme';
import { buildDebugReport } from '../../debug/debugReport';
import { mergeLogs } from '../../debug/filterLogs';
import { logStore } from '../../debug/logStore';
import { setPollInterval, setTools, toolsStore } from '../../debug/toolsStore';
import { useStore } from '../../hooks/useStore';
import { sessionStore } from '../../store/sessionStore';
import { haptics } from '../../utils/haptics';
import { log } from '../../utils/logger';
import { PrimaryButton } from '../ui/PrimaryButton';
import { InspectorChip } from './InspectorChip';
import { ToolCard } from './ToolCard';
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
      <ToolCard
        icon={RefreshCw}
        title="polling"
        plain="The server can't push new messages, so the app asks for them on a timer."
      >
        <ToolRow
          label="pause polling"
          detail="stops the chat and room checks; the Inspector keeps its own"
          toggle={{
            value: tools.pausePolling,
            onChange: (value) => setTools({ pausePolling: value }),
          }}
        />
        <ToolRow
          label="chat list every"
          below={
            <IntervalChips
              choices={POLL_CHOICES.conversations}
              value={tools.pollMs.conversations}
              onPick={(ms) => setPollInterval('conversations', ms)}
            />
          }
        />
        <ToolRow
          label="open chat every"
          below={
            <IntervalChips
              choices={POLL_CHOICES.messages}
              value={tools.pollMs.messages}
              onPick={(ms) => setPollInterval('messages', ms)}
            />
          }
        />
        <ToolRow
          label="inbox checks"
          detail="checks every chat in turn for its last message and unread count"
          toggle={{
            value: tools.inboxChecks,
            onChange: (value) => setTools({ inboxChecks: value }),
          }}
        />
        <ToolRow
          label="one round of all chats every"
          below={
            <IntervalChips
              choices={POLL_CHOICES.inbox}
              value={tools.pollMs.inbox}
              onPick={(ms) => setPollInterval('inbox', ms)}
            />
          }
        />
      </ToolCard>

      <ToolCard
        icon={CloudOff}
        title="try a problem"
        plain="Make things go wrong on purpose, to see how the app copes."
      >
        <ToolRow
          label="simulate offline"
          detail="every request fails; the island shows reconnecting"
          toggle={{
            value: tools.simulateOffline,
            onChange: (value) => setTools({ simulateOffline: value }),
          }}
        />
      </ToolCard>

      <ToolCard
        icon={Radio}
        title="island"
        plain="Watch the app talk to the server without opening the Inspector."
      >
        <ToolRow
          label="requests in the island"
          detail="a dot runs across the island for every request"
          toggle={{
            value: tools.islandWire,
            onChange: (value) => setTools({ islandWire: value }),
          }}
        />
      </ToolCard>

      <ToolCard icon={Info} title="about" plain="Where the app is connected and what it runs on.">
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
      </ToolCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.md, paddingBottom: space.xl },
  chips: { flexDirection: 'row', gap: space.xxs },
  section: { marginTop: space.sm },
});
