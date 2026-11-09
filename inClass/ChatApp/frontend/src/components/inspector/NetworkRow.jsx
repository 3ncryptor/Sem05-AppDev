/**
 * NetworkRow: one HTTP request. Collapsed: method, path, poll tag, status,
 * time and size. Tap to expand: the (redacted) request and response bodies
 * and the server's own log lines for it, joined by X-Request-Id.
 */
import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, radius, space } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { formatBytes } from '../../utils/fileData';

/**
 * @param {object} row networkStore row
 * @returns {'info' | 'warn' | 'error'}
 */
function rowLevel(row) {
  if (row.state === 'error') return 'error';
  if (row.state === 'pending') return 'warn';
  return 'info';
}

function Detail({ label, text, color }) {
  const { colors } = useTheme();
  if (!text) return null;
  return (
    <Text style={[styles.mono, { color }]} selectable>
      <Text style={{ color: colors.textOnSlabMuted }}>{label} </Text>
      {text}
    </Text>
  );
}

/**
 * @param {object} props
 * @param {object} props.row
 * @param {object[]} props.serverLines server log entries with this request id
 */
function NetworkRowView({ row, serverLines }) {
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const level = rowLevel(row);
  const statusColor = level === 'error' ? colors.danger : colors.textOnSlab;
  const status = row.state === 'pending' ? '...' : String(row.status ?? 'ERR');
  const timing = row.durationMs === undefined ? '' : `${row.durationMs}ms`;
  const size = row.bytes ? formatBytes(row.bytes) : '';

  return (
    <Pressable
      onPress={() => setIsOpen(!isOpen)}
      accessibilityRole="button"
      accessibilityLabel={`${row.method} ${row.path}, status ${status}`}
      style={[styles.row, { backgroundColor: isOpen ? colors.slabRaised : 'transparent' }]}
    >
      <View style={styles.summary}>
        <Text style={[styles.mono, styles.method, { color: colors.textOnSlabMuted }]}>
          {row.method}
        </Text>
        <Text style={[styles.mono, styles.path, { color: colors.textOnSlab }]} numberOfLines={1}>
          {row.path}
        </Text>
        {row.isPoll ? (
          <Text style={[styles.mono, { color: colors.textOnSlabMuted }]}>poll</Text>
        ) : null}
        <Text style={[styles.mono, { color: statusColor }]}>{status}</Text>
        <Text style={[styles.mono, styles.num, { color: colors.textOnSlabMuted }]}>{timing}</Text>
        <Text style={[styles.mono, styles.num, { color: colors.textOnSlabMuted }]}>{size}</Text>
      </View>
      {isOpen ? (
        <View style={styles.details}>
          <Detail label="id      " text={`#${row.id}`} color={colors.textOnSlabMuted} />
          <Detail label="request " text={row.requestPreview} color={colors.textOnSlab} />
          <Detail label="response" text={row.responsePreview} color={colors.textOnSlab} />
          <Detail label="error   " text={row.error} color={colors.danger} />
          {serverLines.map((line) => (
            <Detail key={line.id} label="server  " text={line.message} color={colors.textOnSlab} />
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

export const NetworkRow = memo(NetworkRowView);

const styles = StyleSheet.create({
  row: { paddingVertical: space.xs, paddingHorizontal: space.xs, borderRadius: radius.image },
  summary: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  mono: { fontFamily: fonts.mono, fontSize: 11, lineHeight: 15 },
  method: { width: 34 },
  path: { flex: 1 },
  num: { minWidth: 40, textAlign: 'right' },
  details: { marginTop: space.xs, gap: 2 },
});
