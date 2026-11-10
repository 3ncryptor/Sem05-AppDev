/**
 * EmptyState: a gentle illustration (gradient disc with an icon and a few
 * faces), a line of text and an optional action, used for "no chats yet"
 * and for load errors with a retry.
 */
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { space, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { AvatarStack } from '../avatar/AvatarStack';
import { GradientFill } from './GradientFill';
import { Icon } from './Icon';
import { PrimaryButton } from './PrimaryButton';

const DISC = 96;
const FACES = ['aarav', 'diya', 'kabir'];

/**
 * @param {object} props
 * @param {import('react').ComponentType<any>} props.icon
 * @param {string} props.title
 * @param {string} [props.message]
 * @param {string} [props.actionLabel]
 * @param {() => void} [props.onAction]
 */
export function EmptyState({ icon, title, message, actionLabel, onAction }) {
  const { colors } = useTheme();

  return (
    <Animated.View entering={FadeIn} style={styles.wrap}>
      <View style={styles.art}>
        <GradientFill style={styles.disc}>
          <Icon as={icon} color="#FFFFFF" size={40} />
        </GradientFill>
        <View style={styles.faces}>
          <AvatarStack names={FACES} size={32} />
        </View>
      </View>
      <Text style={[type.heading, { color: colors.textPrimary }]}>{title}</Text>
      {message ? (
        <Text style={[type.meta, styles.message, { color: colors.textSecondary }]}>{message}</Text>
      ) : null}
      {actionLabel ? (
        <View style={styles.action}>
          <PrimaryButton label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.xs, paddingVertical: space.xxxl },
  art: { marginBottom: space.lg },
  disc: {
    width: DISC,
    height: DISC,
    borderRadius: DISC / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faces: { position: 'absolute', bottom: -space.sm, right: -space.xl },
  message: { textAlign: 'center', paddingHorizontal: space.xl },
  action: { marginTop: space.md, alignSelf: 'stretch', paddingHorizontal: space.xxl },
});
