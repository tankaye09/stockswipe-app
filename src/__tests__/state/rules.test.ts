import {
  applyPaperTrade,
  AD_EVERY_N_SWIPES,
  daysSince,
  FREE_DAILY_SWIPES,
  isoDate,
  portfolioValueUsd,
  positionPnl,
  shouldShowAd,
  STARTING_CASH_USD,
  swipesRemaining,
} from '../../state/rules';
import type { AppState } from '../../state/types';

const NOW = new Date('2026-11-20T10:00:00Z');
const fresh: AppState['paper'] = { cashUsd: STARTING_CASH_USD, positions: [], trades: [] };

describe('swipesRemaining', () => {
  const base = { premium: false, firstOpen: '2026-11-01', swipesToday: { date: '2026-11-20', count: 10 } };

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
    expect(shouldShowAd(false, 0)).toBe(false);
    expect(shouldShowAd(false, AD_EVERY_N_SWIPES - 1)).toBe(false);
    expect(shouldShowAd(false, AD_EVERY_N_SWIPES)).toBe(true);
    expect(shouldShowAd(false, AD_EVERY_N_SWIPES * 2)).toBe(true);
    expect(shouldShowAd(true, AD_EVERY_N_SWIPES)).toBe(false);
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
