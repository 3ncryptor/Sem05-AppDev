/**
 * LogRow: one log line, readable first (V4, buildPlan.md 15):
 *
 *   [icon] sent a message · ok 201 · 84 ms                 3 s ago
 *          POST /message #ab12
 *
 * The plain sentence, then the technical detail small under it. Tapping opens
 * the exact time, "follow this request" (filters app and server lines by the
 * shared id) and "open in network" (the request's devtools view). Server
 * lines keep the backend's own wording.
 */
import Activity from 'lucide-react-native/icons/activity';
import ArrowLeftRight from 'lucide-react-native/icons/arrow-left-right';
import CircleDot from 'lucide-react-native/icons/circle-dot';
import Compass from 'lucide-react-native/icons/compass';
import RefreshCw from 'lucide-react-native/icons/refresh-cw';
import Server from 'lucide-react-native/icons/server';
import Smartphone from 'lucide-react-native/icons/smartphone';
import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fonts, gradient, space } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { formatAgo, formatLogTime } from '../../utils/format';
import { openRequest } from '../../debug/inspectorStore';
import { Icon } from '../ui/Icon';
import { levelColor } from './levelColor';

const CATEGORY_ICONS = {
  API: ArrowLeftRight,
  POLL: RefreshCw,
  NAV: Compass,
  STATE: CircleDot,
  APP: Smartphone,
};
const ICON_SIZE = 13;

function iconFor(entry) {
  if (entry.source === 'server') return Server;
  return CATEGORY_ICONS[entry.category] ?? Activity;
}

/**
 * @param {object} props
 * @param {object} props.entry
 * @param {number} props.now for the "3 s ago" label
 * @param {(requestId: string) => void} props.onPickRequest
 */
function LogRowView({ entry, now, onPickRequest }) {
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const isServer = entry.source === 'server';
  const id = entry.requestId;
  const tone = entry.pending ? colors.textOnSlabMuted : levelColor(entry.level, colors);
  const muted = { color: colors.textOnSlabMuted };

  return (
    <Pressable
      onPress={() => setIsOpen(!isOpen)}
      accessibilityRole="button"
      accessibilityLabel={`${entry.message}. ${isOpen ? 'Hide' : 'Show'} details`}
      style={styles.row}
    >
      <View style={styles.head}>
        <View style={styles.icon}>
          <Icon as={iconFor(entry)} color={isServer ? gradient.colors[2] : tone} size={ICON_SIZE} />
        </View>
        <Text style={[styles.message, { color: tone }]} numberOfLines={isOpen ? undefined : 2}>
          {entry.message}
        </Text>
        <Text style={[styles.ago, muted]}>{formatAgo(entry.time, now)}</Text>
      </View>
      {entry.detail && !isOpen ? (
        <Text style={[styles.mono, styles.detailLine, muted]} numberOfLines={1}>
          {entry.detail}
        </Text>
      ) : null}
      {isOpen ? (
        <View style={styles.details}>
          <Text style={[styles.mono, muted]} selectable>
            {formatLogTime(entry.time)} {isServer ? 'server' : 'app'} {entry.category.toLowerCase()}
            {entry.detail ? `  ${entry.detail}` : id ? `  #${id}` : ''}
          </Text>
          {id ? (
            <Pressable
              onPress={() => onPickRequest(id)}
              accessibilityRole="button"
              accessibilityLabel={`Show only request ${id}`}
              hitSlop={8}
            >
              <Text style={[styles.follow, { color: gradient.colors[1] }]}>
                follow this request
              </Text>
            </Pressable>
          ) : null}
          {id && entry.category === 'API' ? (
            <Pressable
              onPress={() => openRequest(id)}
              accessibilityRole="button"
              accessibilityLabel={`Open request ${id} in network`}
              hitSlop={8}
            >
              <Text style={[styles.follow, { color: gradient.colors[0] }]}>open in network</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

export const LogRow = memo(LogRowView);

const styles = StyleSheet.create({
  row: { paddingVertical: 8, paddingHorizontal: space.xxs },
  detailLine: { paddingLeft: ICON_SIZE + space.xs, paddingTop: 2 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xs },
  icon: { paddingTop: 2 },
  message: { flex: 1, fontFamily: fonts.regular, fontSize: 13, lineHeight: 17 },
  ago: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 17 },
  details: { paddingLeft: ICON_SIZE + space.xs, paddingTop: 4, gap: 4 },
  mono: { fontFamily: fonts.mono, fontSize: 11, lineHeight: 15 },
  follow: { fontFamily: fonts.medium, fontSize: 12 },
});
