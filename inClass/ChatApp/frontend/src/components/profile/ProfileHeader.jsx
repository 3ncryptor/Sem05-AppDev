/**
 * ProfileHeader: the tall slab on Profile with your face (springs in), name
 * and user id with a copy button (buildPlan.md 5.7).
 */
import Copy from 'lucide-react-native/icons/copy';
import * as Clipboard from 'expo-clipboard';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { space, type } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';
import { haptics } from '../../utils/haptics';
import { log } from '../../utils/logger';
import { Avatar } from '../avatar/Avatar';
import { Icon } from '../ui/Icon';
import { PressableScale } from '../ui/PressableScale';
import { Slab } from '../ui/Slab';
import { softPop } from '../../constants/motion';

const POP = softPop();

const SHORT_ID = 6;

/** @param {{ name: string, userId: string }} props */
export function ProfileHeader({ name, userId }) {
  const { colors } = useTheme();
  const shortId =
    userId.length > SHORT_ID * 2 ? `${userId.slice(0, 4)}...${userId.slice(-SHORT_ID)}` : userId;

  async function copyId() {
    await Clipboard.setStringAsync(userId);
    haptics.success();
    log.app('profile: user id copied');
  }

  return (
    <Slab variant="notch" style={styles.slab}>
      <Animated.View entering={POP}>
        <Avatar name={name} size={96} ringColor={colors.ringOnSlab} />
      </Animated.View>
      <Text style={[type.title, { color: colors.textOnSlab }]}>{name}</Text>
      <PressableScale onPress={copyId} accessibilityLabel="Copy your user id">
        <View style={[styles.idPill, { backgroundColor: colors.slabRaised }]}>
          <Text style={[type.caption, { color: colors.textOnSlabMuted }]}>id {shortId}</Text>
          <Icon as={Copy} color={colors.textOnSlabMuted} size={14} />
        </View>
      </PressableScale>
    </Slab>
  );
}

const styles = StyleSheet.create({
  slab: { alignItems: 'center', gap: space.xs, paddingBottom: space.xl },
  idPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderRadius: 999,
  },
});
