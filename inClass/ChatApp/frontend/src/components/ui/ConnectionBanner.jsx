/**
 * ConnectionBanner: drops in under the header when polling fails
 * ("reconnecting...") and briefly says "back online" when it recovers
 * (buildPlan.md 5.2). Hidden while everything is fine.
 */
import Check from 'lucide-react-native/icons/check';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { radius, space, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { Icon } from './Icon';

/** @param {{ state: 'online' | 'reconnecting' | 'restored' }} props */
export function ConnectionBanner({ state }) {
  const { colors } = useTheme();
  if (state === 'online') return null;
  const isRestored = state === 'restored';

  return (
    <Animated.View
      entering={FadeInUp}
      exiting={FadeOutUp}
      style={[styles.banner, { backgroundColor: isRestored ? colors.success : colors.ink }]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      {isRestored ? (
        <Icon as={Check} color="#FFFFFF" size={16} />
      ) : (
        <ActivityIndicator size="small" color={colors.onInk} />
      )}
      <Text style={[type.chip, { color: isRestored ? '#FFFFFF' : colors.onInk }]}>
        {isRestored ? 'back online' : 'reconnecting...'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    height: 34,
    borderRadius: radius.pill,
    marginTop: space.sm,
  },
});
