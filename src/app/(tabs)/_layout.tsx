import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import React from 'react';
import { TABS } from '../../navigation/tabs';
import { useAppState } from '../../state/store';
import { colors } from '../../theme';

/**
 * The system tab bar: Liquid Glass with SF Symbols on iOS 26+, and a
 * Material bottom bar on Android.
 */
export default function TabsLayout() {
  const { state } = useAppState();

  if (!state.onboarded) return <Redirect href="/onboarding" />;

  return (
    <NativeTabs
      tintColor={colors.accent}
      iconColor={{ default: colors.textFaint, selected: colors.accent }}
      labelStyle={{ default: { color: colors.textFaint }, selected: { color: colors.accent } }}
      backgroundColor={colors.bg}
    >
      {TABS.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name} testID={`tab-${tab.name}`}>
          <NativeTabs.Trigger.Icon sf={tab.sf} md={tab.md} />
          <NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
