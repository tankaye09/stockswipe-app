import { act, render, screen, userEvent } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import { AdCard } from '../../components/FeedCards';
import { initAds, loadAdMob, resetAds, type AdMobSdk } from '../../monetization/ads';

jest.mock('react-native-google-mobile-ads', () => ({
  __esModule: true,
  default: jest.fn(() => ({ initialize: jest.fn() })),
  AdsConsent: { gatherConsent: jest.fn() },
  BannerAd: () => null,
  BannerAdSize: { MEDIUM_RECTANGLE: 'MEDIUM_RECTANGLE' },
}));

let failLoad: (() => void) | undefined;
function fakeSdk(canRequestAds = true): AdMobSdk & { initialize: jest.Mock } {
  const initialize = jest.fn(async () => []);
  return {
    initialize,
    mobileAds: () => ({ initialize }),
    AdsConsent: { gatherConsent: jest.fn(async () => ({ canRequestAds })) },
    BannerAd: ({ unitId, size, onAdFailedToLoad }) => {
      failLoad = () => onAdFailedToLoad?.(new Error('no fill'));
      return <Text testID="banner">{`${unitId} ${size}`}</Text>;
    },
    BannerAdSize: { MEDIUM_RECTANGLE: 'MEDIUM_RECTANGLE' },
  };
}

beforeEach(() => resetAds());

describe('loadAdMob', () => {
  it('is off without a unit ID or in Expo Go', () => {
    expect(loadAdMob(undefined, false)).toBeNull();
    expect(loadAdMob('unit', true)).toBeNull();
  });

  it('loads the SDK when a unit ID is set', () => {
    const sdk = loadAdMob('unit', false)!;
    expect(sdk.BannerAdSize.MEDIUM_RECTANGLE).toBe('MEDIUM_RECTANGLE');
    expect(sdk.mobileAds).toBe(jest.requireMock('react-native-google-mobile-ads').default);
  });
});

describe('initAds', () => {
  it('does nothing when ads are off', async () => {
    await expect(initAds(null)).resolves.toBe(false);
    await expect(initAds()).resolves.toBe(false);
  });

  it('asks for consent, then starts the SDK once', async () => {
    const sdk = fakeSdk();
    await expect(initAds(sdk)).resolves.toBe(true);
    await initAds(sdk);
    expect(sdk.AdsConsent.gatherConsent).toHaveBeenCalledTimes(1);
    expect(sdk.initialize).toHaveBeenCalledTimes(1);
  });

  it('does not start the SDK without consent', async () => {
    const sdk = fakeSdk(false);
    await expect(initAds(sdk)).resolves.toBe(false);
    expect(sdk.initialize).not.toHaveBeenCalled();
  });

  it('treats a consent error as no ads', async () => {
    const sdk = fakeSdk();
    (sdk.AdsConsent.gatherConsent as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    await expect(initAds(sdk)).resolves.toBe(false);
  });
});

describe('AdCard with AdMob', () => {
  it('shows a medium rectangle ad, with a link to remove ads', async () => {
    const onRemoveAds = jest.fn();
    await render(<AdCard onRemoveAds={onRemoveAds} unitId="unit-1" sdk={fakeSdk()} />);
    expect(screen.getByTestId('banner')).toHaveTextContent('unit-1 MEDIUM_RECTANGLE');
    await userEvent.setup().press(screen.getByText('Remove ads'));
    expect(onRemoveAds).toHaveBeenCalled();
  });

  it('falls back to the Premium card when no ad loads', async () => {
    await render(<AdCard onRemoveAds={jest.fn()} unitId="unit-1" sdk={fakeSdk()} />);
    await act(async () => failLoad!());
    expect(screen.queryByTestId('banner')).not.toBeOnTheScreen();
    expect(screen.getByText('Swipe with no ads')).toBeOnTheScreen();
  });
});
