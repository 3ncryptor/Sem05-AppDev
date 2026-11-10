/**
 * NetworkRow: one request in the network list, devtools style (buildPlan.md
 * 15, screen 5): method, path, status, time and a waterfall bar on a shared
 * time axis; the plain sentence under the path. Tap opens the request detail.
 */
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, gradient, space } from '../../constants/theme';
import { describeRow } from '../../debug/describeRequest';
import { useTheme } from '../../hooks/useTheme';

const BAR_WIDTH = 56;

/**
 * @param {object} props
 * @param {object} props.row networkStore row
 * @param {{ left: number, width: number } | undefined} props.bar waterfall position (0..1)
 * @param {(id: string) => void} props.onOpen
 */
function NetworkRowView({ row, bar, onOpen }) {
  const { colors } = useTheme();
  const isError = row.state === 'error';
  const isPending = row.state === 'pending';
  const statusColor = isError
    ? colors.dangerOnSlab
    : isPending
      ? colors.textOnSlabMuted
      : colors.success;
  const status = isPending ? '...' : isError ? (row.status ?? 'ERR') : row.status;
  const time =
    row.durationMs === undefined
      ? ''
      : row.durationMs >= 1000
        ? `${(row.durationMs / 1000).toFixed(1)}s`
        : `${row.durationMs}ms`;

  return (
    <Pressable
      onPress={() => onOpen(row.id)}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.slabRaised }]}
      accessibilityRole="button"
      accessibilityLabel={`${describeRow(row)}, ${status}, ${time}. Open details`}
    >
      <Text
        style={[
          styles.method,
          { color: row.method === 'GET' ? gradient.colors[0] : gradient.colors[2] },
        ]}
      >
        {row.method}
      </Text>
      <View style={styles.main}>
        <Text style={[styles.path, { color: colors.textOnSlab }]} numberOfLines={1}>
          {row.path}
          {row.isPoll ? <Text style={{ color: colors.textOnSlabMuted }}> poll</Text> : null}
        </Text>
        <Text style={[styles.phrase, { color: colors.textOnSlabMuted }]} numberOfLines={1}>
          {describeRow(row)}
        </Text>
      </View>
      <View style={styles.numbers}>
        <Text style={[styles.status, { color: statusColor }]}>{status}</Text>
        <Text style={[styles.time, { color: colors.textOnSlabMuted }]}>{time}</Text>
      </View>
      <View style={[styles.track, { backgroundColor: colors.slabRaised }]}>
        {bar ? (
          <View
            style={[
              styles.bar,
              {
                left: bar.left * BAR_WIDTH,
                width: Math.max(2, bar.width * BAR_WIDTH),
                backgroundColor: statusColor,
              },
            ]}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

export const NetworkRow = memo(NetworkRowView);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.xs,
    borderRadius: 16,
  },
  method: { width: 40, fontFamily: fonts.semibold, fontSize: 11 },
  main: { flex: 1, gap: 2 },
  path: { fontFamily: fonts.mono, fontSize: 12 },
  phrase: { fontFamily: fonts.regular, fontSize: 12 },
  numbers: { alignItems: 'flex-end', gap: 2, minWidth: 44 },
  status: { fontFamily: fonts.semibold, fontSize: 12 },
  time: { fontFamily: fonts.regular, fontSize: 11 },
  track: { width: BAR_WIDTH, height: 6, borderRadius: 3, overflow: 'hidden' },
  bar: { position: 'absolute', top: 0, bottom: 0, borderRadius: 3 },
});
