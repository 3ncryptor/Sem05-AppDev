/**
 * Root layout: loads the Inter fonts and the saved session, keeps the splash
 * screen up until both are ready, matches the system background to the theme
 * (no white flash in dark mode) and guards the routes:
 * signed out -> only login; signed in -> the app. The playground is open to both.
 * The Inspector layer (orb, shake, sheet) sits above every screen.
 */
// One import per weight: the package index bundles all 18 Inter files (Metro does not tree-shake).
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { InspectorLayer } from '../src/components/inspector/InspectorLayer';
import { NotchIsland } from '../src/components/island/NotchIsland';
import { useStore } from '../src/hooks/useStore';
import { useTheme } from '../src/hooks/useTheme';
import { restoreSession, sessionStore } from '../src/store/sessionStore';
import { restoreSettings } from '../src/store/settingsStore';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useInboxChecker } from '../src/hooks/useInboxChecker';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { colors, isDark } = useTheme();
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  const status = useStore(sessionStore, (state) => state.status);
  useInboxChecker();
  const isSignedIn = status === 'signedIn';
  const isReady = (fontsLoaded || Boolean(fontError)) && status !== 'restoring';

  useEffect(() => {
    restoreSettings();
    restoreSession();
  }, []);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.surface);
  }, [colors.surface]);

  useEffect(() => {
    if (isReady) SplashScreen.hideAsync();
  }, [isReady]);

  if (!isReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.surface }}>
      <SafeAreaProvider>
        {/* every animation follows the phone's "reduce motion" setting */}
        <ReducedMotionConfig mode={ReduceMotion.System} />
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <KeyboardProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.surface },
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Protected guard={!isSignedIn}>
              <Stack.Screen name="login" options={{ animation: 'fade' }} />
            </Stack.Protected>
            <Stack.Protected guard={isSignedIn}>
              <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
              <Stack.Screen name="chat/[id]" />
              <Stack.Screen name="new-group" options={{ presentation: 'modal' }} />
              <Stack.Screen
                name="image/[id]"
                options={{ presentation: 'transparentModal', animation: 'fade' }}
              />
            </Stack.Protected>
            <Stack.Screen name="playground" />
          </Stack>
          <NotchIsland />
          <InspectorLayer />
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
