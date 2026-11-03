import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { COLORS } from '../src/constants/theme';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { ChatProvider } from '../src/context/ChatContext';

function RootNavigationGuard() {
  const { isHydrated, currentUser } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;

    const onLoginScreen = segments[0] === 'login';
    if (!currentUser && !onLoginScreen) {
      router.replace('/login');
    } else if (currentUser && onLoginScreen) {
      router.replace('/(tabs)');
    }
  }, [currentUser, isHydrated, router, segments]);

  if (!isHydrated) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.bgPrimary },
        headerShadowVisible: false,
        headerTintColor: COLORS.textPrimary,
        headerTitleStyle: { fontWeight: '600', fontSize: 16 },
        contentStyle: { backgroundColor: COLORS.bgPrimary },
        animation: 'fade_from_bottom',
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
      <Stack.Screen
        name="modal/new-group"
        options={{
          presentation: 'modal',
          title: 'New Group',
        }}
      />
      <Stack.Screen
        name="modal/chat-info"
        options={{
          presentation: 'modal',
          title: 'Details',
        }}
      />
      <Stack.Screen
        name="modal/user-profile"
        options={{
          presentation: 'modal',
          title: 'Profile',
        }}
      />
      <Stack.Screen
        name="modal/image-viewer"
        options={{
          presentation: 'modal',
          title: 'Photo',
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ChatProvider>
          <StatusBar style="dark" />
          <RootNavigationGuard />
        </ChatProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
