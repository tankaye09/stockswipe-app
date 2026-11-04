// Business rules kept as pure functions so they're easy to test and tweak.
import type { Currency } from '../data/types';
import type { AppState, PaperTrade, Position } from './types';

export const FREE_DAYS = 7;
export const FREE_DAILY_SWIPES = 50;
export const AD_EVERY_N_SWIPES = 10;
export const STARTING_CASH_USD = 100_000;
export const SEEN_MEMORY = 60;

/** Fixed sample FX rate. Replace with a live rate with the real data provider. */
export const FX_TO_USD: Record<Currency, number> = { USD: 1, SGD: 0.77 };

export const isoDate = (d = new Date()) => d.toISOString().slice(0, 10);

export function daysSince(iso: string, now = new Date()) {
  return Math.floor((new Date(isoDate(now)).getTime() - new Date(iso).getTime()) / 86400000);
}

/** Swipes left today, or Infinity when unlimited. */
export function swipesRemaining(state: Pick<AppState, 'premium' | 'firstOpen' | 'swipesToday'>, now = new Date()) {
  if (state.premium) return Infinity;
  if (daysSince(state.firstOpen, now) < FREE_DAYS) return Infinity;
  const used = state.swipesToday.date === isoDate(now) ? state.swipesToday.count : 0;
  return Math.max(0, FREE_DAILY_SWIPES - used);
}

export function shouldShowAd(premium: boolean, swipesThisSession: number) {
  return !premium && swipesThisSession > 0 && swipesThisSession % AD_EVERY_N_SWIPES === 0;
}

export type TradeSide = PaperTrade['side'];

export interface TradeResult {
  ok: boolean;
  error?: string;
  cashUsd: number;
  positions: Position[];
}

/**
 * Applies a paper trade. Long and short both use cash as collateral:
 * buying or shorting reduces cash by the trade value, and selling or covering
 * returns cash plus or minus the profit.
 */
export function applyPaperTrade(
  paper: AppState['paper'],
  trade: Omit<PaperTrade, 'at'>,
  currency: Currency,
): TradeResult {
  const fail = (error: string): TradeResult => ({
    ok: false,
    error,
    cashUsd: paper.cashUsd,
    positions: paper.positions,
  });
  if (!(trade.qty > 0) || !Number.isFinite(trade.qty)) return fail('Enter a quantity above zero.');
  const fx = FX_TO_USD[currency];
  const valueUsd = trade.qty * trade.price * fx;
  const existing = paper.positions.find((p) => p.id === trade.id);
  const held = existing?.qty ?? 0;
  let cash = paper.cashUsd;
  let qty = held;
  let avg = existing?.avgPrice ?? 0;

  switch (trade.side) {
    case 'buy':
    case 'short': {
      if (trade.side === 'buy' && held < 0) return fail('Cover your short before buying.');
      if (trade.side === 'short' && held > 0) return fail('Sell your shares before shorting.');
      if (valueUsd > cash) return fail('Not enough virtual cash.');
      const sign = trade.side === 'buy' ? 1 : -1;
      const absHeld = Math.abs(held);
      avg = (absHeld * avg + trade.qty * trade.price) / (absHeld + trade.qty);
      qty = held + sign * trade.qty;
      cash -= valueUsd;
      break;
    }
    case 'sell':
    case 'cover': {
      const sign = trade.side === 'sell' ? 1 : -1;
      if (sign * held < trade.qty)
        return fail(trade.side === 'sell' ? "You don't hold that many shares." : 'Your short is smaller than that.');
      // Return the collateral plus profit (long) or minus loss (short).
      const pnlUsd = sign * (trade.price - avg) * trade.qty * fx;
      cash += avg * trade.qty * fx + pnlUsd;
      qty = held - sign * trade.qty;
      break;
    }
  }

  const others = paper.positions.filter((p) => p.id !== trade.id);
  const positions = qty === 0 ? others : [...others, { id: trade.id, qty, avgPrice: +avg.toFixed(4) }];
  return { ok: true, cashUsd: +cash.toFixed(2), positions };
}

/** Unrealised profit or loss for one position, in its own currency. */
export const positionPnl = (p: Position, price: number) => (price - p.avgPrice) * p.qty;

/**
 * Total paper account value in USD: cash plus, for each position, the cash it
 * tied up plus its unrealised profit or loss.
 */
export function portfolioValueUsd(
  paper: AppState['paper'],
  quotes: Record<string, { price: number; currency: Currency }>,
): number {
  let total = paper.cashUsd;
  for (const p of paper.positions) {
    const q = quotes[p.id];
    if (!q) continue;
    const fx = FX_TO_USD[q.currency];
    total += (Math.abs(p.qty) * p.avgPrice + positionPnl(p, q.price)) * fx;
  }
  return +total.toFixed(2);
}
