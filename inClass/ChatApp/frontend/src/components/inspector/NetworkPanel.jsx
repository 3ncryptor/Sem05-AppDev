/**
 * NetworkPanel: every request the app made, newest first, like a browser's
 * devtools network tab (buildPlan.md 15, screen 5): filters (all, failed,
 * hide polls), search by path or status, a waterfall column, and tap a row to
 * dive into that request (RequestDetail slides in; back returns to the list).
 */
import Eraser from 'lucide-react-native/icons/eraser';
import { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeOut, Keyframe } from 'react-native-reanimated';
import { durations, EASE_OUT } from '../../constants/motion';
import { fonts, space } from '../../constants/theme';
import { inspectorStore, openRequest } from '../../debug/inspectorStore';
import { waterfall } from '../../debug/networkDetail';
import { clearRequests, networkStore } from '../../debug/networkStore';
import { useStore } from '../../hooks/useStore';
import { useTheme } from '../../hooks/useTheme';
import { RingButton } from '../ui/RingButton';
import { InspectorChip } from './InspectorChip';
import { NetworkRow } from './NetworkRow';
import { RequestDetail } from './RequestDetail';

/** The detail pushes in from the right, a short way, and fades: calm, not a full slide. */
const DETAIL_IN = new Keyframe({
  0: { opacity: 0, transform: [{ translateX: 24 }] },
  100: { opacity: 1, transform: [{ translateX: 0 }], easing: EASE_OUT },
}).duration(durations.base);
const DETAIL_OUT = FadeOut.duration(durations.fast);

function matchesSearch(row, term) {
  if (!term) return true;
  return `${row.method} ${row.path} ${row.status ?? ''} ${row.id}`.toLowerCase().includes(term);
}

/**
 * @param {object} props
 * @param {object[]} props.serverEntries
 */
export function NetworkPanel({ serverEntries }) {
  const { colors } = useTheme();
  const requests = useStore(networkStore, (state) => state.requests);
  const requestId = useStore(inspectorStore, (state) => state.requestId);
  const [filter, setFilter] = useState('all');
  const [hidePolls, setHidePolls] = useState(true);
  const [search, setSearch] = useState('');

  const open = requestId ? requests.find((row) => row.id === requestId) : null;
  if (open) {
    return (
      <Animated.View key={open.id} entering={DETAIL_IN} exiting={DETAIL_OUT} style={styles.fill}>
        <RequestDetail
          row={open}
          serverLines={serverEntries.filter((entry) => entry.requestId === open.id)}
        />
      </Animated.View>
    );
  }

  const term = search.trim().toLowerCase();
  const visible = requests
    .filter((row) => !(hidePolls && row.isPoll))
    .filter((row) => filter !== 'failed' || row.state === 'error')
    .filter((row) => matchesSearch(row, term))
    .reverse();
  const bars = waterfall(visible.slice(0, 40));

  return (
    <View style={styles.fill}>
      <View style={styles.toolbar}>
        <InspectorChip label="all" selected={filter === 'all'} onPress={() => setFilter('all')} />
        <InspectorChip
          label="failed"
          selected={filter === 'failed'}
          onPress={() => setFilter('failed')}
        />
        <InspectorChip
          label="hide polls"
          selected={hidePolls}
          onPress={() => setHidePolls(!hidePolls)}
        />
        <View style={styles.grow} />
        <RingButton
          icon={Eraser}
          variant="slab"
          size={36}
          onPress={clearRequests}
          accessibilityLabel="Clear requests"
        />
      </View>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="search path, status or request id"
        placeholderTextColor={colors.textOnSlabMuted}
        style={[styles.search, { backgroundColor: colors.slabRaised, color: colors.textOnSlab }]}
        accessibilityLabel="Search requests"
      />
      <View style={styles.columns}>
        <Text style={[styles.column, styles.methodColumn, { color: colors.textOnSlabMuted }]}>
          method
        </Text>
        <Text style={[styles.column, styles.grow, { color: colors.textOnSlabMuted }]}>path</Text>
        <Text style={[styles.column, { color: colors.textOnSlabMuted }]}>
          status · time · waterfall
        </Text>
      </View>
      <FlatList
        data={visible}
        keyExtractor={(row) => row.id}
        renderItem={({ item }) => (
          <NetworkRow row={item} bar={bars[item.id]} onOpen={openRequest} />
        )}
        initialNumToRender={20}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textOnSlabMuted }]}>
            {requests.length
              ? 'No requests match.'
              : 'No requests yet. Use the app and they appear here.'}
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, gap: space.sm },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  grow: { flex: 1 },
  search: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: space.md,
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  columns: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.xs },
  column: {
    fontFamily: fonts.medium,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  methodColumn: { width: 40 },
  empty: { textAlign: 'center', marginTop: space.xl, fontFamily: fonts.regular, fontSize: 13 },
});
