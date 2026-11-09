/**
 * Sheet: a dark bottom sheet (top radius 44) over a dimmed background
 * (design.md 8 "Sheet open"). Tapping the scrim closes it. Used later by the
 * Inspector and image actions.
 */
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { springs } from '../../constants/motion';
import { radius, space } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';

const HANDLE_WIDTH = 40;

/**
 * @param {object} props
 * @param {boolean} props.visible
 * @param {() => void} props.onClose
 * @param {object} [props.style] style of the sheet body (height, padding)
 * @param {import('react').ReactNode} props.children
 */
export function Sheet({ visible, onClose, style, children }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
      />
      <View style={styles.anchor} pointerEvents="box-none">
        <Animated.View
          entering={SlideInDown.springify()
            .damping(springs.sheet.damping)
            .stiffness(springs.sheet.stiffness)}
          style={[
            styles.sheet,
            { backgroundColor: colors.slab, paddingBottom: insets.bottom + space.md },
            style,
          ]}
        >
          <Animated.View
            entering={FadeIn}
            style={[styles.handle, { backgroundColor: colors.textOnSlabMuted }]}
          />
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  anchor: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    gap: space.md,
  },
  handle: {
    alignSelf: 'center',
    width: HANDLE_WIDTH,
    height: 4,
    borderRadius: 2,
    opacity: 0.6,
  },
});
