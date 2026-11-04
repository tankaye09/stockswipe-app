import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Row, SectionTitle } from '../components/ui';
import type { CapBucket } from '../data/types';
import { NO_FILTERS, type FeedFilters } from '../feed/feedEngine';
import { ALL_SECTORS, ALL_THEMES, CAP_LABELS, THEME_LABELS } from '../feed/themes';
import { useAppState } from '../state/store';
import { colors, space } from '../theme';

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
const CAPS = Object.keys(CAP_LABELS) as CapBucket[];
const EARNINGS_WINDOW_DAYS = 14;

export default function FiltersScreen() {
  const { state, dispatch } = useAppState();
  const [f, setF] = useState<FeedFilters>(state.filters);

  const apply = () => {
    dispatch({ type: 'setFilters', filters: f });
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.content} testID="filters">
        <SectionTitle>Sector</SectionTitle>
        <Row>
          {ALL_SECTORS.map((s) => (
            <Chip
              key={s}
              testID={`filter-sector-${s}`}
              label={s}
              selected={f.sectors.includes(s)}
              onPress={() => setF({ ...f, sectors: toggle(f.sectors, s) })}
            />
          ))}
        </Row>
        <SectionTitle>Company size</SectionTitle>
        <Row>
          {CAPS.map((c) => (
            <Chip
              key={c}
              testID={`filter-cap-${c}`}
              label={CAP_LABELS[c]}
              selected={f.caps.includes(c)}
              onPress={() => setF({ ...f, caps: toggle(f.caps, c) })}
            />
          ))}
        </Row>
        <SectionTitle>Theme</SectionTitle>
        <Row>
          {ALL_THEMES.map((t) => (
            <Chip
              key={t}
              testID={`filter-theme-${t}`}
              label={THEME_LABELS[t]}
              selected={f.themes.includes(t)}
              onPress={() => setF({ ...f, themes: toggle(f.themes, t) })}
            />
          ))}
        </Row>
        <SectionTitle>Earnings</SectionTitle>
        <Row>
          <Chip
            testID="filter-earnings"
            label={`Reporting in the next ${EARNINGS_WINDOW_DAYS} days`}
            selected={f.earningsWithinDays != null}
            onPress={() =>
              setF({ ...f, earningsWithinDays: f.earningsWithinDays == null ? EARNINGS_WINDOW_DAYS : null })
            }
          />
        </Row>
      </ScrollView>
      <View style={styles.footer}>
        <Button
          testID="filters-clear"
          label="Clear"
          kind="secondary"
          onPress={() => setF(NO_FILTERS)}
          style={{ flex: 1 }}
        />
        <Button testID="filters-apply" label="Show stocks" onPress={apply} style={{ flex: 2 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space(5) },
  footer: { flexDirection: 'row', gap: space(3), padding: space(5) },
});
