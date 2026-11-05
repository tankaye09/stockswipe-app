import {
  applyPaperTrade,
  cleanLimits,
  daysSince,
  effectiveLimits,
  freeDaysLeft,
  isoDate,
  MAX_LIMIT,
  portfolioValueUsd,
  positionPnl,
  shouldShowAd,
  STARTING_CASH_USD,
  swipesRemaining,
  trialEndedFirstOpen,
} from '../../state/rules';
import { DEFAULT_LIMITS } from '../../monetization/config';
import type { AppState } from '../../state/types';

const NOW = new Date('2026-11-20T10:00:00Z');
const fresh: AppState['paper'] = { cashUsd: STARTING_CASH_USD, positions: [], trades: [] };

describe('swipesRemaining', () => {
  const base = {
    premium: false,
    firstOpen: '2026-11-01',
    swipesToday: { date: '2026-11-20', count: 10 },
    remoteLimits: null,
    limitOverride: null,
  };
  const FREE_DAILY_SWIPES = DEFAULT_LIMITS.dailySwipes;

  it('is unlimited for Premium', () => {
    expect(swipesRemaining({ ...base, premium: true }, NOW)).toBe(Infinity);
  });

  it('is unlimited during the first 7 days', () => {
    expect(swipesRemaining({ ...base, firstOpen: '2026-11-14' }, NOW)).toBe(Infinity);
  });

  it('counts down from the daily cap after that', () => {
    expect(swipesRemaining(base, NOW)).toBe(FREE_DAILY_SWIPES - 10);
    expect(swipesRemaining({ ...base, swipesToday: { date: '2026-11-20', count: 999 } }, NOW)).toBe(0);
  });

  it('resets on a new day', () => {
    expect(swipesRemaining({ ...base, swipesToday: { date: '2026-11-19', count: 50 } }, NOW)).toBe(FREE_DAILY_SWIPES);
  });

  it('defaults to the current date', () => {
    expect(swipesRemaining({ ...base, firstOpen: isoDate() })).toBe(Infinity);
  });

  it('uses dashboard limits, and the device override over those', () => {
    const remote = { ...base, remoteLimits: { dailySwipes: 20 } };
    expect(swipesRemaining(remote, NOW)).toBe(10);
    expect(swipesRemaining({ ...remote, limitOverride: { dailySwipes: 15 } }, NOW)).toBe(5);
    // A longer trial from the dashboard makes the user unlimited again.
    expect(swipesRemaining({ ...base, remoteLimits: { freeDays: 30 } }, NOW)).toBe(Infinity);
  });
});

describe('freeDaysLeft', () => {
  const base = { premium: false, firstOpen: '2026-11-18', remoteLimits: null, limitOverride: null };
  it('counts down the free days', () => {
    expect(freeDaysLeft(base, NOW)).toBe(DEFAULT_LIMITS.freeDays - 2);
    expect(freeDaysLeft({ ...base, firstOpen: '2020-01-01' }, NOW)).toBe(0);
    expect(freeDaysLeft({ ...base, limitOverride: { freeDays: 0 } }, NOW)).toBe(0);
    expect(freeDaysLeft({ ...base, premium: true }, NOW)).toBe(0);
    expect(freeDaysLeft({ ...base, firstOpen: isoDate() })).toBe(DEFAULT_LIMITS.freeDays);
  });

  it('trialEndedFirstOpen puts the trial just behind us', () => {
    expect(trialEndedFirstOpen(7, NOW)).toBe('2026-11-12');
    expect(freeDaysLeft({ ...base, firstOpen: trialEndedFirstOpen(7, NOW) }, NOW)).toBe(0);
    expect(trialEndedFirstOpen(0)).toBe(isoDate(new Date(Date.now() - 86400000)));
  });
});

describe('limits', () => {
  it('cleanLimits keeps only sensible whole numbers for known keys', () => {
    expect(cleanLimits(null)).toEqual({});
    expect(cleanLimits('7')).toEqual({});
    expect(cleanLimits({ freeDays: '3', dailySwipes: 0, adEvery: '', other: 5 })).toEqual({
      freeDays: 3,
      dailySwipes: 0,
    });
    expect(cleanLimits({ freeDays: -1, dailySwipes: 2.5, adEvery: MAX_LIMIT + 1 })).toEqual({});
    expect(cleanLimits({ freeDays: 'abc', dailySwipes: true, adEvery: ' ' })).toEqual({});
  });

  it('effectiveLimits layers defaults, dashboard and device override', () => {
    expect(effectiveLimits({ remoteLimits: null, limitOverride: null })).toEqual(DEFAULT_LIMITS);
    expect(
      effectiveLimits({ remoteLimits: { freeDays: 3, dailySwipes: 30 }, limitOverride: { dailySwipes: 5 } }),
    ).toEqual({ ...DEFAULT_LIMITS, freeDays: 3, dailySwipes: 5 });
  });
});

describe('daysSince / isoDate', () => {
  it('counts whole days', () => {
    expect(daysSince('2026-11-13', NOW)).toBe(7);
    expect(isoDate(NOW)).toBe('2026-11-20');
    expect(daysSince(isoDate())).toBe(0);
  });
});

