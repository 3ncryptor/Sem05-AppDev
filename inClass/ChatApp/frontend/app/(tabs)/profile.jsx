/**
 * Profile tab, minimal for now: who is signed in and where, log out and the
 * playground. F10 adds the avatar style picker, appearance and developer
 * toggles.
 */
import LogOut from 'lucide-react-native/icons/log-out';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../src/components/avatar/Avatar';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';
import { RingButton } from '../../src/components/ui/RingButton';
import { Slab } from '../../src/components/ui/Slab';
import { Wordmark } from '../../src/components/ui/Wordmark';
import { space, type } from '../../src/constants/theme';
import { useSession } from '../../src/hooks/useSession';
import { useTheme } from '../../src/hooks/useTheme';
import { haptics } from '../../src/utils/haptics';

export default function Profile() {
  const { colors } = useTheme();
  const session = useSession();

  function logOut() {
    haptics.select();
    session.signOut();
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface }]}>
      <Slab variant="notch">
        <View style={styles.header}>
          <Wordmark size={26} color={colors.textOnSlab} />
          <RingButton icon={LogOut} variant="slab" accessibilityLabel="Log out" onPress={logOut} />
        </View>
      </Slab>
      <View style={styles.body}>
        <Avatar name={session.name} size={96} />
        <Text style={[type.title, { color: colors.textPrimary }]}>{session.name}</Text>
        <Text style={[type.meta, { color: colors.textSecondary }]}>{session.baseUrl}</Text>
        <Text style={[type.caption, { color: colors.textTertiary }]}>
          id {session.user?.id ?? 'unknown'}
        </Text>
        <View style={styles.action}>
          <PrimaryButton label="Open playground" onPress={() => router.push('/playground')} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xs },
  action: { marginTop: space.xl, alignSelf: 'stretch', paddingHorizontal: space.xl },
});
