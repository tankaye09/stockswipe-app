import { normalizeQuote, yahooSource, type YahooLike } from '../../../jobs/sync/yahoo';

const rawQuote = {
  symbol: 'AAPL',
  quoteType: 'EQUITY',
  longName: 'Apple Inc.',
  shortName: 'Apple',
  currency: 'USD',
  regularMarketPrice: 270.5,
  regularMarketChangePercent: -1.23,
  marketCap: 4e12,
  trailingPE: 36.1,
  dividendYield: 0.39,
  fiftyTwoWeekHigh: 280,
  fiftyTwoWeekLow: 170,
  earningsTimestamp: new Date('2026-10-30T20:30:00Z'),
  earningsTimestampStart: 1769716800,
  regularMarketTime: '2026-11-04T21:00:00Z',
};

function fakeYahoo(over: Partial<Record<keyof YahooLike, jest.Mock>> = {}): YahooLike {
  return {
    quote: jest.fn(async () => [rawQuote, null, { quoteType: 'EQUITY' }]),
    quoteSummary: jest.fn(async () => ({
      assetProfile: {
        sector: 'Technology',
        industry: 'Consumer Electronics',
        longBusinessSummary: ' Apple makes phones. ',
      },
    })),
    chart: jest.fn(async () => ({
      quotes: [
        { date: new Date('2026-11-03T14:30:00Z'), close: 268 },
        { date: new Date('2026-11-04T14:30:00Z'), close: null },
        { date: 'bad', close: 1 },
        { date: new Date('2026-11-05T14:30:00Z'), close: 0 },
      ],
    })),
    ...over,
  };
}

describe('normalizeQuote', () => {
  it('reads the fields the job uses', () => {
    expect(normalizeQuote(rawQuote)).toEqual({
      symbol: 'AAPL',
      quoteType: 'EQUITY',
      name: 'Apple Inc.',
      currency: 'USD',
      price: 270.5,
      changePct: -1.23,
      marketCap: 4e12,
      pe: 36.1,
      dividendYield: 0.39,
      high52: 280,
      low52: 170,
      earnings: [new Date('2026-10-30T20:30:00Z'), new Date(1769716800 * 1000)],
      time: new Date('2026-11-04T21:00:00Z'),
    });
  });

  it('copes with missing fields', () => {
    expect(normalizeQuote(null)).toBeNull();
    expect(normalizeQuote({ quoteType: 'EQUITY' })).toBeNull();
    expect(normalizeQuote({ symbol: 'X', shortName: 'Ex' })).toMatchObject({
      quoteType: 'NONE',
      name: 'Ex',
      price: null,
      earnings: [],
      time: null,
    });
  });
});

describe('yahooSource', () => {
  it('quotes in one call with validation off', async () => {
    const yf = fakeYahoo();
    const quotes = await yahooSource(yf).quotes(['AAPL', 'MSFT']);
    expect(yf.quote).toHaveBeenCalledWith(['AAPL', 'MSFT'], { return: 'array' }, { validateResult: false });
    expect(quotes.map((q) => q.symbol)).toEqual(['AAPL']);
    const odd = fakeYahoo({ quote: jest.fn(async () => ({})) });
    expect(await yahooSource(odd).quotes(['AAPL'])).toEqual([]);
  });

  it('reads the company profile', async () => {
    expect(await yahooSource(fakeYahoo()).profile('AAPL')).toEqual({
      sector: 'Technology',
      industry: 'Consumer Electronics',
      description: 'Apple makes phones.',
    });
    const bare = fakeYahoo({ quoteSummary: jest.fn(async () => ({ assetProfile: {} })) });
    expect(await yahooSource(bare).profile('X')).toEqual({ sector: null, industry: null, description: '' });
    const none = fakeYahoo({ quoteSummary: jest.fn(async () => null) });
    expect(await yahooSource(none).profile('X')).toBeNull();
  });

  it('keeps only usable daily closes', async () => {
    const from = new Date('2025-11-01');
    const yf = fakeYahoo();
    expect(await yahooSource(yf).history('AAPL', from)).toEqual([
      { date: new Date('2026-11-03T14:30:00Z'), close: 268 },
    ]);
    expect(yf.chart).toHaveBeenCalledWith('AAPL', { period1: from, interval: '1d' }, { validateResult: false });
    const empty = fakeYahoo({ chart: jest.fn(async () => null) });
    expect(await yahooSource(empty).history('AAPL', from)).toEqual([]);
  });
});
