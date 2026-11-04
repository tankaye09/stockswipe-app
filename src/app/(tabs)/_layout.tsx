import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import type { ColorValue } from 'react-native';
import { TabIcon, type TabIconName } from '../../components/TabIcon';
import { useAppState } from '../../state/store';
import { colors } from '../../theme';

/** Tab options shared by every tab: its icon and a testID for e2e flows. */
const tab = (title: string, iconName: TabIconName) => ({
  title,
  tabBarButtonTestID: `tab-${iconName}`,
  tabBarIcon: ({ color, focused }: { color: ColorValue; focused: boolean }) => (
    <TabIcon name={iconName} color={color} focused={focused} />
  ),
});

export default function TabsLayout() {
  const { state } = useAppState();

  if (!state.onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textFaint,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ ...tab('Discover', 'discover'), headerShown: false }} />
      <Tabs.Screen name="watchlist" options={tab('Watchlist', 'watchlist')} />
      <Tabs.Screen name="portfolio" options={tab('Paper', 'paper')} />
      <Tabs.Screen name="settings" options={tab('Settings', 'settings')} />
    </Tabs>
  );
}
