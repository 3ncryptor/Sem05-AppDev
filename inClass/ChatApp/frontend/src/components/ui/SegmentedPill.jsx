/**
 * SegmentedPill: a pill-shaped switch between a few options (for example
 * "my laptop" / "class server" on login). The gradient thumb springs to the
 * chosen option with the tab spring from design.md 8.
 */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { springs } from '../../constants/motion';
import { radius, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { haptics } from '../../utils/haptics';
import { segmentWidth, selectedIndex } from '../../utils/segments';
import { GradientFill } from './GradientFill';

const HEIGHT = 44;
const PADDING = 4;

/**
 * @param {object} props
 * @param {{ value: string, label: string }[]} props.options
 * @param {string} props.value the selected option's value
 * @param {(value: string) => void} props.onChange
 * @param {'surface' | 'slab'} [props.on='surface'] what the pill sits on
 */
export function SegmentedPill({ options, value, onChange, on = 'surface' }) {
  const { colors } = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);
  const offset = useSharedValue(0);

  const width = segmentWidth(trackWidth, options.length);
  const index = selectedIndex(options, value);

  useEffect(() => {
    offset.set(withSpring(index * width, springs.tab));
  }, [index, width, offset]);

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));
  const trackColor = on === 'slab' ? colors.slabRaised : colors.surfaceRaised;
  const idleText = on === 'slab' ? colors.textOnSlabMuted : colors.textSecondary;

  function choose(next) {
    if (next === value) return;
    haptics.select();
    onChange(next);
  }

  return (
    <View
      style={[styles.track, { backgroundColor: trackColor }]}
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width - PADDING * 2)}
      accessibilityRole="tablist"
    >
      {width > 0 ? (
        <Animated.View style={[styles.thumb, { width }, thumbStyle]}>
          <GradientFill style={styles.fill} />
        </Animated.View>
      ) : null}
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => choose(option.value)}
            style={styles.segment}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
          >
            <Text style={[type.chip, { color: isSelected ? '#FFFFFF' : idleText }]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: HEIGHT, borderRadius: radius.pill, padding: PADDING, flexDirection: 'row' },
  thumb: { position: 'absolute', top: PADDING, bottom: PADDING, left: PADDING },
  fill: { flex: 1, borderRadius: radius.pill },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
