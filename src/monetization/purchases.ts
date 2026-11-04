// Premium subscriptions. Screens talk to the `Purchases` interface only, so the
// store SDK can be swapped or faked. RevenueCat wraps both the App Store and
// Google Play behind one API, so there is no platform-specific purchase code.
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { cleanLimits } from '../state/rules';
import { PLANS, PREMIUM, type Limits, type PlanId } from './config';

export interface Plan {
  id: PlanId;
  title: string;
  /** Localised price from the store, e.g. "S$5.98". */
  price: string;
  period: string;
}

export type PurchaseOutcome = { status: 'purchased' } | { status: 'cancelled' } | { status: 'failed'; error: string };

export interface Purchases {
  /** True when purchases are simulated and nobody is charged. */
  readonly isTest: boolean;
  getPlans(): Promise<Plan[]>;
  purchase(plan: PlanId): Promise<PurchaseOutcome>;
  /** Restores a subscription bought on another install. Resolves true if Premium is active. */
  restore(): Promise<boolean>;
  /** Whether Premium is active, or null when this backend can't tell (test purchases). */
  isPremium(): Promise<boolean | null>;
  /** Limits set for everyone in the dashboard ({} when none are set), or null when this backend has none. Rejects when offline. */
  getRemoteLimits(): Promise<Partial<Limits> | null>;
  /** Calls back when the store reports a change, e.g. a renewal lapsing. Returns an unsubscribe. */
  onChange(cb: (premium: boolean) => void): () => void;
}

const fallbackPlans = (): Plan[] =>
  PLANS.map(({ id, title, fallbackPrice, period }) => ({ id, title, price: fallbackPrice, period }));

/** Simulated store for development, Expo Go, tests and e2e. Every purchase succeeds and nothing is charged. */
export function createTestPurchases(): Purchases {
  return {
    isTest: true,
    getPlans: async () => fallbackPlans(),
    purchase: async () => ({ status: 'purchased' }),
    restore: async () => false,
    isPremium: async () => null,
    getRemoteLimits: async () => null,
    onChange: () => () => {},
  };
}

// Only the parts of the RevenueCat SDK we use, so the adapter is easy to fake in tests.
interface RcPackage {
  identifier: string;
  product: { priceString: string };
}
interface RcCustomerInfo {
  entitlements: { active: Record<string, unknown> };
}
export interface RevenueCatSdk {
  configure(opts: { apiKey: string }): void;
  getOfferings(): Promise<{
    current: { monthly: RcPackage | null; annual: RcPackage | null; metadata: Record<string, unknown> } | null;
  }>;
  purchasePackage(pkg: RcPackage): Promise<{ customerInfo: RcCustomerInfo }>;
  restorePurchases(): Promise<RcCustomerInfo>;
  getCustomerInfo(): Promise<RcCustomerInfo>;
  addCustomerInfoUpdateListener(cb: (info: RcCustomerInfo) => void): void;
  removeCustomerInfoUpdateListener(cb: (info: RcCustomerInfo) => void): boolean;
}

/**
 * Reads free tier limits from the RevenueCat offering's metadata, which is
 * edited in the RevenueCat dashboard (Product catalog, Offerings, Metadata):
 *   { "free_days": 7, "daily_swipes": 50, "ad_every": 10 }
 * Any key can be left out to keep the app's default.
 */
export function parseRemoteLimits(metadata: Record<string, unknown> | null | undefined): Partial<Limits> {
  return cleanLimits({
    freeDays: metadata?.free_days,
    dailySwipes: metadata?.daily_swipes,
    adEvery: metadata?.ad_every,
  });
}

/**
 * Real purchases through RevenueCat. Products come from the "current"
 * offering in the RevenueCat dashboard, using its standard monthly and
 * annual packages.
 */
export function createRevenueCatPurchases(sdk: RevenueCatSdk, apiKey: string, entitlement: string): Purchases {
  sdk.configure({ apiKey });
  const active = (info: RcCustomerInfo) => entitlement in info.entitlements.active;
  const packageFor = async (id: PlanId) => (await sdk.getOfferings()).current?.[id] ?? null;

  return {
    isTest: false,
    async getPlans() {
      const offering = (await sdk.getOfferings()).current;
      return PLANS.flatMap(({ id, title, period }) => {
        const pkg = offering?.[id];
        return pkg ? [{ id, title, period, price: pkg.product.priceString }] : [];
      });
    },
    async purchase(id) {
      try {
        const pkg = await packageFor(id);
        if (!pkg) return { status: 'failed', error: 'This plan is not available right now.' };
        const { customerInfo } = await sdk.purchasePackage(pkg);
        return active(customerInfo)
          ? { status: 'purchased' }
          : { status: 'failed', error: 'The purchase went through but Premium is not active yet. Try Restore.' };
      } catch (e) {
        if ((e as { userCancelled?: boolean }).userCancelled) return { status: 'cancelled' };
        return { status: 'failed', error: (e as Error).message || 'The purchase did not go through.' };
      }
    },
    restore: async () => active(await sdk.restorePurchases()),
    isPremium: async () => active(await sdk.getCustomerInfo()),
    getRemoteLimits: async () => parseRemoteLimits((await sdk.getOfferings()).current?.metadata),
    onChange(cb) {
      const listener = (info: RcCustomerInfo) => cb(active(info));
      sdk.addCustomerInfoUpdateListener(listener);
      return () => {
        sdk.removeCustomerInfoUpdateListener(listener);
      };
    },
  };
}

/** Expo Go has no store SDKs, so it always uses test purchases. */
export const isExpoGo = () => Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** Picks real purchases when a RevenueCat key is set and the native SDK is present. */
export function createPurchases(apiKey = PREMIUM.revenueCatKey, expoGo = isExpoGo()): Purchases {
  if (!apiKey || expoGo) return createTestPurchases();
  // Loaded lazily so Expo Go and tests never touch the native module.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sdk = require('react-native-purchases').default as RevenueCatSdk;
  return createRevenueCatPurchases(sdk, apiKey, PREMIUM.entitlement);
}

let instance: Purchases | null = null;
/** The app's purchases backend, created on first use. */
export const purchases = () => (instance ??= createPurchases());
/** Test hook: replace or reset the backend. */
export const setPurchases = (p: Purchases | null) => {
  instance = p;
};
