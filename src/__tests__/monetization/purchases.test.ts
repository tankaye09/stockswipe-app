import Constants, { ExecutionEnvironment } from 'expo-constants';
import {
  createPurchases,
  createRevenueCatPurchases,
  createTestPurchases,
  isExpoGo,
  parseRemoteLimits,
  purchases,
  setPurchases,
  type RevenueCatSdk,
} from '../../monetization/purchases';

jest.mock('react-native-purchases', () => ({ __esModule: true, default: { configure: jest.fn() } }));

const pkg = (price: string) => ({ identifier: price, product: { priceString: price } });
const info = (active: string[]) => ({ entitlements: { active: Object.fromEntries(active.map((a) => [a, {}])) } });

function fakeSdk(over: Partial<RevenueCatSdk> = {}): jest.Mocked<RevenueCatSdk> {
  return {
    configure: jest.fn(),
    getOfferings: jest.fn(async () => ({
      current: { monthly: pkg('S$6.98'), annual: pkg('S$59.98'), metadata: { free_days: 3, daily_swipes: '40' } },
    })),
    purchasePackage: jest.fn(async () => ({ customerInfo: info(['premium']) })),
    restorePurchases: jest.fn(async () => info(['premium'])),
    getCustomerInfo: jest.fn(async () => info([])),
    addCustomerInfoUpdateListener: jest.fn(),
    removeCustomerInfoUpdateListener: jest.fn(() => true),
    ...over,
  } as jest.Mocked<RevenueCatSdk>;
}

describe('test purchases', () => {
  it('simulates a store with the configured fallback prices', async () => {
    const p = createTestPurchases();
    expect(p.isTest).toBe(true);
    expect(await p.getPlans()).toEqual([
      { id: 'monthly', title: 'Monthly', price: 'S$5.98', period: 'month' },
      { id: 'annual', title: 'Yearly', price: 'S$48.98', period: 'year' },
    ]);
    expect(await p.purchase('monthly')).toEqual({ status: 'purchased' });
    expect(await p.restore()).toBe(false);
    expect(await p.isPremium()).toBeNull();
    expect(await p.getRemoteLimits()).toBeNull();
    expect(() => p.onChange(jest.fn())()).not.toThrow();
  });
});

describe('RevenueCat purchases', () => {
  it('configures the SDK and lists store prices from the current offering', async () => {
    const sdk = fakeSdk();
    const p = createRevenueCatPurchases(sdk, 'key_123', 'premium');
    expect(sdk.configure).toHaveBeenCalledWith({ apiKey: 'key_123' });
    expect(p.isTest).toBe(false);
    expect(await p.getPlans()).toEqual([
      { id: 'monthly', title: 'Monthly', price: 'S$6.98', period: 'month' },
      { id: 'annual', title: 'Yearly', price: 'S$59.98', period: 'year' },
    ]);
  });

  it('skips plans the offering does not have', async () => {
    const sdk = fakeSdk({
      getOfferings: jest.fn(async () => ({ current: { monthly: pkg('S$6.98'), annual: null, metadata: {} } })),
    });
    const p = createRevenueCatPurchases(sdk, 'k', 'premium');
    expect((await p.getPlans()).map((x) => x.id)).toEqual(['monthly']);
    expect(await p.purchase('annual')).toEqual({ status: 'failed', error: 'This plan is not available right now.' });
  });

  it('has no plans when no offering is set up', async () => {
    const sdk = fakeSdk({ getOfferings: jest.fn(async () => ({ current: null })) });
    const p = createRevenueCatPurchases(sdk, 'k', 'premium');
    expect(await p.getPlans()).toEqual([]);
    expect(await p.getRemoteLimits()).toEqual({});
  });

  it('buys a plan and checks the entitlement', async () => {
    const sdk = fakeSdk();
    const p = createRevenueCatPurchases(sdk, 'k', 'premium');
    expect(await p.purchase('annual')).toEqual({ status: 'purchased' });
    expect(sdk.purchasePackage).toHaveBeenCalledWith(pkg('S$59.98'));

    sdk.purchasePackage.mockResolvedValueOnce({ customerInfo: info([]) });
    expect(await p.purchase('annual')).toMatchObject({ status: 'failed' });
  });

  it('reports a cancel and other errors', async () => {
    const sdk = fakeSdk();
    const p = createRevenueCatPurchases(sdk, 'k', 'premium');
    sdk.purchasePackage.mockRejectedValueOnce(Object.assign(new Error('x'), { userCancelled: true }));
    expect(await p.purchase('monthly')).toEqual({ status: 'cancelled' });
    sdk.purchasePackage.mockRejectedValueOnce(new Error('Card declined'));
    expect(await p.purchase('monthly')).toEqual({ status: 'failed', error: 'Card declined' });
    sdk.purchasePackage.mockRejectedValueOnce(new Error(''));
    expect(await p.purchase('monthly')).toEqual({ status: 'failed', error: 'The purchase did not go through.' });
  });

  it('restores, checks status, reads limits and listens for changes', async () => {
    const sdk = fakeSdk();
    const p = createRevenueCatPurchases(sdk, 'k', 'premium');
    expect(await p.restore()).toBe(true);
    expect(await p.isPremium()).toBe(false);
    expect(await p.getRemoteLimits()).toEqual({ freeDays: 3, dailySwipes: 40 });

    const cb = jest.fn();
    const off = p.onChange(cb);
    const listener = sdk.addCustomerInfoUpdateListener.mock.calls[0][0];
    listener(info(['premium']));
    listener(info(['other']));
    expect(cb.mock.calls).toEqual([[true], [false]]);
    off();
    expect(sdk.removeCustomerInfoUpdateListener).toHaveBeenCalledWith(listener);
  });
});

describe('parseRemoteLimits', () => {
  it('maps dashboard metadata keys and drops bad values', () => {
    expect(parseRemoteLimits({ free_days: 14, daily_swipes: 30, ad_every: 0 })).toEqual({
      freeDays: 14,
      dailySwipes: 30,
      adEvery: 0,
    });
    expect(parseRemoteLimits({ free_days: 'lots', other: 1 })).toEqual({});
    expect(parseRemoteLimits(null)).toEqual({});
  });
});

describe('choosing a backend', () => {
  afterEach(() => setPurchases(null));

  it('uses test purchases without a key or in Expo Go', () => {
    expect(createPurchases(undefined, false).isTest).toBe(true);
    expect(createPurchases('key', true).isTest).toBe(true);
  });

  it('uses RevenueCat when a key is set outside Expo Go', () => {
    const p = createPurchases('key', false);
    expect(p.isTest).toBe(false);
    expect(jest.requireMock('react-native-purchases').default.configure).toHaveBeenCalledWith({ apiKey: 'key' });
  });

  it('detects Expo Go', () => {
    const original = Constants.executionEnvironment;
    Object.defineProperty(Constants, 'executionEnvironment', {
      value: ExecutionEnvironment.StoreClient,
      configurable: true,
    });
    expect(isExpoGo()).toBe(true);
    Object.defineProperty(Constants, 'executionEnvironment', { value: original, configurable: true });
    expect(isExpoGo()).toBe(false);
  });

  it('keeps one shared instance that tests can replace', () => {
    const a = purchases();
    expect(purchases()).toBe(a);
    const fake = createTestPurchases();
    setPurchases(fake);
    expect(purchases()).toBe(fake);
  });
});
