/**
 * FaceGrid: face tiles in two columns with an 8 pt gap; tiles fade up one
 * after another on first render.
 */
import { FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';
import { space } from '../../constants/theme';
import { FaceTile } from './FaceTile';

const COLUMNS = 2;
const GAP = space.xs;

/**
 * @param {object} props
 * @param {{ id: string, name: string }[]} props.people
 * @param {string} props.myId
 * @param {'message' | 'select'} props.mode
 * @param {string[]} [props.selectedIds]
 * @param {string | null} [props.busyId]
 * @param {(person: { id: string, name: string }) => void} props.onPress
 * @param {import('react').ReactElement} [props.header]
 * @param {import('react').ReactElement} [props.empty]
 * @param {number} [props.bottomPadding]
 * @param {import('react').ReactElement} [props.refreshControl]
 */
export function FaceGrid({
  people,
  myId,
  mode,
  selectedIds = [],
  busyId = null,
  onPress,
  header,
  empty,
  bottomPadding = space.xxl,
  refreshControl,
}) {
  const { width } = useWindowDimensions();
  const size = (width - space.md * 2 - GAP) / COLUMNS;

  return (
    <FlatList
      data={people}
      keyExtractor={(person) => person.id}
      numColumns={COLUMNS}
      columnWrapperStyle={styles.columns}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
      renderItem={({ item }) => (
        <View>
          <FaceTile
            name={item.name}
            size={size}
            mode={mode}
            isMe={item.id === myId}
            isSelected={selectedIds.includes(item.id)}
            isBusy={busyId === item.id}
            onPress={() => onPress(item)}
          />
        </View>
      )}
      ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.md, paddingTop: space.md },
  columns: { gap: GAP },
});
