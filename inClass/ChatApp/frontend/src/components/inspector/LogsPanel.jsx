/**
 * LogsPanel: app and server log lines merged in time order, newest at the
 * top, with filters, pause (freezes the list), clear and share.
 */
import Eraser from 'lucide-react-native/icons/eraser';
import Pause from 'lucide-react-native/icons/pause';
import Play from 'lucide-react-native/icons/play';
import Share2 from 'lucide-react-native/icons/share-2';
import { useState } from 'react';
import { FlatList, Share, StyleSheet, Text, View } from 'react-native';
import { space, type } from '../../constants/theme';
import { formatLogLine } from '../../debug/debugReport';
import { DEFAULT_LOG_FILTERS, filterLogs, logCategories, mergeLogs } from '../../debug/filterLogs';
import { clearLogs, logStore } from '../../debug/logStore';
import { clearServerLogs } from '../../debug/serverLogStore';
import { useStore } from '../../hooks/useStore';
import { useTheme } from '../../hooks/useTheme';
import { log } from '../../utils/logger';
import { RingButton } from '../ui/RingButton';
import { LogFilters } from './LogFilters';
import { LogRow } from './LogRow';
import { ServerLogsNotice } from './ServerLogsNotice';

const ICON_BUTTON = 36;

/**
 * @param {object} props
 * @param {{ status: string, entries: object[] }} props.server serverLogStore state
 * @param {() => void} props.onRetryServer
 */
export function LogsPanel({ server, onRetryServer }) {
  const { colors } = useTheme();
  const appEntries = useStore(logStore, (state) => state.entries);
  const [filters, setFilters] = useState(DEFAULT_LOG_FILTERS);
  const [frozen, setFrozen] = useState(null);

  const live = mergeLogs(appEntries, server.entries);
  const all = frozen ?? live;
  const visible = filterLogs(all, filters).reverse();

  function togglePause() {
    setFrozen(frozen ? null : live);
  }

  function clearAll() {
    clearLogs();
    clearServerLogs();
    setFrozen(null);
  }

  async function shareVisible() {
    try {
      await Share.share({ message: [...visible].reverse().map(formatLogLine).join('\n') });
    } catch (error) {
      log.warn(`share logs failed: ${error?.message ?? error}`);
    }
  }

  return (
    <View style={styles.panel}>
      <LogFilters filters={filters} onChange={setFilters} categories={logCategories(all)} />
      <View style={styles.toolbar}>
        <Text style={[type.caption, styles.count, { color: colors.textOnSlabMuted }]}>
          {visible.length} of {all.length} lines{frozen ? ' (paused)' : ''}
        </Text>
        <RingButton
          icon={frozen ? Play : Pause}
          variant="slab"
          size={ICON_BUTTON}
          onPress={togglePause}
          accessibilityLabel={frozen ? 'Resume live logs' : 'Pause logs'}
        />
        <RingButton
          icon={Eraser}
          variant="slab"
          size={ICON_BUTTON}
          onPress={clearAll}
          accessibilityLabel="Clear logs"
        />
        <RingButton
          icon={Share2}
          variant="slab"
          size={ICON_BUTTON}
          onPress={shareVisible}
          accessibilityLabel="Share visible logs"
        />
      </View>
      <ServerLogsNotice status={server.status} onRetry={onRetryServer} />
      <FlatList
        data={visible}
        keyExtractor={(entry) => entry.id}
        renderItem={({ item }) => (
          <LogRow entry={item} onPickRequest={(id) => setFilters({ ...filters, search: id })} />
        )}
        initialNumToRender={30}
        style={styles.list}
        ListEmptyComponent={
          <Text style={[type.meta, styles.empty, { color: colors.textOnSlabMuted }]}>
            no lines match these filters
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1, gap: space.xs },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  count: { flex: 1 },
  list: { flex: 1 },
  empty: { textAlign: 'center', marginTop: space.xl },
});
