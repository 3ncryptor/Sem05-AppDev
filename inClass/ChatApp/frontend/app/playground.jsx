/**
 * Playground: a dev-only gallery of every UI primitive, for checking the
 * design on a real phone in light and dark mode (and for viva demos).
 * Not linked from the finished app; reachable from the start screen in dev.
 */
import { router } from 'expo-router';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import Heart from 'lucide-react-native/icons/heart';
import House from 'lucide-react-native/icons/house';
import Lock from 'lucide-react-native/icons/lock';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import Settings from 'lucide-react-native/icons/settings';
import User from 'lucide-react-native/icons/user';
import Users from 'lucide-react-native/icons/users';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../src/components/avatar/Avatar';
import { AvatarLab } from '../src/components/avatar/AvatarLab';
import { AVATAR_STYLES } from '../src/components/avatar/avatarSvg';
import { AvatarStack } from '../src/components/avatar/AvatarStack';
import { Chip } from '../src/components/ui/Chip';
import { FloatingBar } from '../src/components/ui/FloatingBar';
import { PillInput } from '../src/components/ui/PillInput';
import { PrimaryButton } from '../src/components/ui/PrimaryButton';
import { RingButton } from '../src/components/ui/RingButton';
import { SegmentedPill } from '../src/components/ui/SegmentedPill';
import { Sheet } from '../src/components/ui/Sheet';
import { Slab } from '../src/components/ui/Slab';
import { Wordmark } from '../src/components/ui/Wordmark';
import { space, type } from '../src/constants/theme';
import { useTheme } from '../src/hooks/useTheme';

const SERVER_OPTIONS = [
  { value: 'local', label: 'my laptop' },
  { value: 'class', label: 'class server' },
];
const DEMO_PEOPLE = ['aarav', 'diya', 'kabir', 'meera', 'rohan'];
const SUCCESS_RESET_MS = 1200;
const FAKE_LOADING_MS = 900;

export default function Playground() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [server, setServer] = useState('local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('idle');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [picked, setPicked] = useState(['design']);

  function runButton() {
    setStatus('loading');
    setTimeout(() => setStatus('success'), FAKE_LOADING_MS);
    setTimeout(() => setStatus('idle'), FAKE_LOADING_MS + SUCCESS_RESET_MS);
  }

  function togglePick(tag) {
    setPicked((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
  }

  const label = (text) => (
    <Text style={[type.caption, styles.label, { color: colors.textTertiary }]}>{text}</Text>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface }]}>
      <Slab variant="notch">
        <View style={styles.headerRow}>
          <RingButton
            icon={ArrowLeft}
            variant="slab"
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
          <Text style={[type.title, { color: colors.textOnSlab }]}>playground</Text>
          <RingButton icon={Settings} variant="slab" accessibilityLabel="Settings" badge={3} />
        </View>
      </Slab>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        keyboardShouldPersistTaps="handled"
      >
        {label('avatar lab (temporary)')}
        <AvatarLab />

        {label('wordmark')}
        <Wordmark size={40} />

        {label('avatars')}
        {AVATAR_STYLES.map((style) => (
          <View key={style.id} style={styles.row}>
            {DEMO_PEOPLE.map((name) => (
              <Avatar key={name} name={name} size={48} styleId={style.id} />
            ))}
          </View>
        ))}
        <AvatarStack names={DEMO_PEOPLE} />
        <Slab style={styles.frostedDemo}>
          <AvatarStack names={DEMO_PEOPLE} on="slab" />
        </Slab>

        {label('ring buttons')}
        <View style={styles.row}>
          <RingButton icon={MessageCircle} accessibilityLabel="Chats" badge={12} />
          <RingButton icon={Users} accessibilityLabel="People" />
          <RingButton icon={Heart} variant="accent" accessibilityLabel="Like" />
        </View>

        {label('segmented pill')}
        <SegmentedPill options={SERVER_OPTIONS} value={server} onChange={setServer} />

        {label('pill input')}
        <PillInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          icon={Lock}
          secure
          error={error}
        />
        <View style={styles.row}>
          <Chip label="shake it" onPress={() => setError(`Wrong password (${Date.now() % 100})`)} />
          <Chip label="clear error" onPress={() => setError('')} />
        </View>

        {label('primary buttons')}
        <PrimaryButton label="Continue" status={status} onPress={runButton} />
        <PrimaryButton label="Open sheet" variant="accent" onPress={() => setIsSheetOpen(true)} />

        {label('chips')}
        <View style={styles.row}>
          {['design', 'android', 'viva'].map((tag) => (
            <Chip
              key={tag}
              label={tag}
              selected={picked.includes(tag)}
              onPress={() => togglePick(tag)}
            />
          ))}
        </View>
        <Slab style={styles.frostedDemo}>
          <Chip label="frosted on slab" variant="frosted" />
        </Slab>
      </ScrollView>

      <FloatingBar>
        <RingButton icon={House} variant="accent" size={56} accessibilityLabel="Home" />
        <RingButton icon={MessageCircle} variant="slab" size={56} accessibilityLabel="Chats" />
        <RingButton icon={Users} variant="slab" size={56} accessibilityLabel="People" />
        <RingButton icon={User} variant="slab" size={56} accessibilityLabel="Profile" />
      </FloatingBar>

      <Sheet visible={isSheetOpen} onClose={() => setIsSheetOpen(false)}>
        <Text style={[type.heading, { color: colors.textOnSlab }]}>a bottom sheet</Text>
        <SegmentedPill options={SERVER_OPTIONS} value={server} onChange={setServer} on="slab" />
        <PrimaryButton label="Close" variant="accent" onPress={() => setIsSheetOpen(false)} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  content: { padding: space.md, gap: space.sm },
  label: { marginTop: space.md, textTransform: 'uppercase', letterSpacing: 1 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  frostedDemo: { paddingTop: space.md, alignItems: 'flex-start' },
});
