/**
 * InspectorTabBar: the Inspector's five tabs at the bottom, where the thumb
 * is (buildPlan.md 15). Technical names, an icon each; the active tab sits on
 * a raised pill that glides between tabs (no sliding of the content itself).
 */
import ArrowDownUp from 'lucide-react-native/icons/arrow-down-up';
import Gauge from 'lucide-react-native/icons/gauge';
import ScrollText from 'lucide-react-native/icons/scroll-text';
import SlidersHorizontal from 'lucide-react-native/icons/sliders-horizontal';
import Workflow from 'lucide-react-native/icons/workflow';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { durations, EASE_IN_OUT } from '../../constants/motion';
import { fonts, space } from '../../constants/theme';
import { INSPECTOR_TABS } from '../../debug/inspectorStore';
import { useTheme } from '../../hooks/useTheme';
import { haptics } from '../../utils/haptics';
import { Icon } from '../ui/Icon';

const ICONS = {
  overview: Gauge,
  flow: Workflow,
  network: ArrowDownUp,
  logs: ScrollText,
  tools: SlidersHorizontal,
};
const HEIGHT = 60;
const GLIDE = { duration: durations.indicator, easing: EASE_IN_OUT };

/**
 * @param {object} props
 * @param {string} props.tab
 * @param {(tab: string) => void} props.onChange
 * @param {number} [props.problems] failed requests, shown as a dot on network
 */
export function InspectorTabBar({ tab, onChange, problems = 0 }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const slot = width / INSPECTOR_TABS.length;
  const index = Math.max(0, INSPECTOR_TABS.indexOf(tab));
  const x = useSharedValue(0);

  useEffect(() => {
    x.set(withTiming(index * slot, GLIDE));
  }, [index, slot, x]);

  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  return (
    <View
      style={[styles.bar, { backgroundColor: colors.slabRaised }]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessibilityRole="tablist"
    >
      {width ? (
        <Animated.View
          style={[styles.pill, { width: slot - 8, backgroundColor: colors.slab }, pillStyle]}
        />
      ) : null}
      {INSPECTOR_TABS.map((name) => {
        const isActive = name === tab;
        const tint = isActive ? colors.textOnSlab : colors.textOnSlabMuted;
        return (
          <Pressable
            key={name}
            style={styles.item}
            onPress={() => {
              if (isActive) return;
              haptics.select();
              onChange(name);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={name}
          >
            <View>
              <Icon as={ICONS[name]} color={tint} size={20} />
              {name === 'network' && problems > 0 ? (
                <View style={[styles.alert, { backgroundColor: colors.dangerOnSlab }]} />
              ) : null}
            </View>
            <Text style={[styles.label, { color: tint }]}>{name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: space.md,
  },
  pill: { position: 'absolute', left: 4, top: 4, bottom: 4, borderRadius: (HEIGHT - 8) / 2 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, height: HEIGHT },
  label: { fontFamily: fonts.medium, fontSize: 11 },
  alert: { position: 'absolute', right: -4, top: -2, width: 7, height: 7, borderRadius: 4 },
});
