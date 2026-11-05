import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MonetizationSync } from '../monetization/MonetizationSync';
import { AppStateProvider } from '../state/store';
import { colors } from '../theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <MonetizationSync />
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="stock/[id]" options={{ title: '' }} />
          <Stack.Screen name="filters" options={{ presentation: 'modal', title: 'Filters' }} />
          <Stack.Screen name="paywall" options={{ presentation: 'modal', title: 'Premium' }} />
          <Stack.Screen name="admin" options={{ title: 'Admin' }} />
        </Stack>
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
