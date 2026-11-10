/**
 * Tabs layout: chats, people and profile behind the floating pill tab bar.
 * The "+" in the bar is not a tab; it opens New group.
 */
import { Tabs } from 'expo-router';
import { FloatingTabBar } from '../../src/components/navigation/FloatingTabBar';
import { useTheme } from '../../src/hooks/useTheme';

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.surface } }}
    >
      <Tabs.Screen name="chats" />
      <Tabs.Screen name="people" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
