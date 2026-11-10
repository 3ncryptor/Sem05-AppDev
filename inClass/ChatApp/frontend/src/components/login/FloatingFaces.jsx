/**
 * FloatingFaces: a row of avatars that gently bob up and down on the login
 * screen, a hint of the people inside. Still when "reduce motion" is on.
 */
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { space } from '../../constants/theme';
import { Avatar } from '../avatar/Avatar';

const FACES = ['aarav', 'diya', 'kabir', 'meera', 'rohan'];
const DRIFT = 6;
const DRIFT_MS = 1800;
const STAGGER = 260;
const SIZE = 44;

function Face({ name, index }) {
  const offset = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    offset.set(
      withDelay(
        index * STAGGER,
        withRepeat(
          withTiming(-DRIFT, { duration: DRIFT_MS, easing: Easing.inOut(Easing.sin) }),
          -1,
          true,
        ),
      ),
    );
  }, [index, offset, reduceMotion]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));
  return (
    <Animated.View style={style}>
      <Avatar name={name} size={SIZE} />
    </Animated.View>
  );
}

export function FloatingFaces() {
  return (
    <View style={styles.row} importantForAccessibility="no-hide-descendants" accessible={false}>
      {FACES.map((name, index) => (
        <Face key={name} name={name} index={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: space.xs, height: SIZE + DRIFT * 2 },
});
