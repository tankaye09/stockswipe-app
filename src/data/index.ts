import { CompositeProvider, type MarketDataProvider } from './provider';
import { mockProvider } from './mock/mockProvider';
import { LIVE } from './config';
import { createSupabaseProvider } from './live/supabaseProvider';

const source: MarketDataProvider = LIVE ? createSupabaseProvider(LIVE.url, LIVE.anonKey) : mockProvider;

/**
 * The provider the whole app uses: our Supabase database when live data is
 * turned on (src/data/config.ts), otherwise sample data.
 */
export const marketData = new CompositeProvider({
  US: source,
  SGX: source,
});

/** True while the app shows sample data. Settings says so when set. */
export const USING_SAMPLE_DATA = !LIVE;

/** Where prices come from, in one line for the About section. */
export const DATA_NOTE = USING_SAMPLE_DATA
  ? 'Prices shown are sample data.'
  : 'Prices are end-of-day data from public sources and may be delayed or wrong.';

export * from './types';
