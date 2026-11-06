import { initialState } from '../../state/store';
import { isStockId, parseSavedState, parseStockIdParam } from '../../state/persist';

const { hydrated: _h, ...valid } = {
  ...initialState(),
  onboarded: true,
  interests: ['ai', 'ev'],
  markets: ['US', 'SGX'],
  filters: { sectors: ['Technology'], caps: ['mega'], themes: ['ai'], earningsWithinDays: 14 },
  swipeMode: 'trade',
  broker: 'tiger',
  watchlist: ['US:AAPL', 'SGX:D05'],
  traded: ['US:AAPL'],
  seen: ['US:BRK.B'],
  swipesToday: { date: '2026-11-04', count: 3 },
  remoteLimits: { freeDays: 3, dailySwipes: 40 },
  limitOverride: { adEvery: 0 },
  paper: {
    cashUsd: 90_000,
    positions: [{ id: 'US:AAPL', qty: -2, avgPrice: 200 }],
    trades: [{ id: 'US:AAPL', side: 'short', qty: 2, price: 200, at: '2026-11-04T10:00:00.000Z' }],
  },
};

describe('parseSavedState', () => {
  it('keeps a valid saved state as it is', () => {
    expect(parseSavedState(JSON.stringify(valid))).toEqual(valid);
  });

  it.each([null, '', 'not json', '[]', 'null', '42', '"text"'])('returns nothing for %p', (raw) => {
    expect(parseSavedState(raw)).toEqual({});
  });

  it('ignores unknown keys, including prototype tricks', () => {
    const out = parseSavedState('{"hydrated":true,"__proto__":{"premium":true},"extra":1,"onboarded":true}');
    expect(out).toEqual({ onboarded: true });
    expect(({} as { premium?: boolean }).premium).toBeUndefined();
  });

  it.each<[string, unknown]>([
    ['onboarded', 'yes'],
    ['firstOpen', 'yesterday'],
    ['interests', ['ai', 'crypto']],
    ['interests', 'ai'],
    ['markets', []],
    ['markets', ['HK']],
    ['filters', null],
    ['filters', { sectors: [], caps: ['huge'], themes: [], earningsWithinDays: null }],
    ['filters', { sectors: [], caps: [], themes: [], earningsWithinDays: 'soon' }],
    ['swipeMode', 'buy'],
    ['broker', 'robinhood'],
    ['watchlist', ['AAPL']],
    ['watchlist', Array.from({ length: 1001 }, () => 'US:AAPL')],
    ['traded', ['US:']],
    ['seen', [null]],
    ['swipesToday', { date: '2026-11-04', count: -1 }],
    ['swipesToday', { date: 'today', count: 1 }],
    ['premium', 1],
    ['remoteLimits', { dailySwipes: -5 }],
    ['remoteLimits', { dailySwipes: 10, hack: 1 }],
    ['limitOverride', 'unlimited'],
    ['paper', { cashUsd: 'lots', positions: [], trades: [] }],
    ['paper', { cashUsd: 1, positions: [{ id: 'US:AAPL', qty: 1 }], trades: [] }],
    ['paper', { cashUsd: 1, positions: [], trades: [{ id: 'US:AAPL', side: 'gift', qty: 1, price: 1, at: '' }] }],
    ['paper', { cashUsd: 1, positions: [], trades: [{ id: 'US:AAPL', side: 'buy', qty: 1, price: 1 }] }],
  ])('drops a bad %s and keeps the rest', (key, value) => {
    const out = parseSavedState(JSON.stringify({ ...valid, [key]: value }));
    expect(out).not.toHaveProperty(key);
    expect(out.onboarded ?? out.firstOpen).toBeTruthy();
  });

  it('accepts no broker and no earnings filter', () => {
    const state = {
      ...valid,
      broker: null,
      remoteLimits: null,
      limitOverride: null,
      filters: { ...valid.filters, earningsWithinDays: null },
    };
    expect(parseSavedState(JSON.stringify(state))).toEqual(state);
  });
});

describe('stock ids from route params', () => {
  it.each(['US:AAPL', 'SGX:D05', 'SGX:C38U', 'US:BRK.B'])('accepts %s', (id) => {
    expect(isStockId(id)).toBe(true);
    expect(parseStockIdParam(encodeURIComponent(id))).toBe(id);
  });

  it.each([undefined, 42, '', 'AAPL', 'HK:0700', 'US:aapl', 'US:<script>', 'US:WAYTOOLONGSYMBOL', '%E0%A4%A'])(
    'rejects %p',
    (param) => {
      expect(parseStockIdParam(param)).toBeNull();
    },
  );
});
