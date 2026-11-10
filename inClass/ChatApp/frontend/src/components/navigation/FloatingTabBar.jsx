/**
 * FloatingTabBar: the dark pill tab bar (design.md 6.6). Slots: chats,
 * people, new (an action: opens New group), profile. The gradient disc
 * glides to the active tab (250 ms ease-in-out, no overshoot).
 */
import MessageCircle from 'lucide-react-native/icons/message-circle';
import Plus from 'lucide-react-native/icons/plus';
import User from 'lucide-react-native/icons/user';
import Users from 'lucide-react-native/icons/users';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { durations, EASE_IN_OUT } from '../../constants/motion';
import { space } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { log } from '../../utils/logger';
import { FloatingBar } from '../ui/FloatingBar';
import { GradientFill } from '../ui/GradientFill';
import { Icon } from '../ui/Icon';
import { PressableScale } from '../ui/PressableScale';

const INDICATOR_TIMING = { duration: durations.indicator, easing: EASE_IN_OUT };

const ITEM = 56;
const GAP = space.xs;
const PAD = space.xs;

const SLOTS = [
  { key: 'chats', icon: MessageCircle, label: 'Chats' },
  { key: 'people', icon: Users, label: 'People' },
  { key: 'new', icon: Plus, label: 'New group', action: () => router.push('/new-group') },
  { key: 'profile', icon: User, label: 'Profile' },
];

/**
 * Rendered by Tabs as its tabBar.
 * @param {{ state: { index: number, routes: { key: string, name: string }[] }, navigateToTab: (key: string) => void }} props
 */
export function FloatingTabBar({ state, navigateToTab }) {
  const { colors } = useTheme();
  const activeName = state.routes[state.index]?.name;
  const activeSlot = Math.max(
    0,
    SLOTS.findIndex((slot) => slot.key === activeName),
  );
  const offset = useSharedValue(activeSlot * (ITEM + GAP));

  useEffect(() => {
    offset.set(withTiming(activeSlot * (ITEM + GAP), INDICATOR_TIMING));
  }, [activeSlot, offset]);

  const discStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));

  function press(slot) {
    if (slot.action) {
      log.nav(`tab bar -> ${slot.key}`);
      slot.action();
      return;
    }
    const route = state.routes.find((item) => item.name === slot.key);
    if (!route || slot.key === activeName) return;
    log.nav(`tab ${activeName} -> ${slot.key}`);
    navigateToTab(route.key);
  }

  return (
    <FloatingBar style={styles.bar}>
      <Animated.View style={[styles.disc, discStyle]}>
        <GradientFill style={styles.fill} />
      </Animated.View>
      {SLOTS.map((slot, index) => {
        const isActive = index === activeSlot;
        return (
          <PressableScale
            key={slot.key}
            onPress={() => press(slot)}
            accessibilityLabel={slot.label}
          >
            <View
              style={[styles.item, { borderColor: isActive ? 'transparent' : colors.ringOnSlab }]}
              accessibilityState={{ selected: isActive }}
            >
              <Icon as={slot.icon} color="#FFFFFF" size={24} />
            </View>
          </PressableScale>
        );
      })}
    </FloatingBar>
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: PAD, gap: GAP },
  disc: { position: 'absolute', left: PAD, width: ITEM, height: ITEM },
  fill: { flex: 1, borderRadius: ITEM / 2 },
  item: {
    width: ITEM,
    height: ITEM,
    borderRadius: ITEM / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/** Space screens leave at the bottom so content clears the floating bar. */
export const TAB_BAR_CLEARANCE = 72 + space.md * 2;
