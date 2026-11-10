/**
 * LogsPanel: app and server log lines as a diary (buildPlan.md 15, screen 6):
 * newest first under "just now", "2 minutes ago", ...; the background checks
 * as a beating pulse line on top; search, and the filters folded behind one
 * button. Pause freezes the list; clear and share are one tap away.
 */
import Eraser from 'lucide-react-native/icons/eraser';
import ListFilter from 'lucide-react-native/icons/list-filter';
import Pause from 'lucide-react-native/icons/pause';
import Play from 'lucide-react-native/icons/play';
import Share2 from 'lucide-react-native/icons/share-2';
import { useState } from 'react';
import { SectionList, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { durations } from '../../constants/motion';
import { fonts, space } from '../../constants/theme';
import { formatLogLine } from '../../debug/debugReport';
import { DEFAULT_LOG_FILTERS, filterLogs, logCategories, mergeLogs } from '../../debug/filterLogs';
import { groupByTime } from '../../debug/logGroups';
import { clearLogs, logStore } from '../../debug/logStore';
import { clearServerLogs } from '../../debug/serverLogStore';
import { useNow } from '../../hooks/useNow';
import { useStore } from '../../hooks/useStore';
import { useTheme } from '../../hooks/useTheme';
import { log } from '../../utils/logger';
import { RingButton } from '../ui/RingButton';
import { LogFilters } from './LogFilters';
import { LogRow } from './LogRow';
import { PulseLine } from './PulseLine';
import { ServerLogsNotice } from './ServerLogsNotice';

const ICON_BUTTON = 36;
const AGO_TICK_MS = 5000;

/**
 * @param {object} props
 * @param {{ status: string, entries: object[] }} props.server serverLogStore state
 * @param {() => void} props.onRetryServer
 */
export function LogsPanel({ server, onRetryServer }) {
  const { colors } = useTheme();
  const appEntries = useStore(logStore, (state) => state.entries);
  const heartbeat = useStore(logStore, (state) => state.heartbeat);
  const now = useNow(AGO_TICK_MS);
  const [filters, setFilters] = useState(DEFAULT_LOG_FILTERS);
  const [isFiltering, setIsFiltering] = useState(false);
  const [frozen, setFrozen] = useState(null);

  const live = mergeLogs(appEntries, server.entries);
  const all = frozen ?? live;
  const visible = filterLogs(all, filters);
  const sections = groupByTime(visible, now);

  function clearAll() {
    clearLogs();
    clearServerLogs();
    setFrozen(null);
  }

  async function shareVisible() {
    try {
      await Share.share({ message: visible.map(formatLogLine).join('\n') });
    } catch (error) {
      log.warn(`share logs failed: ${error?.message ?? error}`);
    }
  }

  return (
    <View style={styles.panel}>
      <View style={styles.toolbar}>
        <TextInput
          value={filters.search}
          onChangeText={(search) => setFilters({ ...filters, search })}
          placeholder="search logs"
          placeholderTextColor={colors.textOnSlabMuted}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search logs"
          style={[styles.search, { backgroundColor: colors.slabRaised, color: colors.textOnSlab }]}
        />
        <RingButton
          icon={ListFilter}
          variant={isFiltering ? 'accent' : 'slab'}
          size={ICON_BUTTON}
          onPress={() => setIsFiltering(!isFiltering)}
          accessibilityLabel={isFiltering ? 'Hide filters' : 'Show filters'}
        />
        <RingButton
          icon={frozen ? Play : Pause}
          variant="slab"
          size={ICON_BUTTON}
          onPress={() => setFrozen(frozen ? null : live)}
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

      {isFiltering ? (
        <Animated.View
          entering={FadeIn.duration(durations.base)}
          exiting={FadeOut.duration(durations.fast)}
        >
          <LogFilters filters={filters} onChange={setFilters} categories={logCategories(all)} />
        </Animated.View>
      ) : null}

      <ServerLogsNotice status={server.status} onRetry={onRetryServer} />
      <PulseLine heartbeat={heartbeat} now={now} />
      <Text style={[styles.count, { color: colors.textOnSlabMuted }]}>
        {visible.length} of {all.length} lines{frozen ? ' · paused' : ''}
      </Text>

      <SectionList
        sections={sections}
        keyExtractor={(entry) => entry.id}
        renderItem={({ item }) => (
          <LogRow
            entry={item}
            now={now}
            onPickRequest={(id) => setFilters({ ...filters, search: id })}
          />
        )}
        renderSectionHeader={({ section }) => (
          <Text
            style={[
              styles.section,
              { color: colors.textOnSlabMuted, backgroundColor: colors.slab },
            ]}
          >
            {section.title}
          </Text>
        )}
        stickySectionHeadersEnabled
        initialNumToRender={30}
        keyboardShouldPersistTaps="handled"
        style={styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textOnSlabMuted }]}>no lines match</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1, gap: space.sm },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  search: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: space.md,
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  count: { fontFamily: fonts.regular, fontSize: 12 },
  section: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingVertical: space.xs,
  },
  list: { flex: 1 },
  empty: { textAlign: 'center', marginTop: space.xl, fontFamily: fonts.regular, fontSize: 13 },
});
