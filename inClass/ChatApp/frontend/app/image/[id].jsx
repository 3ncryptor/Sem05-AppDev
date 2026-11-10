/**
 * Image viewer (buildPlan.md 5.6): black, full screen. Pinch to zoom,
 * double tap to zoom in or out, drag when zoomed, swipe down to close.
 * Route params: id (file id), sender, time, caption.
 */
import X from 'lucide-react-native/icons/x';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import {
  GestureDetector,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RingButton } from '../../src/components/ui/RingButton';
import { durations, softPop, springs } from '../../src/constants/motion';
import { space, type } from '../../src/constants/theme';
import { useFileImage } from '../../src/hooks/useFileImage';
import { clampScale, MIN_SCALE, nextDoubleTapScale, shouldDismiss } from '../../src/utils/zoom';

/** The photo grows in as the viewer opens, so it feels lifted out of the chat. */
const PHOTO_IN = softPop(durations.sheet);

const FADE_DISTANCE = 300;

function close() {
  router.back();
}

export default function ImageViewer() {
  const { id, sender, time, caption } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const image = useFileImage(String(id));

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  function reset() {
    'worklet';
    scale.set(withSpring(1, springs.settle));
    savedScale.set(1);
    x.set(withSpring(0, springs.settle));
    y.set(withSpring(0, springs.settle));
    savedX.set(0);
    savedY.set(0);
  }

  const pinch = usePinchGesture({
    onUpdate: (event) => {
      'worklet';
      scale.set(clampScale(savedScale.get() * event.scale));
    },
    onDeactivate: () => {
      'worklet';
      savedScale.set(scale.get());
      if (scale.get() <= MIN_SCALE) reset();
    },
  });

  const pan = usePanGesture({
    maxPointers: 1,
    onUpdate: (event) => {
      'worklet';
      if (savedScale.get() > MIN_SCALE) {
        x.set(savedX.get() + event.translationX);
        y.set(savedY.get() + event.translationY);
      } else {
        y.set(Math.max(0, event.translationY));
      }
    },
    onDeactivate: (event) => {
      'worklet';
      if (savedScale.get() > MIN_SCALE) {
        savedX.set(x.get());
        savedY.set(y.get());
        return;
      }
      if (shouldDismiss(event.translationY, event.velocityY)) scheduleOnRN(close);
      else y.set(withSpring(0, { ...springs.snap, velocity: event.velocityY }));
    },
  });

  const doubleTap = useTapGesture({
    numberOfTaps: 2,
    onActivate: () => {
      'worklet';
      const next = nextDoubleTapScale(savedScale.get());
      if (next === MIN_SCALE) reset();
      else {
        scale.set(withSpring(next, springs.settle));
        savedScale.set(next);
      }
    },
  });

  const gestures = useSimultaneousGestures(pinch, pan, doubleTap);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { scale: scale.get() }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: savedScale.get() > MIN_SCALE ? 1 : interpolate(y.get(), [0, FADE_DISTANCE], [1, 0.3]),
  }));

  return (
    <View style={styles.screen}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.black, backdropStyle]} />
      <GestureDetector gesture={gestures}>
        <Animated.View style={[styles.stage, imageStyle]}>
          {image.uri ? (
            <Animated.View entering={PHOTO_IN} style={styles.image}>
              <Image
                source={{ uri: image.uri }}
                style={styles.image}
                contentFit="contain"
                accessibilityLabel={caption ? `Photo: ${caption}` : 'Photo'}
              />
            </Animated.View>
          ) : image.status === 'error' ? (
            <Text style={[type.meta, styles.text]}>This photo could not be loaded.</Text>
          ) : (
            <ActivityIndicator color="#FFFFFF" />
          )}
        </Animated.View>
      </GestureDetector>
      <View style={[styles.top, { paddingTop: insets.top + space.xs }]}>
        <RingButton icon={X} variant="slab" accessibilityLabel="Close photo" onPress={close} />
      </View>
      {sender || caption ? (
        <View
          style={[styles.bottom, { paddingBottom: insets.bottom + space.lg }]}
          pointerEvents="none"
        >
          {sender ? (
            <Text style={[type.meta, styles.muted]}>
              {sender}
              {time ? ` · ${time}` : ''}
            </Text>
          ) : null}
          {caption ? <Text style={[type.body, styles.text]}>{caption}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  black: { backgroundColor: '#000000' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  top: { position: 'absolute', left: space.md, right: space.md },
  bottom: { position: 'absolute', left: space.lg, right: space.lg, bottom: 0, gap: 4 },
  text: { color: '#FFFFFF' },
  muted: { color: 'rgba(255,255,255,0.7)' },
});
