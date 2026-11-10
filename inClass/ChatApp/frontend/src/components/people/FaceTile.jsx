/**
 * FaceTile: a big face on its pastel tint with the name on a frosted strip
 * (buildPlan.md 5.4, design.md 6.9).
 * mode "message": a message ring button sits top-left; tap opens the DM.
 * mode "select": a check ring sits top-left; selected tiles get a
 * gradient ring and the check pops in.
 */
import Check from 'lucide-react-native/icons/check';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import { BlurView } from 'expo-blur';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { radius, space, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { haptics } from '../../utils/haptics';
import { Avatar } from '../avatar/Avatar';
import { avatarTint } from '../avatar/avatarSvg';
import { GradientFill } from '../ui/GradientFill';
import { Icon } from '../ui/Icon';
import { PressableScale } from '../ui/PressableScale';
import { softPop } from '../../constants/motion';

const POP = softPop();

const RING = 36;
const SELECTED_RING = 3;
const FROSTED = 'rgba(255,255,255,0.25)';

/**
 * @param {object} props
 * @param {string} props.name
 * @param {number} props.size tile width (and height)
 * @param {'message' | 'select'} props.mode
 * @param {boolean} [props.isMe] marked "(you)" and not tappable
 * @param {boolean} [props.isSelected]
 * @param {boolean} [props.isBusy] spinner while a DM is being opened
 * @param {() => void} props.onPress
 */
export function FaceTile({
  name,
  size,
  mode,
  isMe = false,
  isSelected = false,
  isBusy = false,
  onPress,
}) {
  const { colors, isDark } = useTheme();
  const isSelect = mode === 'select';

  function press() {
    if (isSelect) haptics.select();
    onPress();
  }

  const badge = isBusy ? (
    <ActivityIndicator color={colors.textPrimary} />
  ) : isSelect ? (
    isSelected ? (
      <Animated.View entering={POP}>
        <GradientFill style={styles.ring}>
          <Icon as={Check} color="#FFFFFF" size={18} />
        </GradientFill>
      </Animated.View>
    ) : (
      <View style={[styles.ring, styles.emptyRing]} />
    )
  ) : (
    <View style={[styles.ring, { backgroundColor: FROSTED }]}>
      <Icon as={MessageCircle} color={colors.textPrimary} size={18} />
    </View>
  );

  const tile = (
    <View
      style={[
        styles.tile,
        { width: size, height: size, backgroundColor: avatarTint(name) },
        isSelected && styles.tileInset,
      ]}
    >
      <View style={styles.face}>
        <Avatar name={name} size={size * 0.62} />
      </View>
      {isMe ? null : <View style={styles.badge}>{badge}</View>}
      <BlurView intensity={25} tint={isDark ? 'dark' : 'light'} style={styles.strip}>
        <Text style={[type.chip, { color: colors.textPrimary }]} numberOfLines={1}>
          {isMe ? `${name} (you)` : name}
        </Text>
      </BlurView>
    </View>
  );

  const framed = isSelected ? (
    <GradientFill style={styles.selectedFrame}>{tile}</GradientFill>
  ) : (
    tile
  );

  if (isMe) return framed;
  return (
    <PressableScale
      onPress={press}
      haptic={!isSelect}
      disabled={isBusy}
      scaleTo={0.96}
      accessibilityLabel={
        isSelect ? `${isSelected ? 'Unselect' : 'Select'} ${name}` : `Message ${name}`
      }
    >
      {framed}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  tile: { borderRadius: radius.card, overflow: 'hidden' },
  tileInset: { borderRadius: radius.card - SELECTED_RING },
  selectedFrame: { padding: SELECTED_RING, borderRadius: radius.card, margin: -SELECTED_RING },
  face: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: space.sm, left: space.sm },
  ring: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyRing: { borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)' },
  strip: {
    position: 'absolute',
    left: space.xs,
    right: space.xs,
    bottom: space.xs,
    borderRadius: radius.pill,
    overflow: 'hidden',
    paddingHorizontal: space.sm,
    paddingVertical: 6,
  },
});