describe('shouldShowAd', () => {
  it('shows an ad every N swipes for free users only', () => {
    expect(shouldShowAd(false, 0, 10)).toBe(false);
    expect(shouldShowAd(false, 9, 10)).toBe(false);
    expect(shouldShowAd(false, 10, 10)).toBe(true);
    expect(shouldShowAd(false, 20, 10)).toBe(true);
    expect(shouldShowAd(true, 10, 10)).toBe(false);
    expect(shouldShowAd(false, 3, 3)).toBe(true);
  });

  it('never shows ads when the interval is 0', () => {
    expect(shouldShowAd(false, 10, 0)).toBe(false);
  });
});

describe('applyPaperTrade', () => {
  const id = 'US:AAPL' as const;

  it('buys and sells at a profit', () => {
    const bought = applyPaperTrade(fresh, { id, side: 'buy', qty: 10, price: 100 }, 'USD');
    expect(bought).toMatchObject({ ok: true, cashUsd: 99_000, positions: [{ id, qty: 10, avgPrice: 100 }] });

    const more = applyPaperTrade({ ...fresh, ...bought }, { id, side: 'buy', qty: 10, price: 120 }, 'USD');
    expect(more.positions[0]).toEqual({ id, qty: 20, avgPrice: 110 });

    const sold = applyPaperTrade({ ...fresh, ...more }, { id, side: 'sell', qty: 20, price: 130 }, 'USD');
    expect(sold).toMatchObject({ ok: true, cashUsd: 100_400, positions: [] });
  });

  it('shorts and covers, profiting when the price falls', () => {
    const shorted = applyPaperTrade(fresh, { id, side: 'short', qty: 10, price: 100 }, 'USD');
    expect(shorted).toMatchObject({ ok: true, cashUsd: 99_000, positions: [{ id, qty: -10, avgPrice: 100 }] });

    const partly = applyPaperTrade({ ...fresh, ...shorted }, { id, side: 'cover', qty: 4, price: 80 }, 'USD');
    expect(partly).toMatchObject({ ok: true, cashUsd: 99_000 + 400 + 80, positions: [{ id, qty: -6 }] });
  });

  it('loses money on a short when the price rises', () => {
    const shorted = applyPaperTrade(fresh, { id, side: 'short', qty: 10, price: 100 }, 'USD');
    const covered = applyPaperTrade({ ...fresh, ...shorted }, { id, side: 'cover', qty: 10, price: 150 }, 'USD');
    expect(covered.cashUsd).toBe(99_500);
  });

  it('converts SGD trades to USD cash', () => {
    const r = applyPaperTrade(fresh, { id: 'SGX:D05', side: 'buy', qty: 100, price: 50 }, 'SGD');
    expect(r.cashUsd).toBe(STARTING_CASH_USD - 100 * 50 * 0.77);
  });

  it('keeps other positions untouched', () => {
    const paper = { ...fresh, positions: [{ id: 'US:MSFT' as const, qty: 1, avgPrice: 10 }] };
    const r = applyPaperTrade(paper, { id, side: 'buy', qty: 1, price: 1 }, 'USD');
    expect(r.positions).toHaveLength(2);
  });

  it.each([
    [{ side: 'buy', qty: 0 }, 'Enter a quantity above zero.'],
    [{ side: 'buy', qty: NaN }, 'Enter a quantity above zero.'],
    [{ side: 'buy', qty: Infinity }, 'Enter a quantity above zero.'],
    [{ side: 'buy', qty: 10_000 }, 'Not enough virtual cash.'],
    [{ side: 'sell', qty: 1 }, "You don't hold that many shares."],
    [{ side: 'cover', qty: 1 }, 'Your short is smaller than that.'],
  ] as const)('rejects %o', (t, error) => {
    const r = applyPaperTrade(fresh, { id, price: 100, ...t }, 'USD');
    expect(r).toEqual({ ok: false, error, cashUsd: STARTING_CASH_USD, positions: [] });
  });

  it('will not mix long and short in one stock', () => {
    const long = { ...fresh, positions: [{ id, qty: 5, avgPrice: 10 }] };
    expect(applyPaperTrade(long, { id, side: 'short', qty: 1, price: 10 }, 'USD').error).toBe(
      'Sell your shares before shorting.',
    );
    const short = { ...fresh, positions: [{ id, qty: -5, avgPrice: 10 }] };
    expect(applyPaperTrade(short, { id, side: 'buy', qty: 1, price: 10 }, 'USD').error).toBe(
      'Cover your short before buying.',
    );
  });
});

describe('positionPnl / portfolioValueUsd', () => {
  it('values long and short positions', () => {
    expect(positionPnl({ id: 'US:A', qty: 10, avgPrice: 100 }, 110)).toBe(100);
    expect(positionPnl({ id: 'US:A', qty: -10, avgPrice: 100 }, 110)).toBe(-100);

    const paper: AppState['paper'] = {
      cashUsd: 1000,
      trades: [],
      positions: [
        { id: 'US:A', qty: 10, avgPrice: 100 },
        { id: 'SGX:B', qty: -10, avgPrice: 10 },
        { id: 'US:MISSING', qty: 1, avgPrice: 1 },
      ],
    };
    const value = portfolioValueUsd(paper, {
      'US:A': { price: 110, currency: 'USD' },
      'SGX:B': { price: 8, currency: 'SGD' },
    });
    // 1000 + (1000 + 100) + (100 + 20) * 0.77
    expect(value).toBeCloseTo(2192.4, 2);
  });
});
