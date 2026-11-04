import { CompositeProvider } from './provider';
import { mockProvider } from './mock/mockProvider';

/**
 * The provider the whole app uses. Swap a market's entry here when a real data
 * vendor is chosen, e.g. `US: new PolygonProvider(key)`.
 */
export const marketData = new CompositeProvider({
  US: mockProvider,
  SGX: mockProvider,
});

/** True while any market is on sample data. The UI shows a banner when set. */
export const USING_SAMPLE_DATA = true;

export * from './types';
