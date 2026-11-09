/**
 * MembersSheet: the people in a group, opened from a group card.
 */
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { space, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { Avatar } from '../avatar/Avatar';
import { Sheet } from '../ui/Sheet';

const MAX_HEIGHT = 360;

/**
 * @param {object} props
 * @param {boolean} props.visible
 * @param {() => void} props.onClose
 * @param {string} props.title group name
 * @param {string[]} props.names
 * @param {string} props.myName shown as "you"
 */
export function MembersSheet({ visible, onClose, title, names, myName }) {
  const { colors } = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text style={[type.heading, { color: colors.textOnSlab }]}>{title}</Text>
      <Text style={[type.meta, { color: colors.textOnSlabMuted }]}>{names.length} members</Text>
      <ScrollView style={{ maxHeight: MAX_HEIGHT }} contentContainerStyle={styles.list}>
        {names.map((name, index) => (
          <View key={`${name}-${index}`} style={styles.row}>
            <Avatar name={name} size={40} />
            <Text style={[type.body, { color: colors.textOnSlab }]}>
              {name === myName ? `${name} (you)` : name}
            </Text>
          </View>
        ))}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.sm, paddingBottom: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
