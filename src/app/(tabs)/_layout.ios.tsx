import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import React from 'react';
import { TABS } from '../../navigation/tabs';
import { useAppState } from '../../state/store';
import { colors } from '../../theme';

/**
 * iOS uses the system tab bar: Liquid Glass with SF Symbols on iOS 26+.
 * Other platforms use the JavaScript tab bar in `_layout.tsx`.
 */
export default function TabsLayout() {
  const { state } = useAppState();

  if (!state.onboarded) return <Redirect href="/onboarding" />;

  return (
    <NativeTabs
      tintColor={colors.accent}
      iconColor={{ default: colors.textFaint, selected: colors.accent }}
      labelStyle={{ default: { color: colors.textFaint }, selected: { color: colors.accent } }}
    >
      {TABS.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name} testID={`tab-${tab.name}`}>
          <NativeTabs.Trigger.Icon sf={tab.sf} />
          <NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
