// Admin page: try different free tier limits on this device, and jump to
// states that are slow to reach by hand. Only in development, internal test
// and e2e builds (see ADMIN_TOOLS). To change limits for every user, edit the
// offering metadata in the RevenueCat dashboard instead (see README).
import { Redirect, router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, SectionTitle } from '../components/ui';
import { ADMIN_TOOLS, DEFAULT_LIMITS, type Limits } from '../monetization/config';
import { cleanLimits, effectiveLimits, freeDaysLeft, swipesRemaining, trialEndedFirstOpen } from '../state/rules';
import { useAppState } from '../state/store';
import { colors, radius, space } from '../theme';

const FIELDS: { key: keyof Limits; label: string; testID: string }[] = [
  { key: 'freeDays', label: 'Free trial days (unlimited swipes)', testID: 'admin-free-days' },
  { key: 'dailySwipes', label: 'Swipes a day after the trial', testID: 'admin-daily-swipes' },
  { key: 'adEvery', label: 'Ad after every N swipes (0 = no ads)', testID: 'admin-ad-every' },
];

const describe = (l: Partial<Limits> | null) =>
  l && Object.keys(l).length
    ? FIELDS.filter((f) => l[f.key] != null)
        .map((f) => `${f.key} ${l[f.key]}`)
        .join(', ')
    : 'none';

export default function AdminScreen({ enabled = ADMIN_TOOLS }: { enabled?: boolean }) {
  const { state, dispatch } = useAppState();
  const current = effectiveLimits(state);
  const [draft, setDraft] = useState<Record<keyof Limits, string>>({
    freeDays: String(current.freeDays),
    dailySwipes: String(current.dailySwipes),
    adEvery: String(current.adEvery),
  });
  const [note, setNote] = useState<string | null>(null);

  if (!enabled) return <Redirect href="/settings" />;

  const save = () => {
    const override = cleanLimits(draft);
    if (Object.keys(override).length !== FIELDS.length) {
      setNote('Each value must be a whole number from 0 to 10,000.');
      return;
    }
    dispatch({ type: 'setLimitOverride', limits: override });
    setNote('Saved for this device.');
  };

  const clear = () => {
    dispatch({ type: 'setLimitOverride', limits: null });
    const base = effectiveLimits({ ...state, limitOverride: null });
    setDraft({ freeDays: String(base.freeDays), dailySwipes: String(base.dailySwipes), adEvery: String(base.adEvery) });
    setNote('Cleared. Using the dashboard or built-in limits.');
  };

  const remaining = swipesRemaining(state);

  return (
    // "handled" lets a tap on another field or button work while the keyboard is
    // up, instead of only closing the keyboard.
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      testID="admin"
    >
      <Text style={styles.note}>
        Changes here apply to this device only. To change limits for everyone, edit the offering metadata in the
        RevenueCat dashboard.
      </Text>

      <SectionTitle>Limits in force</SectionTitle>
      <Text style={styles.value} testID="admin-current">
        {current.freeDays} trial days · {current.dailySwipes} swipes a day · ad every {current.adEvery}
      </Text>
      <Text style={styles.note}>
        Built in: {describe(DEFAULT_LIMITS)}. Dashboard: {describe(state.remoteLimits)}. This device:{' '}
        {describe(state.limitOverride)}.
      </Text>
      <Text style={styles.note} testID="admin-usage">
        {state.premium
          ? 'Premium is on, so there are no limits.'
          : freeDaysLeft(state) > 0
            ? `${freeDaysLeft(state)} trial days left.`
            : `${remaining} swipes left today.`}
      </Text>

      <SectionTitle>Override on this device</SectionTitle>
      {FIELDS.map((f) => (
        <View key={f.key} style={styles.field}>
          <Text style={styles.label}>{f.label}</Text>
          <TextInput
            testID={f.testID}
            value={draft[f.key]}
            onChangeText={(v) => setDraft({ ...draft, [f.key]: v })}
            keyboardType="number-pad"
            selectTextOnFocus
            style={styles.input}
          />
        </View>
      ))}
      <Button testID="admin-save" label="Save override" onPress={save} />
      <Button
        testID="admin-clear"
        label="Clear override"
        kind="secondary"
        onPress={clear}
        style={{ marginTop: space(3) }}
      />
      {note && (
        <Text style={styles.value} testID="admin-note">
          {note}
        </Text>
      )}

      <SectionTitle>Test tools</SectionTitle>
      <Button
        testID="admin-end-trial"
        label="End the free trial now"
        kind="secondary"
        onPress={() => dispatch({ type: 'setUsage', firstOpen: trialEndedFirstOpen(current.freeDays) })}
      />
      <Button
        testID="admin-reset-today"
        label="Reset today’s swipe count"
        kind="secondary"
        onPress={() => dispatch({ type: 'setUsage', swipesToday: 0 })}
        style={{ marginTop: space(3) }}
      />
      <Button
        testID="admin-premium-off"
        label="Turn Premium off on this device"
        kind="secondary"
        onPress={() => dispatch({ type: 'setPremium', premium: false })}
        style={{ marginTop: space(3) }}
      />
      <Button testID="admin-done" label="Done" onPress={() => router.back()} style={{ marginTop: space(6) }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space(5), paddingBottom: space(12) },
  note: { color: colors.textFaint, fontSize: 13, lineHeight: 18, marginTop: space(2) },
  value: { color: colors.text, fontSize: 15, marginTop: space(2) },
  field: { marginBottom: space(3) },
  label: { color: colors.textDim, marginBottom: space(1) },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    color: colors.text,
    paddingHorizontal: space(3),
    paddingVertical: space(2.5),
    fontSize: 16,
  },
});
