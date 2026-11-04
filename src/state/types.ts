import type { Market, StockId, Theme } from '../data/types';
import type { FeedFilters } from '../feed/feedEngine';
import type { BrokerId } from '../broker/brokers';

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
  /** Placeholder until real in-app purchase is wired up. */
  premium: boolean;
  paper: {
    /** Virtual cash in USD. SGX trades convert at a fixed sample rate. */
    cashUsd: number;
    positions: Position[];
    trades: PaperTrade[];
  };
}
