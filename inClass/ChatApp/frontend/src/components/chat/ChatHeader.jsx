/**
 * ChatHeader: the chat room's notch slab (buildPlan.md 5.3).
 * Group: back, name, members button; then the face stack, "live" and the
 * member count. DM: back, one large face with the name, and "live" / "dm".
 * "live" means our polling is healthy, not that the other person is online.
 */
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import Users from 'lucide-react-native/icons/users';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { space, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { Avatar } from '../avatar/Avatar';
import { AvatarStack } from '../avatar/AvatarStack';
import { RingButton } from '../ui/RingButton';
import { Slab } from '../ui/Slab';

const DOT = 8;

function LiveDot({ isLive, fallback }) {
  const { colors } = useTheme();
  return (
    <View style={styles.live} accessibilityLabel={isLive ? 'Live' : 'Offline'}>
      <View style={[styles.dot, { backgroundColor: isLive ? colors.success : colors.danger }]} />
      <Text style={[type.meta, { color: colors.textOnSlabMuted }]}>
        {isLive ? (fallback ?? 'live') : 'offline'}
      </Text>
    </View>
  );
}

/**
 * @param {object} props
 * @param {string} props.title
 * @param {boolean} props.isGroup
 * @param {string[]} props.names member usernames
 * @param {boolean} props.isLive
 * @param {() => void} props.onShowMembers
 */
export function ChatHeader({ title, isGroup, names, isLive, onShowMembers }) {
  const { colors } = useTheme();
  const back = (
    <RingButton
      icon={ArrowLeft}
      variant="slab"
      accessibilityLabel="Back"
      onPress={() => router.back()}
    />
  );

  if (!isGroup) {
    return (
      <Slab variant="notch">
        <View style={styles.row}>
          {back}
          <View style={styles.dmTitle}>
            <Avatar name={title} size={48} />
            <Text style={[type.title, styles.grow, { color: colors.textOnSlab }]} numberOfLines={1}>
              {title}
            </Text>
          </View>
          <LiveDot isLive={isLive} />
        </View>
      </Slab>
    );
  }

  return (
    <Slab variant="notch">
      <View style={styles.row}>
        {back}
        <Text style={[type.title, styles.title, { color: colors.textOnSlab }]} numberOfLines={1}>
          {title}
        </Text>
        <RingButton
          icon={Users}
          variant="slab"
          accessibilityLabel="Members"
          onPress={onShowMembers}
        />
      </View>
      <View style={[styles.row, styles.second]}>
        <AvatarStack names={names} size={40} on="slab" />
        <View style={styles.right}>
          <LiveDot isLive={isLive} />
          <Text style={[type.meta, { color: colors.textOnSlabMuted }]}>{names.length} people</Text>
        </View>
      </View>
    </Slab>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  second: { marginTop: space.md },
  title: { flex: 1, textAlign: 'center' },
  dmTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  grow: { flex: 1 },
  right: { alignItems: 'flex-end', gap: 2 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2 },
});
