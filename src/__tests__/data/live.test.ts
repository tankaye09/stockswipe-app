/* eslint-disable @typescript-eslint/no-require-imports -- jest.isolateModules needs require() */
import { liveConfig } from '../../data/config';
import { restRoot, rowToSummary, type CardRow } from '../../data/live/rows';
import { createSupabaseProvider, PAGE_SIZE } from '../../data/live/supabaseProvider';

const row = (over: Partial<CardRow> = {}): CardRow => ({
  id: 'SGX:D05',
  market: 'SGX',
  symbol: 'D05',
  name: 'DBS Group Holdings Ltd',
  currency: 'SGD',
  sector: 'Financials',
  themes: ['banking', 'dividends'],
  cap_bucket: 'large',
  price: 52.1,
  change_pct: -0.5,
  market_cap: 150e9,
  pe_ratio: 11.2,
  dividend_yield: 5.6,
  week52_high: 55,
  week52_low: 40,
  next_earnings: '2027-02-10',
  one_liner: 'DBS is a bank.',
  summary: 'It lends money.',
  what_they_do: '',
  how_they_make_money: '',
  why_people_watch: '',
  risks_to_know: '',
  ...over,
});

describe('liveConfig', () => {
  it('turns on live data only with the source, URL and key all set', () => {
    expect(liveConfig('live', ' https://db.example.co ', ' anon ')).toEqual({
      url: 'https://db.example.co',
      anonKey: 'anon',
    });
    expect(liveConfig(undefined, 'https://db.example.co', 'anon')).toBeNull();
    expect(liveConfig('mock', 'https://db.example.co', 'anon')).toBeNull();
    expect(liveConfig('live', '', 'anon')).toBeNull();
    expect(liveConfig('live', 'https://db.example.co', undefined)).toBeNull();
  });
});

describe('restRoot', () => {
  it.each([
    'https://abc.supabase.co',
    'https://abc.supabase.co/',
    'https://abc.supabase.co/rest/v1',
    ' https://abc.supabase.co/rest/v1/ ',
  ])('accepts %s', (url) => expect(restRoot(url)).toBe('https://abc.supabase.co/rest/v1'));
});

describe('rowToSummary', () => {
  it('maps a database row onto the card shape', () => {
    expect(rowToSummary(row())).toEqual({
      symbol: 'D05',
      market: 'SGX',
      currency: 'SGD',
      name: 'DBS Group Holdings Ltd',
      sector: 'Financials',
      themes: ['banking', 'dividends'],
      capBucket: 'large',
      price: 52.1,
      changePct: -0.5,
      stats: {
        marketCap: 150e9,
        peRatio: 11.2,
        dividendYield: 5.6,
        week52High: 55,
        week52Low: 40,
        nextEarnings: '2027-02-10',
      },
      breakdown: {
        oneLiner: 'DBS is a bank.',
        whatTheyDo: 'It lends money.',
        howTheyMakeMoney: '',
        whyPeopleWatch: '',
        risksToKnow: '',
      },
      news: [],
    });
  });

  it('uses the written breakdown when there is one', () => {
    expect(
      rowToSummary(
        row({
          what_they_do: 'Runs a bank.',
          how_they_make_money: 'Interest.',
          why_people_watch: 'Dividends.',
          risks_to_know: 'Bad loans.',
        }),
      ).breakdown,
    ).toEqual({
      oneLiner: 'DBS is a bank.',
      whatTheyDo: 'Runs a bank.',
      howTheyMakeMoney: 'Interest.',
      whyPeopleWatch: 'Dividends.',
      risksToKnow: 'Bad loans.',
    });
    const old = rowToSummary({
      ...row(),
      how_they_make_money: undefined,
      why_people_watch: undefined,
      risks_to_know: undefined,
    } as unknown as CardRow);
    expect(old.breakdown.howTheyMakeMoney).toBe('');
  });

  it('copes with gaps and unknown values', () => {
    const s = rowToSummary(
      row({
        sector: 'Space' as CardRow['sector'],
        themes: ['ai', 'moon' as CardRow['themes'][number]],
        price: '12.5' as unknown as number,
        change_pct: null as unknown as number,
        market_cap: null as unknown as number,
        pe_ratio: null,
        dividend_yield: null,
        week52_high: null,
        week52_low: null,
        next_earnings: null,
        description: 'The full description.',
      }),
    );
    expect(s).toMatchObject({ sector: 'Industrials', themes: ['ai'], price: 12.5, changePct: 0 });
    expect(s.stats).toEqual({
      marketCap: 0,
      peRatio: null,
      dividendYield: null,
      week52High: 12.5,
      week52Low: 12.5,
      nextEarnings: null,
    });
    expect(s.breakdown.whatTheyDo).toBe('The full description.');
    expect(rowToSummary(row({ price: null, themes: undefined as unknown as [] })).price).toBe(0);
  });
});

function fakeFetch(bodies: unknown[]) {
  const urls: string[] = [];
  const headers: Record<string, string>[] = [];
  const fn = jest.fn(async (url: string, init: RequestInit) => {
    urls.push(decodeURIComponent(url));
    headers.push(init.headers as Record<string, string>);
    const body = bodies.shift();
    return { ok: body !== 'error', status: body === 'error' ? 500 : 200, json: async () => body };
  });
  return { fn: fn as unknown as typeof fetch, urls, headers };
}

const today = () => new Date('2026-11-05T12:00:00Z');

