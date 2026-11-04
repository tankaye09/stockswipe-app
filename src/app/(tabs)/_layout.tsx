import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import type { ColorValue } from 'react-native';
import { TabIcon } from '../../components/TabIcon';
import { TABS } from '../../navigation/tabs';
import { useAppState } from '../../state/store';
import { colors } from '../../theme';

/**
 * Android (and web) tab bar. iOS uses the native Liquid Glass bar in
 * `_layout.ios.tsx`. Each tab with a title nests its own Stack for the header.
 */
export default function TabsLayout() {
  const { state } = useAppState();

  if (!state.onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textFaint,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.label,
            tabBarButtonTestID: `tab-${tab.name}`,
            tabBarIcon: ({ color, focused }: { color: ColorValue; focused: boolean }) => (
              <TabIcon name={tab.icon} color={color} focused={focused} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
