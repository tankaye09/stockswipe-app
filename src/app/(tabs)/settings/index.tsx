import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { BROKERS } from '../../../broker/brokers';
import { Button, Chip, Row, SectionTitle } from '../../../components/ui';
import type { Market, Theme } from '../../../data/types';
import { ALL_THEMES, THEME_EMOJI, THEME_LABELS } from '../../../feed/themes';
import { FREE_DAILY_SWIPES, FREE_DAYS } from '../../../state/rules';
import { useAppState } from '../../../state/store';
import { colors, space } from '../../../theme';

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export default function SettingsScreen() {
  const { state, dispatch } = useAppState();
  const { pickBroker } = useLocalSearchParams<{ pickBroker?: string }>();

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={styles.content} testID="settings">
      <SectionTitle>Your broker</SectionTitle>
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
        Trade mode opens this broker’s app on the stock. You place any real trade there, not in Swipe.
      </Text>

      <SectionTitle>Markets</SectionTitle>
      <Row>
        {(['US', 'SGX'] as Market[]).map((m) => (
          <Chip
            key={m}
            testID={`settings-market-${m}`}
            label={m === 'US' ? '🇺🇸 US' : '🇸🇬 SGX'}
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
            label={`${THEME_EMOJI[t]} ${THEME_LABELS[t]}`}
            selected={state.interests.includes(t)}
            onPress={() => dispatch({ type: 'setInterests', interests: toggle(state.interests, t) })}
          />
        ))}
      </Row>

      <SectionTitle>Premium</SectionTitle>
      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Premium (test switch)</Text>
          <Text style={styles.note}>
            Free: unlimited for {FREE_DAYS} days, then {FREE_DAILY_SWIPES} swipes a day with ads. Premium: unlimited, no
            ads. Real in-app purchase comes later.
          </Text>
        </View>
        <Switch
          testID="premium-switch"
          value={state.premium}
          onValueChange={(v) => dispatch({ type: 'setPremium', premium: v })}
        />
      </View>

      <SectionTitle>About</SectionTitle>
      <Text style={styles.note}>
        Swipe shows information for learning and discovery. It is not financial advice and does not recommend buying or
        selling any stock. Prices shown are sample data.
      </Text>
      <Button
        testID="reset-all"
        label="Reset app"
        kind="secondary"
        onPress={() => dispatch({ type: 'resetAll' })}
        style={{ marginTop: space(6) }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space(5), paddingBottom: space(12) },
  hint: { color: colors.trade, marginBottom: space(2) },
  note: { color: colors.textFaint, fontSize: 13, lineHeight: 18, marginTop: space(2) },
  label: { color: colors.text, fontSize: 16, fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space(3) },
});