describe('createSupabaseProvider', () => {
  it('loads the universe page by page with the read-only key', async () => {
    const page = Array.from({ length: PAGE_SIZE }, (_, i) => row({ id: `SGX:S${i}`, symbol: `S${i}` }));
    const { fn, urls, headers } = fakeFetch([page, [row()], [row({ id: 'US:A', market: 'US', symbol: 'A' })]]);
    const p = createSupabaseProvider('https://db.example.co/', 'anon', fn, today);
    const list = await p.listUniverse(['US', 'SGX']);
    expect(list).toHaveLength(PAGE_SIZE + 2);
    const columns =
      'select=id,market,symbol,name,currency,sector,themes,cap_bucket,price,change_pct,market_cap,pe_ratio,' +
      'dividend_yield,week52_high,week52_low,next_earnings,one_liner,summary,what_they_do,how_they_make_money,' +
      'why_people_watch,risks_to_know';
    // Stocks with a written breakdown first; US has none yet, so all US stocks.
    expect(urls[0]).toBe(
      `https://db.example.co/rest/v1/stocks?${columns}&market=in.(US,SGX)` +
        '&price=not.is.null&sector=not.is.null&breakdown_at=not.is.null&order=id',
    );
    expect(urls[2]).toBe(
      `https://db.example.co/rest/v1/stocks?${columns}&market=in.(US)&price=not.is.null&sector=not.is.null&order=id`,
    );
    expect(headers[0]).toEqual({ apikey: 'anon', Authorization: 'Bearer anon', Range: '0-999' });
    expect(headers[1].Range).toBe(`${PAGE_SIZE}-${2 * PAGE_SIZE - 1}`);
    expect(await p.listUniverse([])).toEqual([]);
    const one = fakeFetch([[row()]]);
    const sgxOnly = createSupabaseProvider('https://db.example.co', 'anon', one.fn, today);
    expect(await sgxOnly.listUniverse(['SGX'])).toHaveLength(1);
    expect(one.fn).toHaveBeenCalledTimes(1);
    expect(p.markets).toEqual(['US', 'SGX']);
  });

  it('gets one stock with its full description', async () => {
    const { fn, urls, headers } = fakeFetch([[row({ description: 'Long text.' })], [], [row({ price: null })]]);
    const p = createSupabaseProvider('https://db.example.co', 'anon', fn, today);
    expect((await p.getStock('SGX:D05'))?.breakdown.whatTheyDo).toBe('Long text.');
    expect(urls[0]).toBe('https://db.example.co/rest/v1/stocks?select=*&id=eq.SGX:D05');
    expect(headers[0]).toEqual({ apikey: 'anon', Authorization: 'Bearer anon' });
    expect(await p.getStock('US:NOPE')).toBeNull();
    expect(await p.getStock('SGX:D05')).toBeNull();
  });

  it('gets price history for a range', async () => {
    const { fn, urls } = fakeFetch([[{ date: '2026-11-04', close: '51.5' }]]);
    const p = createSupabaseProvider('https://db.example.co', 'anon', fn, today);
    expect(await p.getHistory('SGX:D05', '6M')).toEqual([{ date: '2026-11-04', close: 51.5 }]);
    expect(urls[0]).toBe(
      'https://db.example.co/rest/v1/daily_prices?select=date,close&stock_id=eq.SGX:D05&date=gte.2026-05-06&order=date.asc',
    );
  });

  it('gets quotes for several stocks', async () => {
    const { fn, urls } = fakeFetch([
      [
        { id: 'SGX:D05', price: 52.1, change_pct: -0.5 },
        { id: 'US:GONE', price: null, change_pct: 0 },
      ],
    ]);
    const p = createSupabaseProvider('https://db.example.co', 'anon', fn, today);
    expect(await p.getQuotes(['SGX:D05', 'US:GONE'])).toEqual({ 'SGX:D05': { price: 52.1, changePct: -0.5 } });
    expect(urls[0]).toBe('https://db.example.co/rest/v1/stocks?select=id,price,change_pct&id=in.("SGX:D05","US:GONE")');
    expect(await p.getQuotes([])).toEqual({});
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('reports a failed request', async () => {
    const { fn } = fakeFetch(['error']);
    await expect(createSupabaseProvider('https://db.example.co', 'anon', fn).getStock('US:A')).rejects.toThrow(
      'Stock data request failed (500)',
    );
  });

  it('uses the global fetch by default', async () => {
    const spy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, json: async () => [] } as unknown as Response);
    expect(await createSupabaseProvider('https://db.example.co', 'anon').getStock('US:A')).toBeNull();
    expect(await createSupabaseProvider('https://db.example.co', 'anon').getHistory('US:A', '1M')).toEqual([]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('data source switch', () => {
  const env = process.env;
  afterEach(() => {
    process.env = env;
  });

  it('uses the database when live data is configured', () => {
    process.env = {
      ...env,
      EXPO_PUBLIC_DATA_SOURCE: 'live',
      EXPO_PUBLIC_SUPABASE_URL: 'https://db.example.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon',
    };
    jest.isolateModules(() => {
      const data = require('../../data') as typeof import('../../data');
      const config = require('../../data/config') as typeof import('../../data/config');
      expect(data.USING_SAMPLE_DATA).toBe(false);
      expect(data.DATA_NOTE).toMatch(/end-of-day data from public sources/);
      expect(config.DATA_SOURCE).toBe('live');
    });
  });

  it('uses sample data otherwise', () => {
    jest.isolateModules(() => {
      const config = require('../../data/config') as typeof import('../../data/config');
      expect(config.DATA_SOURCE).toBe('mock');
      expect((require('../../data') as typeof import('../../data')).DATA_NOTE).toBe('Prices shown are sample data.');
    });
  });
});
