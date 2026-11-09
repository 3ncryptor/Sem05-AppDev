/**
 * Root layout: loads the Inter fonts, keeps the splash screen up until they
 * are ready, matches the system background to the theme (no white flash in
 * dark mode) and renders the screen stack.
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
import { useTheme } from '../src/hooks/useTheme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { colors, isDark } = useTheme();
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  const isReady = fontsLoaded || Boolean(fontError);

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
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
