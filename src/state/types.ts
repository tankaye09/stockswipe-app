import type { Market, StockId, Theme } from '../data/types';
import type { FeedFilters } from '../feed/feedEngine';
import type { BrokerId } from '../broker/brokers';
import type { Limits } from '../monetization/config';

/** What a right-swipe does. */
export type SwipeMode = 'save' | 'trade';

export interface Position {
  id: StockId;
  /** Positive = long, negative = short. */
  qty: number;
  /** Average entry price, in the stock's own currency. */
  avgPrice: number;
}

export interface PaperTrade {
  id: StockId;
  side: 'buy' | 'sell' | 'short' | 'cover';
  qty: number;
  price: number;
  /** ISO timestamp */
  at: string;
}

export interface AppState {
  hydrated: boolean;
  onboarded: boolean;
  /** ISO date of first launch, used for the 7-day unlimited period. */
  firstOpen: string;
  interests: Theme[];
  markets: Market[];
  filters: FeedFilters;
  swipeMode: SwipeMode;
  broker: BrokerId | null;
  watchlist: StockId[];
  /** Recently shown, so the feed avoids repeats. Capped. */
  seen: StockId[];
  swipesToday: { date: string; count: number };
  /** Premium is active. Set by a purchase, and kept in sync with the store on launch. */
  premium: boolean;
  /** Limits set for everyone in the RevenueCat dashboard, cached from the last launch. */
  remoteLimits: Partial<Limits> | null;
  /** Limits set on this device from the admin page. Wins over everything else. */
  limitOverride: Partial<Limits> | null;
  paper: {
    /** Virtual cash in USD. SGX trades convert at a fixed sample rate. */
    cashUsd: number;
    positions: Position[];
    trades: PaperTrade[];
  };
}
