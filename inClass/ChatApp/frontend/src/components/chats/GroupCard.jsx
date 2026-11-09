/**
 * GroupCard: one group in the Chats carousel (buildPlan.md 5.2, design.md 6.7).
 * Top: a gradient wash with member faces, the group name and member chips,
 * and an action bar (members, open). Bottom: a dark footer slab.
 */
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import Users from 'lucide-react-native/icons/users';
import { StyleSheet, Text, View } from 'react-native';
import { radius, space, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { AvatarStack } from '../avatar/AvatarStack';
import { Chip } from '../ui/Chip';
import { GradientFill } from '../ui/GradientFill';
import { Icon } from '../ui/Icon';
import { PressableScale } from '../ui/PressableScale';
import { RingButton } from '../ui/RingButton';
import { FaceCollage } from './FaceCollage';

const MEDIA_HEIGHT = 250;
const MAX_CHIPS = 4;
const ACTION_HEIGHT = 56;

/**
 * @param {object} props
 * @param {string} props.title
 * @param {string[]} props.names member usernames
 * @param {number} props.width card width
 * @param {() => void} props.onOpen
 * @param {() => void} props.onShowMembers
 */
export function GroupCard({ title, names, width, onOpen, onShowMembers }) {
  const { colors } = useTheme();
  const extra = names.length - MAX_CHIPS;

  return (
    <View style={[styles.card, { width, backgroundColor: colors.slab }]}>
      <GradientFill style={styles.media}>
        <FaceCollage names={names} ringColor="rgba(255,255,255,0.6)" />
        <View style={styles.mediaText}>
          <Text style={[type.display, styles.title]} numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.chips}>
            {names.slice(0, MAX_CHIPS).map((name, index) => (
              <Chip key={`${name}-${index}`} label={name} variant="frosted" />
            ))}
            {extra > 0 ? <Chip label={`+${extra}`} variant="frosted" /> : null}
          </View>
        </View>
        <View style={[styles.actions, { backgroundColor: colors.slab }]}>
          <RingButton
            icon={Users}
            variant="slab"
            accessibilityLabel={`Members of ${title}`}
            onPress={onShowMembers}
          />
          <PressableScale onPress={onOpen} style={styles.grow} accessibilityLabel={`Open ${title}`}>
            <GradientFill style={styles.open}>
              <Text style={[type.chip, styles.openText]}>open</Text>
              <Icon as={ArrowRight} color="#FFFFFF" size={18} />
            </GradientFill>
          </PressableScale>
        </View>
      </GradientFill>
      <View style={styles.footer}>
        <AvatarStack names={names} size={36} on="slab" />
        <View style={styles.footerText}>
          <Text style={[type.heading, { color: colors.textOnSlab }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[type.meta, { color: colors.textOnSlabMuted }]}>{names.length} members</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, overflow: 'hidden' },
  media: {
    height: MEDIA_HEIGHT,
    borderRadius: radius.card,
    padding: space.sm,
    justifyContent: 'flex-end',
    gap: space.sm,
  },
  mediaText: { gap: space.xs, paddingHorizontal: space.xs },
  title: { color: '#FFFFFF', maxWidth: '75%' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xxs },
  actions: {
    height: ACTION_HEIGHT + space.xs,
    borderRadius: radius.pill,
    padding: space.xxs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  grow: { flex: 1 },
  open: {
    height: 48,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
  openText: { color: '#FFFFFF', fontSize: 15 },
  footer: { flexDirection: 'row', alignItems: 'center', padding: space.md, gap: space.sm },
  footerText: { flex: 1, alignItems: 'flex-end' },
});
