import { MIN_LISTINGS } from '../../../jobs/sync/lists';
import {
  applyQuote,
  derive,
  MAX_FAILS_IN_A_ROW,
  needsProfile,
  newRow,
  QUOTE_BATCH,
  syncMarket,
  type SyncDeps,
} from '../../../jobs/sync/run';
import type { StockStore } from '../../../jobs/sync/store';
import type { Bar, MarketSource, Profile, Quote } from '../../../jobs/sync/yahoo';
import type { PriceRow, StockRow } from '../../data/live/rows';

const NOW = new Date('2026-11-05T23:00:00Z'); // 6pm New York, 7am Singapore on the 6th

const quote = (symbol: string, over: Partial<Quote> = {}): Quote => ({
  symbol,
  quoteType: 'EQUITY',
  name: null,
  currency: null,
  price: 100,
  changePct: 1.234,
  marketCap: 50e9,
  pe: 20.123,
  dividendYield: 3.456,
  high52: 120,
  low52: 80,
  earnings: [new Date('2026-10-01T12:00:00Z'), new Date('2026-12-01T12:00:00Z')],
  time: new Date('2026-11-05T21:00:00Z'),
  ...over,
});

const nasdaq = (...symbols: string[]) => ({
  data: {
    rows: symbols.map((s) => ({ symbol: s, name: `${s} Corp Common Stock`, sector: 'Technology', industry: '' })),
  },
});

function fakeStore(existing: StockRow[] = []) {
  const saved = { stocks: [] as StockRow[], prices: [] as PriceRow[], deleted: [] as string[], pricesBefore: '' };
  const store: StockStore = {
    listStocks: jest.fn(async () => existing),
    upsertStocks: jest.fn(async (rows) => void saved.stocks.push(...rows)),
    upsertPrices: jest.fn(async (rows) => void saved.prices.push(...rows)),
    deleteStocks: jest.fn(async (ids) => void saved.deleted.push(...ids)),
    deletePricesBefore: jest.fn(async (d) => void (saved.pricesBefore = d)),
  };
  return { store, saved };
}

function fakeSource(over: Partial<MarketSource> = {}): MarketSource {
  return {
    quotes: jest.fn(async (symbols: string[]) => symbols.map((s) => quote(s))),
    profile: jest.fn(async (): Promise<Profile> => ({
      sector: 'Technology',
      industry: 'Semiconductors',
      description: 'Makes chips. Sells them worldwide.',
    })),
    history: jest.fn(async (): Promise<Bar[]> => [{ date: new Date('2026-11-04T20:00:00Z'), close: 98.123456 }]),
    ...over,
  };
}

function deps(json: unknown, source: MarketSource, store: StockStore): SyncDeps & { logs: string[] } {
  const logs: string[] = [];
  return {
    fetchJson: jest.fn(async () => json),
    source,
    store,
    log: (m) => void logs.push(m),
    now: () => NOW,
    pause: jest.fn(async () => {}),
    logs,
  };
}

const OPTS = { profileLimit: 10, backfillLimit: 10 };

const saved = (over: Partial<StockRow>): StockRow => ({
  ...newRow(
    { market: 'US', symbol: 'X', yahooSymbol: 'X', name: 'X', sector: 'Technology', industry: null },
    '2026-11-01T00:00:00Z',
  ),
  ...over,
});

beforeEach(() => {
  MIN_LISTINGS.US = 1;
  MIN_LISTINGS.SGX = 1;
});
afterAll(() => {
  MIN_LISTINGS.US = 4000;
  MIN_LISTINGS.SGX = 300;
});

