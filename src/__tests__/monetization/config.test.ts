import { envCount } from '../../monetization/config';

describe('envCount', () => {
  it('reads whole numbers and falls back otherwise', () => {
    expect(envCount('0', 7)).toBe(0);
    expect(envCount(' 12 ', 7)).toBe(12);
    expect(envCount(undefined, 7)).toBe(7);
    expect(envCount('', 7)).toBe(7);
    expect(envCount('-1', 7)).toBe(7);
    expect(envCount('2.5', 7)).toBe(7);
    expect(envCount('abc', 7)).toBe(7);
  });
});

describe('config from env vars', () => {
  const OLD = process.env;
  afterEach(() => {
    process.env = OLD;
    jest.resetModules();
  });

  it('applies limits, prices, keys, ad units and referral links', () => {
    process.env = {
      ...OLD,
      EXPO_PUBLIC_FREE_DAYS: '3',
      EXPO_PUBLIC_FREE_DAILY_SWIPES: '25',
      EXPO_PUBLIC_AD_EVERY_N_SWIPES: '0',
      EXPO_PUBLIC_PREMIUM_MONTHLY_PRICE: 'S$3.98',
      EXPO_PUBLIC_PREMIUM_ANNUAL_PRICE: ' ',
      EXPO_PUBLIC_PREMIUM_ENTITLEMENT: 'pro',
      EXPO_PUBLIC_REVENUECAT_IOS_KEY: 'appl_x',
      EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: 'goog_x',
      EXPO_PUBLIC_ADMOB_FEED_UNIT_IOS: 'ios-unit',
      EXPO_PUBLIC_ADMOB_FEED_UNIT_ANDROID: 'android-unit',
      EXPO_PUBLIC_REFERRAL_MOOMOO: 'https://moomoo.example/ref',
    };
    jest.isolateModules(() => {
      const c = jest.requireActual<typeof import('../../monetization/config')>('../../monetization/config');
      expect(c.DEFAULT_LIMITS).toEqual({ freeDays: 3, dailySwipes: 25, adEvery: 0 });
      expect(c.PLANS.map((p) => p.fallbackPrice)).toEqual(['S$3.98', 'S$48.98']);
      expect(c.PREMIUM.entitlement).toBe('pro');
      // Jest runs as iOS.
      expect(c.PREMIUM.revenueCatKey).toBe('appl_x');
      expect(c.ADS.feedUnitId).toBe('ios-unit');
      expect(c.REFERRAL_URLS).toEqual({ moomoo: 'https://moomoo.example/ref', tiger: undefined, ibkr: undefined });
    });
  });

  it('turns on admin tools by env var outside development', () => {
    const dev = (globalThis as unknown as { __DEV__: boolean }).__DEV__;
    (globalThis as unknown as { __DEV__: boolean }).__DEV__ = false;
    try {
      jest.isolateModules(() =>
        expect(
          jest.requireActual<typeof import('../../monetization/config')>('../../monetization/config').ADMIN_TOOLS,
        ).toBe(false),
      );
      process.env = { ...OLD, EXPO_PUBLIC_ADMIN_TOOLS: '1' };
      jest.isolateModules(() =>
        expect(
          jest.requireActual<typeof import('../../monetization/config')>('../../monetization/config').ADMIN_TOOLS,
        ).toBe(true),
      );
    } finally {
      (globalThis as unknown as { __DEV__: boolean }).__DEV__ = dev;
    }
  });
});
