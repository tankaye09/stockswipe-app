// In-feed ads through Google AdMob, which uses one API on iOS and Android.
// Without an ad unit ID (or in Expo Go) the feed shows a house card instead.
import type React from 'react';
import { ADS } from './config';
import { isExpoGo } from './purchases';

/** Only the parts of the AdMob SDK we use. */
export interface AdMobSdk {
  mobileAds(): { initialize(): Promise<unknown> };
  AdsConsent: { gatherConsent(): Promise<{ canRequestAds: boolean }> };
  BannerAd: React.ComponentType<{
    unitId: string;
    size: string;
    requestOptions?: { requestNonPersonalizedAdsOnly?: boolean };
    onAdFailedToLoad?: (e: Error) => void;
  }>;
  BannerAdSize: { MEDIUM_RECTANGLE: string };
}

/** The AdMob SDK, or null when ads are off for this build. */
export function loadAdMob(unitId = ADS.feedUnitId, expoGo = isExpoGo()): AdMobSdk | null {
  if (!unitId || expoGo) return null;
  // Loaded lazily so Expo Go and tests never touch the native module.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sdk = require('react-native-google-mobile-ads');
  return { ...sdk, mobileAds: sdk.default } as AdMobSdk;
}

let ready: Promise<boolean> | null = null;

/**
 * Asks for consent where the law needs it (Google's consent form handles
 * the EU, UK and similar), then starts the SDK. Safe to call more than once.
 * Resolves true when ads may be requested.
 */
export function initAds(sdk: AdMobSdk | null = loadAdMob()): Promise<boolean> {
  if (!sdk) return Promise.resolve(false);
  ready ??= sdk.AdsConsent.gatherConsent()
    .then(async ({ canRequestAds }) => {
      if (canRequestAds) await sdk.mobileAds().initialize();
      return canRequestAds;
    })
    .catch(() => false);
  return ready;
}

/** Test hook. */
export const resetAds = () => {
  ready = null;
};