describe('syncMarket', () => {
  it('saves quoted shares, fills profiles and history, and drops delisted stocks', async () => {
    const msft = saved({
      id: 'US:MSFT',
      symbol: 'MSFT',
      yahoo_symbol: 'MSFT',
      name: 'Microsoft Corporation',
      profile_updated_at: '2026-11-01T00:00:00Z',
      history_backfilled_at: '2026-11-01T00:00:00Z',
      description: 'Makes software.',
    });
    const { store, saved: out } = fakeStore([msft, saved({ id: 'US:OLD', symbol: 'OLD' })]);
    const source = fakeSource({
      quotes: jest.fn(async (symbols: string[]) =>
        symbols
          .filter((s) => s !== 'MISS')
          .map((s) => quote(s, s === 'FUND' ? { quoteType: 'ETF' } : s === 'AAPL' ? { name: 'Apple Inc.' } : {})),
      ),
    });
    const d = deps(nasdaq('AAPL', 'MSFT', 'FUND', 'MISS'), source, store);

    const result = await syncMarket('US', d, OPTS);

    expect(result).toEqual({
      market: 'US',
      listed: 4,
      quoted: 2,
      profiled: 1,
      backfilled: 1,
      saved: 2,
      prices: 3,
      removed: 1,
    });
    const aapl = out.stocks.find((s) => s.id === 'US:AAPL')!;
    expect(aapl).toMatchObject({
      name: 'Apple Inc.',
      currency: 'USD',
      sector: 'Technology',
      industry: 'Semiconductors',
      price: 100,
      change_pct: 1.23,
      pe_ratio: 20.12,
      dividend_yield: 3.46,
      next_earnings: '2026-12-01',
      quote_date: '2026-11-05',
      cap_bucket: 'large',
      themes: ['semiconductors', 'dividends'],
      one_liner: 'Makes chips.',
      summary: 'Sells them worldwide.',
      profile_updated_at: NOW.toISOString(),
      history_backfilled_at: NOW.toISOString(),
    });
    expect(out.stocks.find((s) => s.id === 'US:MSFT')).toMatchObject({
      name: 'Microsoft Corporation',
      one_liner: 'Makes software.',
    });
    expect(source.profile).toHaveBeenCalledTimes(1);
    expect(source.history).toHaveBeenCalledWith('AAPL', new Date('2025-10-31T23:00:00Z'));
    expect(out.prices).toEqual([
      { stock_id: 'US:AAPL', date: '2026-11-04', close: 98.1235 },
      { stock_id: 'US:AAPL', date: '2026-11-05', close: 100 },
      { stock_id: 'US:MSFT', date: '2026-11-05', close: 100 },
    ]);
    expect(out.deleted).toEqual(['US:OLD']);
    expect(out.pricesBefore).toBe('2025-10-01');
    expect(d.logs[0]).toBe('US: 4 listed, 2 in the database');
  });

  it('stops before touching the database when the list looks broken', async () => {
    MIN_LISTINGS.US = 4000;
    const { store } = fakeStore();
    await expect(syncMarket('US', deps(nasdaq('AAPL'), fakeSource(), store), OPTS)).rejects.toThrow(
      'US list has only 1 stocks (expected 4000+)',
    );
    expect(store.listStocks).not.toHaveBeenCalled();
  });

  it('quotes in batches and carries on when a batch fails', async () => {
    const letters = (i: number) => [676, 26, 1].map((d) => String.fromCharCode(65 + (Math.floor(i / d) % 26))).join('');
    const symbols = Array.from({ length: QUOTE_BATCH + 5 }, (_, i) => letters(i));
    let call = 0;
    const source = fakeSource({
      quotes: jest.fn(async (batch: string[]) => {
        call += 1;
        if (call === 1) throw new Error('429');
        return batch.map((s) => quote(s));
      }),
    });
    const { store, saved: out } = fakeStore();
    const d = deps(nasdaq(...symbols), source, store);
    const result = await syncMarket('US', d, { profileLimit: 0, backfillLimit: 0 });
    expect(source.quotes).toHaveBeenCalledTimes(2);
    expect(result.quoted).toBe(5);
    expect(out.stocks).toHaveLength(result.quoted);
    expect(d.logs).toContain('US: quote batch 1 failed: Error: 429');
    expect(store.deleteStocks).not.toHaveBeenCalled();
  });

  it('uses the SGD rate for SGX size buckets and stops a step when Yahoo keeps failing', async () => {
    const codes = Array.from({ length: MAX_FAILS_IN_A_ROW + 2 }, (_, i) => `C${i}`);
    const source = fakeSource({
      quotes: jest.fn(async (symbols: string[]) =>
        symbols.map((s) =>
          s === 'SGDUSD=X'
            ? quote(s, { quoteType: 'CURRENCY', price: 0.5 })
            : quote(s, { marketCap: 30e9, currency: s === 'C1.SI' ? 'USD' : 'SGD', earnings: [] }),
        ),
      ),
      profile: jest.fn(async () => {
        throw new Error('Too Many Requests');
      }),
      history: jest.fn(async () => []),
    });
    const { store, saved: out } = fakeStore();
    const d = deps({ data: { prices: codes.map((c) => ({ nc: c, n: `${c} Ltd` })) } }, source, store);
    const result = await syncMarket('SGX', d, { profileLimit: 100, backfillLimit: 1 });

    expect(result.profiled).toBe(0);
    expect(source.profile).toHaveBeenCalledTimes(MAX_FAILS_IN_A_ROW);
    expect(d.logs).toContain(
      `SGX profiles: ${MAX_FAILS_IN_A_ROW} failures in a row (Error: Too Many Requests), stopping until the next run`,
    );
    const c0 = out.stocks.find((s) => s.id === 'SGX:C0')!;
    expect(c0).toMatchObject({ currency: 'SGD', cap_bucket: 'large', sector: null, next_earnings: null });
    expect(c0.one_liner).toBe('C0 Ltd is listed on SGX.');
    expect(out.stocks.find((s) => s.id === 'SGX:C1')).toMatchObject({ currency: 'USD', cap_bucket: 'large' });
    expect(result.backfilled).toBe(1);
  });

  it('falls back to a default SGD rate when the rate quote fails', async () => {
    const source = fakeSource({
      quotes: jest.fn(async (symbols: string[]) => {
        if (symbols[0] === 'SGDUSD=X') throw new Error('down');
        return symbols.map((s) => quote(s, { marketCap: 14e9, currency: 'SGD' }));
      }),
    });
    const { store, saved: out } = fakeStore();
    await syncMarket('SGX', deps({ data: { prices: [{ nc: 'D05', n: 'DBS' }] } }, source, store), OPTS);
    expect(out.stocks[0].cap_bucket).toBe('large'); // 14B SGD x 0.75
  });

  it('keeps what it has when a profile is missing or thin', async () => {
    const known = saved({
      id: 'US:KEEP',
      symbol: 'KEEP',
      yahoo_symbol: 'KEEP',
      industry: 'Banks',
      description: 'Old text.',
    });
    const profiles: (Profile | null)[] = [null, { sector: null, industry: null, description: '' }];
    const source = fakeSource({ profile: jest.fn(async () => profiles.shift() ?? null) });
    const { store, saved: out } = fakeStore([known]);
    await syncMarket('US', deps(nasdaq('KEEP', 'NEW'), source, store), OPTS);
    expect(out.stocks.find((s) => s.id === 'US:KEEP')).toMatchObject({
      sector: 'Technology',
      industry: 'Banks',
      description: 'Old text.',
    });
    expect(out.stocks.find((s) => s.id === 'US:NEW')).toMatchObject({
      sector: 'Technology',
      industry: null,
      description: '',
    });
  });
});

