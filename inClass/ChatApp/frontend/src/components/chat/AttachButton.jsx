/**
 * AttachButton: the "+" inside the composer that picks a photo to send.
 */
import Plus from 'lucide-react-native/icons/plus';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { log } from '../../utils/logger';
import { pickPhoto } from '../../utils/pickPhoto';
import { Icon } from '../ui/Icon';
import { PressableScale } from '../ui/PressableScale';

const SIZE = 32;

/**
 * @param {object} props
 * @param {(photo: object) => void} props.onPick
 * @param {(message: string) => void} props.onError
 */
export function AttachButton({ onPick, onError }) {
  const { colors } = useTheme();
  const [isPicking, setIsPicking] = useState(false);

  async function pick() {
    setIsPicking(true);
    try {
      const photo = await pickPhoto();
      if (photo) onPick(photo);
    } catch (error) {
      log.warn(`photo picker failed: ${error?.message ?? error}`);
      onError('Could not open that photo.');
    } finally {
      setIsPicking(false);
    }
  }

  return (
    <PressableScale onPress={pick} disabled={isPicking} accessibilityLabel="Attach a photo">
      <View style={[styles.button, { backgroundColor: colors.surface }]}>
        {isPicking ? (
          <ActivityIndicator size="small" color={colors.textSecondary} />
        ) : (
          <Icon as={Plus} color={colors.textPrimary} size={20} />
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
