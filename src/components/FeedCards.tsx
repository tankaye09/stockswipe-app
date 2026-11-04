// Non-stock cards that appear in the deck: ads for free users, and the daily limit.
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space } from '../theme';
import { FREE_DAILY_SWIPES } from '../state/rules';

export function AdCard() {
  return (
    <View style={[styles.card, { borderColor: colors.sponsored }]}>
      <Text style={styles.tag}>SPONSORED</Text>
      <Text style={styles.title}>Ad slot</Text>
      <Text style={styles.body}>
        Free users see an ad every 10 swipes. An ad network (for example Google AdMob) plugs in here. Ads never promote
        a specific stock.
      </Text>
      <Text style={styles.hint}>Swipe either way to continue</Text>
    </View>
  );
}

export function LimitCard({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.emoji}>⏸️</Text>
      <Text style={styles.title}>That’s your {FREE_DAILY_SWIPES} swipes for today</Text>
      <Text style={styles.body}>
        Come back tomorrow for a fresh batch, or go Premium for unlimited swipes. Your watchlist and paper portfolio are
        still open.
      </Text>
      <Pressable style={styles.button} onPress={onUpgrade}>
        <Text style={styles.buttonText}>See Premium</Text>
      </Pressable>
    </View>
  );
}

export function EmptyCard({ onReset }: { onReset: () => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.emoji}>🔍</Text>
      <Text style={styles.title}>No stocks match your filters</Text>
      <Text style={styles.body}>Try clearing a filter or adding another market.</Text>
      <Pressable style={styles.button} onPress={onReset}>
        <Text style={styles.buttonText}>Clear filters</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space(6),
    justifyContent: 'center',
    alignItems: 'center',
  },
  tag: { color: colors.sponsored, fontWeight: '800', fontSize: 12, letterSpacing: 1, marginBottom: space(3) },
  emoji: { fontSize: 44, marginBottom: space(3) },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: space(3) },
  body: { color: colors.textDim, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  hint: { color: colors.textFaint, fontSize: 13, marginTop: space(6) },
  button: {
    marginTop: space(6),
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: space(6),
    paddingVertical: space(3),
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
