/**
 * ToolCard: a group of settings in the tools tab (buildPlan.md 15, screen 7):
 * an icon, a plain title, one sentence on why you would use it, then the rows.
 */
import { StyleSheet, Text, View } from 'react-native';
import { fonts, radius, space } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { Icon } from '../ui/Icon';

/**
 * @param {object} props
 * @param {import('react').ComponentType<any>} props.icon lucide icon
 * @param {string} props.title
 * @param {string} props.plain one sentence
 * @param {import('react').ReactNode} props.children ToolRows
 */
export function ToolCard({ icon, title, plain, children }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.slabRaised }]}>
      <View style={styles.head}>
        <View style={[styles.badge, { backgroundColor: colors.slab }]}>
          <Icon as={icon} color={colors.textOnSlab} size={18} />
        </View>
        <View style={styles.text}>
          <Text style={[styles.title, { color: colors.textOnSlab }]}>{title}</Text>
          <Text style={[styles.plain, { color: colors.textOnSlabMuted }]}>{plain}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.bubble, padding: space.md, gap: space.xs },
  head: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start', marginBottom: space.xs },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.semibold, fontSize: 15 },
  plain: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
});
