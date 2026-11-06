import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { BROKERS, openBrokerSignUp } from '../../broker/brokers';
import { Icon } from '../../components/Icon';
import { Button, Chip, Row, SectionTitle } from '../../components/ui';
import { DATA_NOTE } from '../../data';
import type { Market, Theme } from '../../data/types';
import { ALL_THEMES, THEME_ICON, THEME_LABELS } from '../../feed/themes';
import { ADMIN_TOOLS } from '../../monetization/config';
import { purchases } from '../../monetization/purchases';
import { effectiveLimits, freeDaysLeft } from '../../state/rules';
import { useAppState } from '../../state/store';
import { colors, space } from '../../theme';

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export default function SettingsScreen() {
  const { state, dispatch } = useAppState();
  const { pickBroker } = useLocalSearchParams<{ pickBroker?: string }>();
  const [restoreNote, setRestoreNote] = useState<string | null>(null);
  const scroll = useRef<ScrollViewInstance>(null);
  const brokerY = useRef(0);
  const limits = effectiveLimits(state);
  const daysLeft = freeDaysLeft(state);

  // Settings is a tab, so it keeps its scroll position. When Trade mode sends the user
  // here to pick a broker, jump to the broker picker. Each request has a new pickBroker
  // value, so this runs every time, not just the first.
  useEffect(() => {
    if (pickBroker) scroll.current?.scrollTo({ y: brokerY.current, animated: false });
  }, [pickBroker]);

  const restore = async () => {
    setRestoreNote('Checking…');
    try {
      const premium = await purchases().restore();
      if (premium) dispatch({ type: 'setPremium', premium });
      setRestoreNote(premium ? 'Premium restored.' : 'No Premium subscription found for this account.');
    } catch {
      setRestoreNote('Could not reach the store. Try again later.');
    }
  };

  return (
    <ScrollView
      ref={scroll}
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.content}
      testID="settings"
    >
      <View testID="broker-section" onLayout={(e) => (brokerY.current = e.nativeEvent.layout.y)}>
        <SectionTitle>Your broker</SectionTitle>
      </View>
      {pickBroker && !state.broker && (
        <Text style={styles.hint} testID="pick-broker-hint">
          Pick your broker so Trade mode knows where to send you.
        </Text>
      )}
      <Row>
        {BROKERS.map((b) => (
          <Chip
            key={b.id}
            testID={`broker-${b.id}`}
            label={b.name}
            selected={state.broker === b.id}
            onPress={() => dispatch({ type: 'setBroker', broker: state.broker === b.id ? null : b.id })}
          />
        ))}
      </Row>
      <Text style={styles.note}>
        Trade mode opens this broker’s app on the stock. You place any real trade there, not in Haystack.
      </Text>
      {!state.broker && (
        <>
          <Text style={[styles.label, { marginTop: space(4) }]}>No broker yet? Open an account</Text>
          <Row style={{ marginTop: space(2) }}>
            {BROKERS.map((b) => (
              <Chip
                key={b.id}
                testID={`signup-${b.id}`}
                label={b.name}
                icon="external"
                selected={false}
                onPress={() => openBrokerSignUp(b.id)}
              />
            ))}
          </Row>
          <Text style={styles.note}>
            Haystack may earn a referral fee if you open an account through these links. It does not change which stocks
            you see.
          </Text>
        </>
      )}

      <SectionTitle>Markets</SectionTitle>
      <Row>
        {(['US', 'SGX'] as Market[]).map((m) => (
          <Chip
            key={m}
            testID={`settings-market-${m}`}
            label={m}
            selected={state.markets.includes(m)}
            onPress={() => dispatch({ type: 'setMarkets', markets: toggle(state.markets, m) })}
          />
        ))}
      </Row>

      <SectionTitle>Interests</SectionTitle>
      <Row>
        {ALL_THEMES.map((t: Theme) => (
          <Chip
            key={t}
            label={THEME_LABELS[t]}
            icon={THEME_ICON[t]}
            selected={state.interests.includes(t)}
            onPress={() => dispatch({ type: 'setInterests', interests: toggle(state.interests, t) })}
          />
        ))}
      </Row>

      <SectionTitle>Premium</SectionTitle>
      {state.premium ? (
        <View style={styles.premiumOn}>
          <Icon name="sparkles" size={16} color={colors.accent} />
          <Text style={styles.label} testID="premium-active">
            Premium is on: unlimited swipes, no ads.
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.label} testID="plan-status">
            {daysLeft > 0
              ? `Free: unlimited swipes for ${daysLeft} more day${daysLeft === 1 ? '' : 's'}`
              : `Free: ${limits.dailySwipes} swipes a day, with ads`}
          </Text>
          <Button
            testID="see-premium"
            label="See Premium"
            onPress={() => router.push('/paywall')}
            style={{ marginTop: space(3) }}
          />
        </>
      )}
      <Pressable testID="restore-purchases" onPress={restore} style={{ paddingVertical: space(3) }}>
        <Text style={styles.link}>Restore purchases</Text>
      </Pressable>
      {restoreNote && (
        <Text style={styles.note} testID="restore-note">
          {restoreNote}
        </Text>
      )}

      <SectionTitle>About</SectionTitle>
      <Text style={styles.note}>
        Haystack shows information for learning and discovery. It is not financial advice and does not recommend buying
        or selling any stock. {DATA_NOTE}
      </Text>
      <Button
        testID="reset-all"
        label="Reset app"
        kind="secondary"
        onPress={() => dispatch({ type: 'resetAll' })}
        style={{ marginTop: space(6) }}
      />
      {ADMIN_TOOLS && (
        <Button
          testID="open-admin"
          label="Admin: limits and test tools"
          kind="secondary"
          onPress={() => router.push('/admin')}
          style={{ marginTop: space(3) }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space(5), paddingBottom: space(12) },
  hint: { color: colors.trade, marginBottom: space(2) },
  note: { color: colors.textFaint, fontSize: 13, lineHeight: 18, marginTop: space(2) },
  label: { color: colors.text, fontSize: 16, fontWeight: '600' },
  premiumOn: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  link: { color: colors.accent, fontWeight: '600' },
});
