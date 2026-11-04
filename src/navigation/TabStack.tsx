import { Stack } from 'expo-router';
import React from 'react';
import { colors } from '../theme';

/**
 * Native tabs have no header of their own, so each tab that needs a title
 * nests a one-screen Stack. Use it as the tab folder's `_layout.tsx`.
 */
export function createTabStack(title: string) {
  return function TabStack() {
    return (
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title }} />
      </Stack>
    );
  };
}
