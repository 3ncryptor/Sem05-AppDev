/**
 * DmRow: one direct conversation as a light card row (buildPlan.md 5.2, V6).
 *
 *   (face)  diya                         9:41 am
 *           are you coming to the lab?       (2)
 *
 * Unread rows get a bolder name and preview and the gradient badge.
 */
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { fonts, radius, shadow, space, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { Avatar } from '../avatar/Avatar';
import { Badge } from '../ui/Badge';
import { PressableScale } from '../ui/PressableScale';

/**
 * @param {object} props
 * @param {string} props.name the other person
 * @param {string} [props.preview] last message, "" when unknown yet
 * @param {string} [props.time] e.g. "9:41 am"
 * @param {number} [props.unread]
 * @param {() => void} props.onPress
 */
function DmRowView({ name, preview = '', time = '', unread = 0, onPress }) {
  const { colors } = useTheme();
  const hasUnread = unread > 0;
  const label = [
    `Chat with ${name}`,
    hasUnread ? `${unread} unread` : '',
    preview ? `last message: ${preview}` : '',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <PressableScale onPress={onPress} accessibilityLabel={label}>
      <View style={[styles.row, { backgroundColor: colors.card, ...shadow(1, colors.shadow) }]}>
        <Avatar name={name} size={48} />
        <View style={styles.text}>
          <View style={styles.line}>
            <Text
              style={[
                type.heading,
                styles.grow,
                {
                  color: colors.textPrimary,
                  fontFamily: hasUnread ? fonts.semibold : fonts.medium,
                },
              ]}
              numberOfLines={1}
            >
              {name}
            </Text>
            {time ? (
              <Text
                style={[
                  type.caption,
                  { color: hasUnread ? colors.textPrimary : colors.textTertiary },
                ]}
              >
                {time}
              </Text>
            ) : null}
          </View>
          <View style={styles.line}>
            <Text
              style={[
                type.meta,
                styles.grow,
                {
                  color: hasUnread ? colors.textPrimary : colors.textSecondary,
                  fontFamily: hasUnread ? fonts.medium : fonts.regular,
                },
              ]}
              numberOfLines={1}
            >
              {preview || 'say hi'}
            </Text>
            <Badge count={unread} ringColor={colors.card} isAnimated={false} />
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

export const DmRow = memo(DmRowView);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.sm,
    paddingRight: space.md,
    borderRadius: radius.bubble,
  },
  text: { flex: 1, gap: 2 },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  grow: { flex: 1 },
});
