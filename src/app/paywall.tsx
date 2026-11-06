import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from '../components/Icon';
import { Button } from '../components/ui';
import type { PlanId } from '../monetization/config';
import { purchases, type Plan } from '../monetization/purchases';
import { effectiveLimits } from '../state/rules';
import { useAppState } from '../state/store';
import { colors, radius, space } from '../theme';

export default function PaywallScreen() {
  const { state, dispatch } = useAppState();
  const limits = effectiveLimits(state);
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [chosen, setChosen] = useState<PlanId | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const store = purchases();

  useEffect(() => {
    let live = true;
    store
      .getPlans()
      .catch(() => [])
      .then((list) => {
        if (!live) return;
        setPlans(list);
        setChosen(list[list.length - 1]?.id ?? null);
      });
    return () => {
      live = false;
    };
  }, [store]);

  const done = () => {
    dispatch({ type: 'setPremium', premium: true });
    router.back();
  };

  const subscribe = async () => {
    if (!chosen) return;
    setBusy(true);
    setError(null);
    const outcome = await store.purchase(chosen);
    setBusy(false);
    if (outcome.status === 'purchased') done();
    if (outcome.status === 'failed') setError(outcome.error);
  };

  const restore = async () => {
    setBusy(true);
    setError(null);
    const premium = await store.restore().catch(() => false);
    setBusy(false);
    if (premium) done();
    else setError('No Premium subscription found for this account.');
  };

  if (state.premium) {
    return (
      <View style={[styles.screen, styles.center]} testID="paywall">
        <Icon name="sparkles" size={44} color={colors.accent} />
        <Text style={styles.title}>You’re on Premium</Text>
        <Button testID="paywall-close" label="Back to swiping" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="paywall">
      <Text style={styles.title}>Haystack Premium</Text>
      <View style={styles.perks}>
        <Perk icon="infinity" text={`Unlimited swipes (free is ${limits.dailySwipes} a day)`} />
        <Perk icon="ban" text="No ads in your feed" />
      </View>

      {plans == null ? (
        <ActivityIndicator color={colors.accent} />
      ) : plans.length === 0 ? (
        <Text style={styles.error} testID="paywall-no-plans">
          Premium isn’t available right now. Please try again later.
        </Text>
      ) : (
        plans.map((p) => (
          <Pressable
            key={p.id}
            testID={`plan-${p.id}`}
            accessibilityRole="radio"
            accessibilityState={{ selected: chosen === p.id }}
            onPress={() => setChosen(p.id)}
            style={[styles.plan, chosen === p.id && styles.planOn]}
          >
            <Text style={styles.planTitle}>{p.title}</Text>
            <Text style={styles.planPrice}>
              {p.price} / {p.period}
            </Text>
          </Pressable>
        ))
      )}

      {error && (
        <Text style={styles.error} testID="paywall-error">
          {error}
        </Text>
      )}

      <Button
        testID="paywall-subscribe"
        label={busy ? 'Please wait…' : 'Subscribe'}
        disabled={busy || !chosen}
        onPress={subscribe}
        style={{ marginTop: space(4) }}
      />
      <Pressable testID="paywall-restore" disabled={busy} onPress={restore} style={styles.restore}>
        <Text style={styles.restoreText}>Restore purchases</Text>
      </Pressable>

      {store.isTest && (
        <Text style={styles.test} testID="paywall-test-mode">
          Test mode: no store is connected, so subscribing is free and only unlocks Premium on this device.
        </Text>
      )}
      <Text style={styles.fine}>
        Renews automatically until you cancel. Cancel any time in your App Store or Google Play subscriptions. Haystack
        is for information and education only and is not financial advice.
      </Text>
    </ScrollView>
  );
}

function Perk({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.perkRow}>
      <Icon name={icon} size={20} color={colors.accent} />
      <Text style={styles.perk}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center', padding: space(6), gap: space(4) },
  content: { padding: space(6), paddingBottom: space(12) },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', marginBottom: space(4) },
  perks: { gap: space(2), marginBottom: space(6) },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: space(3) },
  perk: { color: colors.textDim, fontSize: 16, flexShrink: 1 },
  plan: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space(4),
    marginBottom: space(3),
    backgroundColor: colors.card,
  },
  planOn: { borderColor: colors.accent },
  planTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  planPrice: { color: colors.textDim, fontSize: 15, marginTop: space(1) },
  error: { color: colors.down, marginTop: space(2) },
  restore: { alignItems: 'center', padding: space(3) },
  restoreText: { color: colors.accent, fontWeight: '600' },
  test: { color: colors.trade, fontSize: 13, marginTop: space(2), textAlign: 'center' },
  fine: { color: colors.textFaint, fontSize: 12, lineHeight: 17, marginTop: space(4) },
});
