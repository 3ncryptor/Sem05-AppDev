/**
 * LogRow: one monospace log line, coloured by level. APP and SRV lines that
 * share a #request id belong to the same request; tapping a row with an id
 * filters the list down to that request.
 */
import { memo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { fonts, gradient, space } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { formatLogTime } from '../../utils/format';
import { levelColor } from './levelColor';

/**
 * @param {object} props
 * @param {object} props.entry
 * @param {(requestId: string) => void} props.onPickRequest
 */
function LogRowView({ entry, onPickRequest }) {
  const { colors } = useTheme();
  const isServer = entry.source === 'server';
  const id = entry.requestId;

  return (
    <Pressable
      onPress={id ? () => onPickRequest(id) : undefined}
      disabled={!id}
      accessibilityLabel={id ? `Show request ${id}` : undefined}
      style={styles.row}
    >
      <Text style={[styles.line, { color: levelColor(entry.level, colors) }]} selectable>
        <Text style={{ color: colors.textOnSlabMuted }}>{formatLogTime(entry.time)} </Text>
        <Text style={{ color: isServer ? gradient.colors[2] : colors.textOnSlabMuted }}>
          {isServer ? 'SRV' : 'APP'}{' '}
        </Text>
        <Text style={{ color: colors.textOnSlabMuted }}>{entry.category.toLowerCase()} </Text>
        {entry.message}
        {id ? <Text style={{ color: gradient.colors[1] }}> #{id}</Text> : null}
      </Text>
    </Pressable>
  );
}

export const LogRow = memo(LogRowView);

const styles = StyleSheet.create({
  row: { paddingVertical: 3, paddingHorizontal: space.xxs },
  line: { fontFamily: fonts.mono, fontSize: 11, lineHeight: 15 },
});
