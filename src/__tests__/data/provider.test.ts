import { marketData, USING_SAMPLE_DATA } from '../../data';
import { mockProvider } from '../../data/mock/mockProvider';
import { SAMPLE_STOCKS } from '../../data/mock/stocks';
import { CompositeProvider, type MarketDataProvider } from '../../data/provider';
import { parseStockId, stockId } from '../../data/types';

describe('sample data', () => {
  it('has unique ids and complete breakdowns', () => {
    const ids = SAMPLE_STOCKS.map(stockId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of SAMPLE_STOCKS) {
      expect(Object.values(s.breakdown).every((t) => t.length > 10)).toBe(true);
      expect(s.currency).toBe(s.market === 'SGX' ? 'SGD' : 'USD');
    }
  });

  it('covers both markets and every size bucket', () => {
    expect(new Set(SAMPLE_STOCKS.map((s) => s.market))).toEqual(new Set(['US', 'SGX']));
    expect(new Set(SAMPLE_STOCKS.map((s) => s.capBucket))).toEqual(new Set(['mega', 'large', 'mid', 'small']));
  });

  it('is flagged as sample data', () => {
    expect(USING_SAMPLE_DATA).toBe(true);
  });
});

describe('stock ids', () => {
  it('round-trips', () => {
    expect(stockId({ market: 'SGX', symbol: 'D05' })).toBe('SGX:D05');
    expect(parseStockId('US:AAPL')).toEqual({ market: 'US', symbol: 'AAPL' });
  });
});

describe('mockProvider', () => {
  it('lists the universe for the given markets', async () => {
    const us = await mockProvider.listUniverse(['US']);
    expect(us.length).toBeGreaterThan(10);
    expect(us.every((s) => s.market === 'US')).toBe(true);
  });

  it('returns a stock or null', async () => {
    expect((await mockProvider.getStock('US:AAPL'))?.name).toBe('Apple');
    expect(await mockProvider.getStock('US:NOPE')).toBeNull();
  });

  it('builds a stable history that ends at the current price', async () => {
    const a = await mockProvider.getHistory('US:AAPL', '1M');
    const b = await mockProvider.getHistory('US:AAPL', '1M');
    expect(a).toEqual(b);
    expect(a).toHaveLength(22);
    expect(a[a.length - 1].close).toBe(241.3);
    expect((await mockProvider.getHistory('US:AAPL', '1Y')).length).toBe(252);
    expect(await mockProvider.getHistory('US:NOPE', '6M')).toEqual([]);
  });

  it('returns quotes for known ids only', async () => {
    const q = await mockProvider.getQuotes(['US:AAPL', 'US:NOPE']);
    expect(Object.keys(q)).toEqual(['US:AAPL']);
  });
});

describe('CompositeProvider', () => {
  const fake = (market: 'US' | 'SGX'): MarketDataProvider => ({
    markets: [market],
    listUniverse: jest.fn(async () => SAMPLE_STOCKS.filter((s) => s.market === market)),
    getStock: jest.fn(async (id) => SAMPLE_STOCKS.find((s) => stockId(s) === id) ?? null),
    getHistory: jest.fn(async () => [{ date: '2026-01-01', close: 1 }]),
    getQuotes: jest.fn(async (ids) => Object.fromEntries(ids.map((id) => [id, { price: 1, changePct: 0 }]))),
  });

  it('routes each call to the provider for that market', async () => {
    const us = fake('US');
    const sgx = fake('SGX');
    const c = new CompositeProvider({ US: us, SGX: sgx });
    expect(c.markets).toEqual(['US', 'SGX']);

    await c.getStock('SGX:D05');
    expect(sgx.getStock).toHaveBeenCalledWith('SGX:D05');
    expect(us.getStock).not.toHaveBeenCalled();

    await c.getHistory('US:AAPL', '1M');
    expect(us.getHistory).toHaveBeenCalledWith('US:AAPL', '1M');

    const quotes = await c.getQuotes(['US:AAPL', 'SGX:D05']);
    expect(Object.keys(quotes).sort()).toEqual(['SGX:D05', 'US:AAPL']);
    expect(us.getQuotes).toHaveBeenCalledWith(['US:AAPL']);

    const all = await c.listUniverse(['US', 'SGX']);
    expect(all.length).toBe(SAMPLE_STOCKS.length);
  });

  it('handles markets with no provider', async () => {
    const c = new CompositeProvider({ US: fake('US') });
    expect(await c.listUniverse(['SGX'])).toEqual([]);
    expect(await c.getStock('SGX:D05')).toBeNull();
    expect(await c.getHistory('SGX:D05', '1M')).toEqual([]);
    expect(await c.getQuotes(['SGX:D05'])).toEqual({});
  });

  it('is what the app uses', async () => {
    expect((await marketData.getStock('SGX:D05'))?.name).toBe('DBS Group');
  });
});
