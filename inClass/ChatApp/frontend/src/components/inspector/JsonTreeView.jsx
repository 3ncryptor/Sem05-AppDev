/**
 * JsonTreeView: a collapsible JSON tree (payload and response in the request
 * detail, like devtools). Tap a branch to open or fold it; long press any row
 * to copy its value. A search box shows every match with its parents.
 */
import * as Clipboard from 'expo-clipboard';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { fonts, gradient, space } from '../../constants/theme';
import { flattenJson, toggleExpanded } from '../../debug/jsonTree';
import { useTheme } from '../../hooks/useTheme';
import { islandCopied } from '../../island/islandEvents';
import { log } from '../../utils/logger';
import { Icon } from '../ui/Icon';

const INDENT = 14;

/** Follows exact key segments (keys may contain "." or "["). */
function valueAt(root, segments) {
  return segments.reduce(
    (value, segment) => (value === undefined || value === null ? undefined : value[segment]),
    root,
  );
}

/**
 * @param {object} props
 * @param {unknown} props.value
 * @param {string} props.emptyText shown when there is nothing (no body)
 */
export function JsonTreeView({ value, emptyText }) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(() => new Set(['$']));
  const [search, setSearch] = useState('');

  if (value === undefined || value === null || value === '') {
    return <Text style={[styles.empty, { color: colors.textOnSlabMuted }]}>{emptyText}</Text>;
  }

  const rows = flattenJson(value, expanded, search);

  async function copy(segments) {
    const picked = valueAt(value, segments);
    const text = typeof picked === 'string' ? picked : JSON.stringify(picked, null, 2);
    try {
      await Clipboard.setStringAsync(text ?? String(picked));
      islandCopied();
    } catch (error) {
      log.warn(`inspector: copy failed: ${error?.message ?? error}`);
    }
  }

  return (
    <View style={styles.wrap}>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="search keys and values"
        placeholderTextColor={colors.textOnSlabMuted}
        style={[styles.search, { backgroundColor: colors.slabRaised, color: colors.textOnSlab }]}
        accessibilityLabel="Search the JSON"
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {rows.map((row) => {
            const isBranch = row.kind !== 'value';
            const label =
              row.kind === 'array'
                ? `[${row.childCount}]`
                : row.kind === 'object'
                  ? `{${row.childCount}}`
                  : row.preview;
            return (
              <Pressable
                key={row.path}
                onPress={
                  isBranch && !search
                    ? () => setExpanded(toggleExpanded(expanded, row.path))
                    : undefined
                }
                onLongPress={() => copy(row.segments)}
                style={[styles.row, { paddingLeft: row.depth * INDENT }]}
                accessibilityLabel={`${row.key} ${label}${isBranch ? (row.isExpanded ? ', open' : ', folded') : ''}`}
              >
                <View style={styles.chevron}>
                  {isBranch ? (
                    <Icon
                      as={row.isExpanded ? ChevronDown : ChevronRight}
                      color={colors.textOnSlabMuted}
                      size={12}
                    />
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.text,
                    { color: row.isMatch ? gradient.colors[0] : gradient.colors[2] },
                  ]}
                >
                  {row.depth === 0 ? '' : `${row.key}: `}
                </Text>
                <Text
                  style={[
                    styles.text,
                    { color: isBranch ? colors.textOnSlabMuted : colors.textOnSlab },
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  search: {
    height: 38,
    borderRadius: 19,
    paddingHorizontal: space.md,
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 26 },
  chevron: { width: 16, alignItems: 'center' },
  text: { fontFamily: fonts.mono, fontSize: 12 },
  empty: { fontFamily: fonts.regular, fontSize: 13, paddingVertical: space.md },
});
