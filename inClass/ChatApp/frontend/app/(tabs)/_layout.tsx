import React, { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SHADOWS } from '../../src/constants/theme';
import { useAuth } from '../../src/context/AuthContext';
import { useChat } from '../../src/context/ChatContext';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuth();
  const { conversations, lastMessageByConvId } = useChat();

  const unreadCount = useMemo(() => {
    if (!currentUser?.id) return 0;
    return conversations.filter((conv) => {
      const last = lastMessageByConvId[conv.id];
      return (
        last &&
        last.senderId !== currentUser.id &&
        last.status?.[currentUser.id]?.read === false
      );
    }).length;
  }, [conversations, currentUser?.id, lastMessageByConvId]);

  // Ensure generous clearance above Android 3-button navigation bar (Back / Home / Recents)
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.bgSecondary,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: COLORS.border,
          height: 62 + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 8,
          ...SHADOWS.card,
        },
        tabBarActiveTintColor: COLORS.textPrimary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: {
          fontSize: 11.5,
          fontWeight: '600',
          letterSpacing: 0.1,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Messages',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: COLORS.accent,
            color: COLORS.textInverse,
            fontSize: 10,
            fontWeight: '700',
          },
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconPill, focused && styles.iconPillActive]}>
              <Ionicons
                name={focused ? 'chatbubble' : 'chatbubble-outline'}
                size={20}
                color={String(color)}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Directory',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconPill, focused && styles.iconPillActive]}>
              <Ionicons
                name={focused ? 'people' : 'people-outline'}
                size={21}
                color={String(color)}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconPill, focused && styles.iconPillActive]}>
              <Ionicons
                name={focused ? 'options' : 'options-outline'}
                size={20}
                color={String(color)}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconPill: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillActive: {
    backgroundColor: COLORS.bgTertiary,
  },
});
