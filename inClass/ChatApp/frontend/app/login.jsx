/**
 * Login (buildPlan.md 5.1): wordmark, drifting faces, server picker,
 * username and password pills, and the log-in button that morphs into a
 * check mark. The route guard in _layout moves on once the session is saved.
 */
import ArrowRight from 'lucide-react-native/icons/arrow-right';
import Lock from 'lucide-react-native/icons/lock';
import UserIcon from 'lucide-react-native/icons/user';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FloatingFaces } from '../src/components/login/FloatingFaces';
import { ServerPicker } from '../src/components/login/ServerPicker';
import { PillInput } from '../src/components/ui/PillInput';
import { PrimaryButton } from '../src/components/ui/PrimaryButton';
import { Wordmark } from '../src/components/ui/Wordmark';
import { STAGGER_MS } from '../src/constants/motion';
import { space, type } from '../src/constants/theme';
import { useLogin } from '../src/hooks/useLogin';
import { useTheme } from '../src/hooks/useTheme';
import { Icon } from '../src/components/ui/Icon';

const SECTION_DELAY = STAGGER_MS * 3;

export default function Login() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const form = useLogin();
  const enter = (step) => FadeInDown.delay(step * SECTION_DELAY);

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.surface }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + space.xxxl, paddingBottom: insets.bottom + space.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={enter(0)} style={styles.brand}>
          <Wordmark size={40} />
          <Text style={[type.meta, { color: colors.textSecondary }]}>chat with your class.</Text>
        </Animated.View>

        <Animated.View entering={enter(1)}>
          <FloatingFaces />
        </Animated.View>

        <Animated.View entering={enter(2)}>
          <ServerPicker
            mode={form.serverMode}
            onModeChange={form.chooseServer}
            customUrl={form.customUrl}
            onCustomUrlChange={form.editCustomUrl}
            error={form.errors.server}
          />
        </Animated.View>

        <Animated.View entering={enter(3)} style={styles.fields}>
          <PillInput
            value={form.name}
            onChangeText={form.setName}
            placeholder="Username"
            icon={UserIcon}
            error={form.errors.name}
            inputProps={{ autoComplete: 'username', textContentType: 'username' }}
          />
          <PillInput
            value={form.password}
            onChangeText={form.setPassword}
            placeholder="Password"
            icon={Lock}
            secure
            error={form.errors.password}
            inputProps={{
              autoComplete: 'password',
              textContentType: 'password',
              returnKeyType: 'go',
              onSubmitEditing: form.submit,
            }}
          />
          <Text style={[type.caption, styles.hint, { color: colors.textTertiary }]}>
            new name? an account is created for you
          </Text>
        </Animated.View>

        <Animated.View entering={enter(4)} style={styles.action}>
          {form.errors.form ? (
            <Text style={[type.meta, styles.formError, { color: colors.danger }]}>
              {form.errors.form}
            </Text>
          ) : null}
          <PrimaryButton
            label="log in"
            status={form.status}
            variant={form.status === 'idle' ? 'ink' : 'accent'}
            onPress={form.submit}
          />
          <View style={styles.arrowHint} accessible={false}>
            <Icon as={ArrowRight} color={colors.textTertiary} size={14} />
            <Text style={[type.caption, { color: colors.textTertiary }]}>
              demo users: aarav, diya, kabir, meera, rohan
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: space.lg, gap: space.xl },
  brand: { alignItems: 'center', gap: space.xs },
  fields: { gap: space.sm },
  hint: { paddingHorizontal: space.lg },
  action: { gap: space.sm },
  formError: { textAlign: 'center' },
  arrowHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});
