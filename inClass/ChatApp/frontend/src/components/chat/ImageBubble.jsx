/**
 * ImageBubble: the picture inside a message bubble. Shows the local photo
 * while it uploads (with a pulsing veil and the stage), then the server
 * copy, fading in. Tap opens the full-screen viewer.
 */
import ImageOff from 'lucide-react-native/icons/image-off';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { durations } from '../../constants/motion';
import { radius, type } from '../../constants/theme';
import { useFileImage } from '../../hooks/useFileImage';
import { useTheme } from '../../hooks/useTheme';
import { Icon } from '../ui/Icon';
import { PressableScale } from '../ui/PressableScale';
import { Skeleton } from '../ui/Skeleton';

const WIDTH = 220;
const DEFAULT_RATIO = 4 / 3;
const MIN_RATIO = 0.6;
const MAX_RATIO = 2;

/**
 * @param {object} props
 * @param {object} props.message
 * @param {(message: object) => void} props.onOpen
 */
export function ImageBubble({ message, onOpen }) {
  const { colors } = useTheme();
  const remote = useFileImage(message.localUri ? null : message.fileId);
  const [ratio, setRatio] = useState(DEFAULT_RATIO);
  const uri = message.localUri ?? remote.uri;
  const isUploading = message.localState === 'sending' && message.uploadStage;
  const size = { width: WIDTH, height: WIDTH / ratio };

  function handleLoad(event) {
    const { width, height } = event.source;
    if (width && height) setRatio(Math.min(MAX_RATIO, Math.max(MIN_RATIO, width / height)));
  }

  if (!uri) {
    return remote.status === 'error' ? (
      <PressableScale onPress={remote.reload} accessibilityLabel="Image failed, tap to reload">
        <View
          style={[styles.frame, size, styles.center, { backgroundColor: colors.surfaceRaised }]}
        >
          <Icon as={ImageOff} color={colors.textTertiary} />
          <Text style={[type.caption, { color: colors.textTertiary }]}>tap to reload</Text>
        </View>
      </PressableScale>
    ) : (
      <Skeleton width={WIDTH} height={WIDTH / ratio} radius={radius.image} />
    );
  }

  return (
    <PressableScale
      onPress={() => onOpen(message)}
      disabled={Boolean(isUploading) || !message.fileId}
      scaleTo={0.97}
      haptic={false}
      accessibilityLabel="Photo, tap to view"
    >
      <View style={[styles.frame, size]}>
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={durations.imageFade}
          onLoad={handleLoad}
        />
        {isUploading ? (
          <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: colors.scrim }]}>
            <ActivityIndicator color="#FFFFFF" />
            <Text style={[type.caption, styles.stage]}>{message.uploadStage}</Text>
          </View>
        ) : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: radius.image, overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 4 },
  stage: { color: '#FFFFFF' },
});
