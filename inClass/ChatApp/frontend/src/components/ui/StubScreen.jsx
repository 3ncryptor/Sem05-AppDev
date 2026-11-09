/**
 * StubScreen: placeholder for screens that arrive in a later build step, so
 * navigation works end to end before every screen exists. Removed by F10.
 */
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import Hammer from 'lucide-react-native/icons/hammer';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { space, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { EmptyState } from './EmptyState';
import { RingButton } from './RingButton';
import { Slab } from './Slab';

/**
 * @param {object} props
 * @param {string} props.title
 * @param {string} props.step e.g. "F7"
 * @param {boolean} [props.canGoBack]
 */
export function StubScreen({ title, step, canGoBack = false }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.screen, { backgroundColor: colors.surface }]}>
      <Slab variant="notch">
        <View style={styles.row}>
          {canGoBack ? (
            <RingButton
              icon={ArrowLeft}
              variant="slab"
              accessibilityLabel="Back"
              onPress={() => router.back()}
            />
          ) : null}
          <Text style={[type.title, styles.title, { color: colors.textOnSlab }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      </Slab>
      <EmptyState icon={Hammer} title="coming soon" message={`This screen is built in ${step}.`} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 48 },
  title: { flex: 1 },
});
