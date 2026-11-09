/**
 * Start screen. For F1 it previews the wordmark and theme so the scaffold can
 * be checked on a phone in light and dark mode; F5 replaces it with a redirect
 * to login or chats.
 */
import { StyleSheet, Text, View } from 'react-native';
import { Wordmark } from '../src/components/ui/Wordmark';
import { space, type } from '../src/constants/theme';
import { useTheme } from '../src/hooks/useTheme';

export default function Index() {
  const { colors, scheme } = useTheme();

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface }]}>
      <Wordmark size={40} />
      <Text style={[type.meta, { color: colors.textSecondary }]}>chat with your class.</Text>
      <View style={[styles.slab, { backgroundColor: colors.slab }]}>
        <Text style={[type.heading, { color: colors.textOnSlab }]}>{scheme} mode</Text>
        <Text style={[type.meta, { color: colors.textOnSlabMuted }]}>
          switch your phone&apos;s appearance to check both themes
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.sm },
  slab: { marginTop: space.xxl, padding: space.lg, borderRadius: 32, alignItems: 'center', gap: space.xxs },
});
