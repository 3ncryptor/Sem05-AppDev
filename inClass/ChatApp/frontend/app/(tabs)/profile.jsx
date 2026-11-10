/**
 * Profile tab (buildPlan.md 5.7): your face, name and id; avatar style
 * picker (updates every face at once); appearance override; the server
 * you are on with a live reachability check; developer toggles for the
 * Inspector; the playground; and log out with a confirm sheet.
 */
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { TAB_BAR_CLEARANCE } from '../../src/components/navigation/FloatingTabBar';
import { LogoutSheet } from '../../src/components/profile/LogoutSheet';
import { ProfileHeader } from '../../src/components/profile/ProfileHeader';
import { SettingRow } from '../../src/components/profile/SettingRow';
import { StylePicker } from '../../src/components/profile/StylePicker';
import { Icon } from '../../src/components/ui/Icon';
import { PrimaryButton } from '../../src/components/ui/PrimaryButton';
import { PressableScale } from '../../src/components/ui/PressableScale';
import { SegmentedPill } from '../../src/components/ui/SegmentedPill';
import { space, type } from '../../src/constants/theme';
import { openInspector } from '../../src/debug/inspectorStore';
import { useConnectionTest } from '../../src/hooks/useConnectionTest';
import { useSession } from '../../src/hooks/useSession';
import { useStore } from '../../src/hooks/useStore';
import { useTheme } from '../../src/hooks/useTheme';
import { settingsStore, updateSettings } from '../../src/store/settingsStore';
import { haptics } from '../../src/utils/haptics';

const APPEARANCE_OPTIONS = [
  { value: 'auto', label: 'auto' },
  { value: 'light', label: 'light' },
  { value: 'dark', label: 'dark' },
];
const STATUS_TEXT = { idle: '', checking: 'checking', ok: 'reachable', fail: 'unreachable' };

export default function Profile() {
  const { colors } = useTheme();
  const session = useSession();
  const settings = useStore(settingsStore);
  const connection = useConnectionTest();
  const [isConfirmingLogout, setIsConfirmingLogout] = useState(false);

  useEffect(() => {
    connection.check(session.baseUrl);
    // Check once when the screen opens; the user can tap the row to check again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.baseUrl]);

  function logOut() {
    setIsConfirmingLogout(false);
    haptics.success();
    session.signOut();
  }

  const label = (text) => (
    <Text style={[type.caption, styles.label, { color: colors.textTertiary }]}>{text}</Text>
  );
  const dotColor =
    connection.state === 'ok'
      ? colors.success
      : connection.state === 'fail'
        ? colors.danger
        : colors.textTertiary;

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_CLEARANCE }}>
        <ProfileHeader name={session.name} userId={session.user?.id ?? ''} />
        <View style={styles.body}>
          {label('your look')}
          <StylePicker
            name={session.name}
            value={settings.avatarStyle}
            onChange={(avatarStyle) => updateSettings({ avatarStyle })}
          />

          {label('appearance')}
          <SegmentedPill
            options={APPEARANCE_OPTIONS}
            value={settings.appearance}
            onChange={(appearance) => updateSettings({ appearance })}
          />

          {label('server')}
          <PressableScale
            onPress={() => connection.check(session.baseUrl)}
            scaleTo={0.98}
            accessibilityLabel="Check the server connection"
          >
            <SettingRow
              label={session.serverMode === 'lan' ? 'this mac' : 'class server'}
              detail={session.baseUrl}
              right={
                <View style={styles.status}>
                  <View style={[styles.dot, { backgroundColor: dotColor }]} />
                  <Text style={[type.caption, { color: colors.textSecondary }]}>
                    {STATUS_TEXT[connection.state]}
                  </Text>
                </View>
              }
            />
          </PressableScale>

          {label('developer')}
          <SettingRow
            label="show debug orb"
            detail="a floating button that opens the Inspector"
            toggle={{ value: settings.showOrb, onChange: (showOrb) => updateSettings({ showOrb }) }}
          />
          <SettingRow
            label="shake to open inspector"
            toggle={{
              value: settings.shakeToOpen,
              onChange: (shakeToOpen) => updateSettings({ shakeToOpen }),
            }}
          />
          <PressableScale
            onPress={() => openInspector('profile')}
            scaleTo={0.98}
            accessibilityLabel="Open the inspector"
          >
            <SettingRow
              label="inspector"
              detail="logs, network requests and demo tools"
              right={<Icon as={ChevronRight} color={colors.textTertiary} size={18} />}
            />
          </PressableScale>
          <PressableScale
            onPress={() => router.push('/playground')}
            scaleTo={0.98}
            accessibilityLabel="Open the component playground"
          >
            <SettingRow
              label="component playground"
              right={<Icon as={ChevronRight} color={colors.textTertiary} size={18} />}
            />
          </PressableScale>

          <View style={styles.logout}>
            <PrimaryButton label="log out" onPress={() => setIsConfirmingLogout(true)} />
          </View>
        </View>
      </ScrollView>
      <LogoutSheet
        visible={isConfirmingLogout}
        onCancel={() => setIsConfirmingLogout(false)}
        onConfirm={logOut}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { padding: space.md, gap: space.xs },
  label: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: space.xs,
    marginTop: space.md,
  },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  logout: { marginTop: space.xl },
});
