/**
 * NetworkPanel: every request the app made, newest first. Polls are hidden
 * by default; failed requests show in red with the reason.
 */
import Eraser from 'lucide-react-native/icons/eraser';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { space, type } from '../../constants/theme';
import { clearRequests, networkStore } from '../../debug/networkStore';
import { useStore } from '../../hooks/useStore';
import { useTheme } from '../../hooks/useTheme';
import { RingButton } from '../ui/RingButton';
import { InspectorChip } from './InspectorChip';
import { NetworkRow } from './NetworkRow';

const NO_LINES = [];

/**
 * Groups server log lines by request id for the expanded rows.
 * @param {object[]} entries
 */
function linesByRequest(entries) {
  return entries.reduce((map, entry) => {
    if (!entry.requestId) return map;
    return { ...map, [entry.requestId]: [...(map[entry.requestId] ?? []), entry] };
  }, {});
}

/**
 * @param {object} props
 * @param {object[]} props.serverEntries
 */
export function NetworkPanel({ serverEntries }) {
  const { colors } = useTheme();
  const requests = useStore(networkStore, (state) => state.requests);
  const [hidePolls, setHidePolls] = useState(true);
  const [errorsOnly, setErrorsOnly] = useState(false);

  const visible = requests
    .filter((row) => !(hidePolls && row.isPoll))
    .filter((row) => !errorsOnly || row.state === 'error')
    .reverse();
  const serverLines = linesByRequest(serverEntries);

  return (
    <View style={styles.panel}>
      <View style={styles.toolbar}>
        <InspectorChip
          label="hide polls"
          selected={hidePolls}
          onPress={() => setHidePolls(!hidePolls)}
        />
        <InspectorChip
          label="errors only"
          selected={errorsOnly}
          onPress={() => setErrorsOnly(!errorsOnly)}
        />
        <Text style={[type.caption, styles.count, { color: colors.textOnSlabMuted }]}>
          {visible.length} requests
        </Text>
        <RingButton
          icon={Eraser}
          variant="slab"
          size={36}
          onPress={clearRequests}
          accessibilityLabel="Clear requests"
        />
      </View>
      <FlatList
        data={visible}
        keyExtractor={(row) => row.id}
        renderItem={({ item }) => (
          <NetworkRow row={item} serverLines={serverLines[item.id] ?? NO_LINES} />
        )}
        initialNumToRender={25}
        style={styles.list}
        ListEmptyComponent={
          <Text style={[type.meta, styles.empty, { color: colors.textOnSlabMuted }]}>
            no requests yet
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { flex: 1, gap: space.xs },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  count: { flex: 1, textAlign: 'right' },
  list: { flex: 1 },
  empty: { textAlign: 'center', marginTop: space.xl },
});