describe('row helpers', () => {
  it('keeps the saved name and currency when Yahoo has none', () => {
    const row = saved({ name: 'Keep Me', currency: 'USD', market_cap: 5 });
    const q = quote('X', { currency: 'EUR', marketCap: null, changePct: null, pe: -3, dividendYield: 0, time: null });
    expect(applyQuote(row, q, NOW)).toMatchObject({
      name: 'Keep Me',
      currency: 'USD',
      market_cap: 5,
      change_pct: 0,
      pe_ratio: null,
      dividend_yield: null,
      quote_date: '2026-11-05',
    });
  });

  it('derives size from US dollars', () => {
    expect(derive(saved({ market_cap: 250e9 }), 0.75).cap_bucket).toBe('mega');
    expect(derive(saved({ market_cap: 250e9, currency: 'SGD' }), 0.75).cap_bucket).toBe('large');
  });

  it('picks stocks with no profile first, then the oldest', () => {
    const rows = [
      saved({ id: 'fresh', profile_updated_at: '2026-11-04T00:00:00Z' }),
      saved({ id: 'old', profile_updated_at: '2026-09-01T00:00:00Z' }),
      saved({ id: 'older', profile_updated_at: '2026-08-01T00:00:00Z' }),
      saved({ id: 'never', profile_updated_at: null }),
    ];
    expect(needsProfile(rows, NOW, 10).map((r) => r.id)).toEqual(['never', 'older', 'old']);
    expect(needsProfile(rows, NOW, 1).map((r) => r.id)).toEqual(['never']);
  });
});
