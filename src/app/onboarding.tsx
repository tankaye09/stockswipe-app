import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Chip, Row, SectionTitle } from '../components/ui';
import type { Market, Theme } from '../data/types';
import { ALL_THEMES, THEME_ICON, THEME_LABELS } from '../feed/themes';
import { useAppState } from '../state/store';
import { colors, space } from '../theme';

const MIN_INTERESTS = 3;

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export default function Onboarding() {
  const { dispatch } = useAppState();
  const [interests, setInterests] = useState<Theme[]>([]);
  const [markets, setMarkets] = useState<Market[]>(['US']);
  const ready = interests.length >= MIN_INTERESTS && markets.length > 0;

  const finish = () => {
    dispatch({ type: 'finishOnboarding', interests, markets });
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>What are you into?</Text>
        <Text style={styles.sub}>
          Pick at least {MIN_INTERESTS}. We’ll show you companies behind the things you already care about.
        </Text>

        <Row>
          {ALL_THEMES.map((t) => (
            <Chip
              key={t}
              testID={`interest-${t}`}
              label={THEME_LABELS[t]}
              icon={THEME_ICON[t]}
              selected={interests.includes(t)}
              onPress={() => setInterests((l) => toggle(l, t))}
            />
          ))}
        </Row>

        <SectionTitle>Markets</SectionTitle>
        <Row>
          <Chip
            testID="market-US"
            label="US stocks"
            selected={markets.includes('US')}
            onPress={() => setMarkets((l) => toggle(l, 'US'))}
          />
          <Chip
            testID="market-SGX"
            label="Singapore (SGX)"
            selected={markets.includes('SGX')}
            onPress={() => setMarkets((l) => toggle(l, 'SGX'))}
          />
        </Row>
      </ScrollView>
      <View style={styles.footer}>
        <Button
          testID="onboarding-continue"
          label={ready ? 'Start swiping' : `Pick ${Math.max(0, MIN_INTERESTS - interests.length)} more`}
          disabled={!ready}
          onPress={finish}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space(5) },
  title: { color: colors.text, fontSize: 30, fontWeight: '800', marginTop: space(6) },
  sub: { color: colors.textDim, fontSize: 16, lineHeight: 22, marginVertical: space(4) },
  footer: { padding: space(5) },
});
