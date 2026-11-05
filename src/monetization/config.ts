// Every revenue setting in one place. Values come from EXPO_PUBLIC_* variables
// (set in .env or the EAS build profile) so prices, limits, IDs and referral
// links can change without touching code. Defaults are safe test values.
//
// Expo only inlines env vars written out in full as process.env.EXPO_PUBLIC_X,
// so each one is read by name below.
import { Platform } from 'react-native';
import type { BrokerId } from '../broker/brokers';

/** Reads a whole number of at least zero, or falls back when unset or invalid. */
export function envCount(raw: string | undefined, fallback: number): number {
  if (raw == null || raw.trim() === '') return fallback;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
}

/** Turns on the hidden admin page. Set in development, internal test and e2e builds only, never in store builds. */
export const ADMIN_TOOLS = __DEV__ || process.env.EXPO_PUBLIC_ADMIN_TOOLS === '1';

const text = (raw: string | undefined) => (raw && raw.trim() ? raw.trim() : undefined);

export interface Limits {
  freeDays: number;
  dailySwipes: number;
  adEvery: number;
}

/**
 * Free tier limits built into the app. At runtime they can be replaced for
 * everyone from the RevenueCat dashboard (see `parseRemoteLimits`), and on one
 * device from the admin page.
 */
export const DEFAULT_LIMITS: Limits = {
  /** Days of unlimited swipes after first launch. */
  freeDays: envCount(process.env.EXPO_PUBLIC_FREE_DAYS, 7),
  /** Swipes a day once the free days are over. */
  dailySwipes: envCount(process.env.EXPO_PUBLIC_FREE_DAILY_SWIPES, 50),
  /** An ad card appears after every this many stock swipes (free users only). 0 turns ads off. */
  adEvery: envCount(process.env.EXPO_PUBLIC_AD_EVERY_N_SWIPES, 10),
};

export type PlanId = 'monthly' | 'annual';

export interface PlanConfig {
  id: PlanId;
  title: string;
  /**
   * Price shown when the store can't tell us (test builds). Real builds show
   * the store's own localised price, which is set in App Store Connect and
   * Google Play Console.
   */
  fallbackPrice: string;
  period: string;
}

/** Premium plans. Prices are not decided yet: set them in the stores and in these env vars. */
export const PLANS: PlanConfig[] = [
  {
    id: 'monthly',
    title: 'Monthly',
    fallbackPrice: text(process.env.EXPO_PUBLIC_PREMIUM_MONTHLY_PRICE) ?? 'S$5.98',
    period: 'month',
  },
  {
    id: 'annual',
    title: 'Yearly',
    fallbackPrice: text(process.env.EXPO_PUBLIC_PREMIUM_ANNUAL_PRICE) ?? 'S$48.98',
    period: 'year',
  },
];

export const PREMIUM = {
  /** RevenueCat entitlement that unlocks Premium. */
  entitlement: text(process.env.EXPO_PUBLIC_PREMIUM_ENTITLEMENT) ?? 'premium',
  /**
   * RevenueCat public SDK key. Each store has its own key, so this is the one
   * place the platform matters. Without a key the app uses test purchases.
   */
  revenueCatKey: Platform.select({
    ios: text(process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY),
    android: text(process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY),
  }),
};

export const ADS = {
  /**
   * Ads are non-personalised only (Kaye's call, 4 Nov 2026): no tracking, so no
   * iOS tracking prompt and lighter PDPA consent. Turning this off would need an
   * App Tracking Transparency prompt and a consent review first.
   */
  nonPersonalisedOnly: true,
  /**
   * AdMob ad unit for the in-feed card (a 300x250 banner). Each store app has
   * its own unit. Unset means a house card promoting Premium is shown instead.
   */
  feedUnitId: Platform.select({
    ios: text(process.env.EXPO_PUBLIC_ADMOB_FEED_UNIT_IOS),
    android: text(process.env.EXPO_PUBLIC_ADMOB_FEED_UNIT_ANDROID),
  }),
};

/**
 * Broker referral links (from each broker's partner programme). Unset means
 * the broker's normal sign-up page, with no referral.
 */
export const REFERRAL_URLS: Partial<Record<BrokerId, string>> = {
  moomoo: text(process.env.EXPO_PUBLIC_REFERRAL_MOOMOO),
  tiger: text(process.env.EXPO_PUBLIC_REFERRAL_TIGER),
  ibkr: text(process.env.EXPO_PUBLIC_REFERRAL_IBKR),
};
