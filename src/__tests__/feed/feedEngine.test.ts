import { SAMPLE_STOCKS } from '../../data/mock/stocks';
import { stockId, type StockSummary } from '../../data/types';
import { buildBatch, BATCH_SIZE, NO_FILTERS, passesFilters, type FeedInput } from '../../feed/feedEngine';
import { sample } from '../../test-utils';

const TODAY = new Date('2026-11-04T09:00:00');

/** Deterministic random so batches are repeatable. */
const seq = () => {
  let i = 0;
  return () => (i++ * 0.6180339887) % 1;
};

const input = (over: Partial<FeedInput> = {}): FeedInput => ({
  universe: SAMPLE_STOCKS,
  markets: ['US'],
  interests: ['gaming', 'coffee-food'],
  saved: [],
  seen: new Set(),
  filters: NO_FILTERS,
  random: seq(),
  today: TODAY,
  ...over,
});

const withEarnings = (s: StockSummary, nextEarnings: string | null): StockSummary => ({
  ...s,
  stats: { ...s.stats, nextEarnings },
});

describe('buildBatch', () => {
  it('returns a full batch with no duplicates', () => {
    const batch = buildBatch(input());
    expect(batch).toHaveLength(BATCH_SIZE);
    expect(new Set(batch.map((b) => b.id)).size).toBe(BATCH_SIZE);
  });

  it('mixes about 4 liked, 3 news and 3 wildcard cards', () => {
    const batch = buildBatch(input());
    const count = (b: string) => batch.filter((x) => x.bucket === b).length;
    expect(count('liked')).toBe(4);
    expect(count('news')).toBe(3);
    expect(count('wildcard')).toBe(3);
  });

  it('gives every card a reason that matches its bucket', () => {
    for (const item of buildBatch(input())) {
      if (item.bucket === 'liked') expect(item.reason).toMatch(/^Because you picked (Gaming|Coffee & food)$/);
      if (item.bucket === 'news') expect(item.reason).toMatch(/^(In the news: |Moving today: )/);
      if (item.bucket === 'wildcard') expect(item.reason).toBe(`Something different: ${item.stock.sector}`);
    }
  });

  it('never puts an interest match in the wildcard bucket when a non-match exists', () => {
    const wild = buildBatch(input()).filter((b) => b.bucket === 'wildcard');
    for (const w of wild) {
      expect(w.stock.themes.some((t) => t === 'gaming' || t === 'coffee-food')).toBe(false);
    }
  });

  it('learns liked sectors from saved stocks', () => {
    const batch = buildBatch(input({ interests: [], saved: [sample('JPM')] }));
    const liked = batch.filter((b) => b.bucket === 'liked');
    expect(liked.length).toBeGreaterThan(0);
    for (const l of liked) {
      expect(l.stock.sector).toBe('Financials');
      expect(l.reason).toBe('Because you saved JPM (Financials)');
    }
  });

  it('labels big movers without news as "Moving today"', () => {
    const mover = { ...sample('AAPL'), news: [], changePct: -5.25 };
    const batch = buildBatch(input({ universe: [mover], interests: [] }));
    expect(batch[0].reason).toBe('Moving today: -5.3%');
    const up = { ...mover, changePct: 4 };
    expect(buildBatch(input({ universe: [up], interests: [] }))[0].reason).toBe('Moving today: +4.0%');
  });

  it('fills short buckets from whatever is left', () => {
    const universe = [sample('MCD'), sample('SBUX')]; // both coffee-food, one with news
    const batch = buildBatch(input({ universe, interests: ['coffee-food'] }));
    expect(batch.map((b) => b.stock.symbol).sort()).toEqual(['MCD', 'SBUX']);
  });

  it('prefers unseen stocks, then starts over when all are seen', () => {
    const universe = [sample('AAPL'), sample('MSFT'), sample('NVDA')];
    const seen = new Set([stockId(sample('AAPL')), stockId(sample('MSFT'))]);
    const batch = buildBatch(input({ universe, seen, interests: ['ai'] }));
    expect(batch.map((b) => b.stock.symbol)).toEqual(['NVDA']);

    const allSeen = new Set(universe.map(stockId));
    expect(buildBatch(input({ universe, seen: allSeen, interests: ['ai'] }))).toHaveLength(3);
  });

  it('only shows the selected markets', () => {
    const sgx = buildBatch(input({ markets: ['SGX'] }));
    expect(sgx.length).toBeGreaterThan(0);
    expect(sgx.every((b) => b.stock.market === 'SGX')).toBe(true);
  });

  it('returns nothing when no stock passes the filters', () => {
    expect(buildBatch(input({ filters: { ...NO_FILTERS, sectors: ['Healthcare'], caps: ['small'] } }))).toEqual([]);
  });

  it('works with the default random source and date', () => {
    const { random: _r, today: _t, ...rest } = input();
    expect(buildBatch(rest)).toHaveLength(BATCH_SIZE);
  });
});

describe('passesFilters', () => {
  const nvda = sample('NVDA');
  const ok = (f: Partial<typeof NO_FILTERS>, s = nvda) => passesFilters(s, { ...NO_FILTERS, ...f }, ['US'], TODAY);

  it('filters by market', () => {
    expect(passesFilters(nvda, NO_FILTERS, ['SGX'], TODAY)).toBe(false);
  });

  it('filters by sector, size and theme', () => {
    expect(ok({ sectors: ['Technology'] })).toBe(true);
    expect(ok({ sectors: ['Energy'] })).toBe(false);
    expect(ok({ caps: ['mega'] })).toBe(true);
    expect(ok({ caps: ['small'] })).toBe(false);
    expect(ok({ themes: ['gaming'] })).toBe(true);
    expect(ok({ themes: ['banking'] })).toBe(false);
  });

  it('filters by upcoming earnings', () => {
    const f = { earningsWithinDays: 14 };
    expect(ok(f, withEarnings(nvda, '2026-11-10'))).toBe(true);
    expect(ok(f, withEarnings(nvda, '2026-11-04'))).toBe(true);
    expect(ok(f, withEarnings(nvda, '2026-12-31'))).toBe(false);
    expect(ok(f, withEarnings(nvda, '2026-11-01'))).toBe(false);
    expect(ok(f, withEarnings(nvda, null))).toBe(false);
  });
});
