/**
 * LogFilters: source, level and category chips, the hide-polls / hide-bot
 * toggles for the Logs tab (search lives in the panel's toolbar). Folded behind
 * the toolbar's filter button. Stateless: the panel owns
 * the filters and passes changes back as new objects.
 */
import { ScrollView, StyleSheet, View } from 'react-native';
import { space } from '../../constants/theme';
import { LOG_LEVELS, toggleValue } from '../../debug/filterLogs';
import { InspectorChip } from './InspectorChip';

/**
 * @param {object} props
 * @param {typeof import('../../debug/filterLogs').DEFAULT_LOG_FILTERS} props.filters
 * @param {(next: object) => void} props.onChange
 * @param {string[]} props.categories categories present in the logs
 */
export function LogFilters({ filters, onChange, categories }) {
  const toggle = (key, value) => onChange({ ...filters, [key]: toggleValue(filters[key], value) });

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {['app', 'server'].map((source) => (
          <InspectorChip
            key={source}
            label={source}
            selected={filters.sources.includes(source)}
            onPress={() => toggle('sources', source)}
          />
        ))}
        <View style={styles.gap} />
        {LOG_LEVELS.map((level) => (
          <InspectorChip
            key={level}
            label={level}
            selected={filters.levels.includes(level)}
            onPress={() => toggle('levels', level)}
          />
        ))}
        <View style={styles.gap} />
        <InspectorChip
          label="hide polls"
          selected={filters.hidePolls}
          onPress={() => onChange({ ...filters, hidePolls: !filters.hidePolls })}
        />
        <InspectorChip
          label="hide bot"
          selected={filters.hideBot}
          onPress={() => onChange({ ...filters, hideBot: !filters.hideBot })}
        />
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {categories.map((category) => (
          <InspectorChip
            key={category}
            label={category.toLowerCase()}
            selected={filters.categories.includes(category)}
            onPress={() => toggle('categories', category)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  row: { gap: space.xs, alignItems: 'center' },
  gap: { width: space.xs },
});
