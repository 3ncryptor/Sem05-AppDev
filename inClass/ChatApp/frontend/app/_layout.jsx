/**
 * Root layout: loads the Inter fonts and the saved session, keeps the splash
 * screen up until both are ready, matches the system background to the theme
 * (no white flash in dark mode) and guards the routes:
 * signed out -> only login; signed in -> the app. The playground is open to both.
 */
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useStore } from '../src/hooks/useStore';
import { useTheme } from '../src/hooks/useTheme';
import { restoreSession, sessionStore } from '../src/store/sessionStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { colors, isDark } = useTheme();
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  const status = useStore(sessionStore, (state) => state.status);
  const isSignedIn = status === 'signedIn';
  const isReady = (fontsLoaded || Boolean(fontError)) && status !== 'restoring';

  useEffect(() => {
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
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}
        >
          <Stack.Screen name="index" />
          <Stack.Protected guard={!isSignedIn}>
            <Stack.Screen name="login" options={{ animation: 'fade' }} />
          </Stack.Protected>
          <Stack.Protected guard={isSignedIn}>
            <Stack.Screen name="home" options={{ animation: 'fade' }} />
          </Stack.Protected>
          <Stack.Screen name="playground" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
