// Non-stock cards that appear in the deck: ads for free users, and the daily limit.
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space } from '../theme';
import { loadAdMob, type AdMobSdk } from '../monetization/ads';
import { ADS } from '../monetization/config';
import { Icon, type IconName } from './Icon';

/**
 * The ad card free users see every few swipes. Shows an AdMob ad when ads are
 * set up, otherwise (or if no ad loads) a house card for Premium. Ads sit
 * between stocks and never change which stocks the feed shows.
 */
export function AdCard({
  onRemoveAds,
  unitId = ADS.feedUnitId,
  sdk = loadAdMob(unitId),
}: {
  onRemoveAds: () => void;
  unitId?: string;
  sdk?: AdMobSdk | null;
}) {
  const [failed, setFailed] = useState(false);
  const showAd = sdk && unitId && !failed;
  return (
    <View style={[styles.card, { borderColor: colors.sponsored }]} testID="ad-card">
      <Text style={styles.tag}>SPONSORED</Text>
      {showAd ? (
        <sdk.BannerAd
          unitId={unitId}
          size={sdk.BannerAdSize.MEDIUM_RECTANGLE}
          requestOptions={{ requestNonPersonalizedAdsOnly: ADS.nonPersonalisedOnly }}
          onAdFailedToLoad={() => setFailed(true)}
        />
      ) : (
        <>
          <CardIcon name="sparkles" />
          <Text style={styles.title}>Swipe with no ads</Text>
          <Text style={styles.body}>Premium gives you unlimited swipes and no ads.</Text>
        </>
      )}
      <Pressable style={showAd ? styles.link : styles.button} onPress={onRemoveAds} testID="ad-remove-ads">
        <Text style={showAd ? styles.linkText : styles.buttonText}>{showAd ? 'Remove ads' : 'See Premium'}</Text>
      </Pressable>
      <Text style={styles.hint}>Swipe either way to continue</Text>
    </View>
  );
}

export function LimitCard({ dailySwipes, onUpgrade }: { dailySwipes: number; onUpgrade: () => void }) {
  return (
    <View style={styles.card}>
      <CardIcon name="hourglass" />
      <Text style={styles.title}>That’s your {dailySwipes} swipes for today</Text>
      <Text style={styles.body}>
        Come back tomorrow for a fresh batch, or go Premium for unlimited swipes. Your Needles and paper portfolio are
        still open.
      </Text>
      <Pressable style={styles.button} onPress={onUpgrade} testID="limit-upgrade">
        <Text style={styles.buttonText}>See Premium</Text>
      </Pressable>
    </View>
  );
}

export function EmptyCard({ onReset }: { onReset: () => void }) {
  return (
    <View style={styles.card}>
      <CardIcon name="noResults" />
      <Text style={styles.title}>No stocks match your filters</Text>
      <Text style={styles.body}>Try clearing a filter or adding another market.</Text>
      <Pressable style={styles.button} onPress={onReset}>
        <Text style={styles.buttonText}>Clear filters</Text>
      </Pressable>
    </View>
  );
}

/** The large icon at the top of a non-stock card. */
function CardIcon({ name }: { name: IconName }) {
  return (
    <View style={styles.icon}>
      <Icon name={name} size={44} color={colors.accent} />
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
  icon: { marginBottom: space(3) },
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
  link: { marginTop: space(4), padding: space(2) },
  linkText: { color: colors.textDim, fontWeight: '600', textDecorationLine: 'underline' },
});
