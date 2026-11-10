/**
 * ChatsHeader: the notch slab on the Chats tab (V6). The wordmark and your
 * face on top (the island sits between them), then a greeting and a one-line
 * unread summary, so the home says something the moment it opens:
 *
 *   huddle.        [island]        (face)
 *   good evening, aarav
 *   * 3 new in 2 chats
 */
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { durations } from '../../constants/motion';
import { space, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { Avatar } from '../avatar/Avatar';
import { GradientFill } from '../ui/GradientFill';
import { PressableScale } from '../ui/PressableScale';
import { Slab } from '../ui/Slab';
import { Wordmark } from '../ui/Wordmark';

const DOT = 7;
/** "all caught up" -> "2 new" fades in instead of snapping. */
const SUMMARY_IN = FadeIn.duration(durations.base);

/**
 * @param {object} props
 * @param {string} props.myName
 * @param {string} props.greeting e.g. "good evening"
 * @param {string} props.summary e.g. "3 new in 2 chats"
 * @param {boolean} props.hasUnread
 */
export function ChatsHeader({ myName, greeting, summary, hasUnread }) {
  const { colors } = useTheme();
  return (
    <Slab variant="notch">
      <View style={styles.row}>
        <Wordmark size={22} color={colors.textOnSlab} />
        <PressableScale onPress={() => router.navigate('/profile')} accessibilityLabel="Profile">
          <Avatar name={myName} size={40} ringColor={colors.ringOnSlab} />
        </PressableScale>
      </View>
      <View style={styles.text} accessibilityRole="header">
        <Text style={[type.title, { color: colors.textOnSlab }]} numberOfLines={1}>
          {myName ? `${greeting}, ${myName}` : greeting}
        </Text>
        <Animated.View key={summary} entering={SUMMARY_IN} style={styles.summary}>
          {hasUnread ? <GradientFill style={styles.dot} /> : null}
          <Text style={[type.meta, { color: colors.textOnSlabMuted }]}>{summary}</Text>
        </Animated.View>
      </View>
    </Slab>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  text: { marginTop: space.sm, gap: space.xxs },
  summary: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2 },
});
