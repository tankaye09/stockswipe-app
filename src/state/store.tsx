import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import type { Currency, Market, StockId, Theme } from '../data/types';
import type { BrokerId } from '../broker/brokers';
import type { Limits } from '../monetization/config';
import { NO_FILTERS, type FeedFilters } from '../feed/feedEngine';
import { parseSavedState } from './persist';
import { addToTop, applyPaperTrade, isoDate, SEEN_MEMORY, STARTING_CASH_USD, type TradeSide } from './rules';
import type { AppState, SwipeMode } from './types';

export const STORAGE_KEY = 'swipe-state-v1';

export const initialState = (): AppState => ({
  hydrated: false,
  onboarded: false,
  firstOpen: isoDate(),
  interests: [],
  markets: ['US'],
  filters: NO_FILTERS,
  swipeMode: 'save',
  broker: null,
  watchlist: [],
  traded: [],
  seen: [],
  swipesToday: { date: isoDate(), count: 0 },
  premium: false,
  remoteLimits: null,
  limitOverride: null,
  paper: { cashUsd: STARTING_CASH_USD, positions: [], trades: [] },
});

export type Action =
  | { type: 'hydrate'; state: Partial<AppState> }
  | { type: 'finishOnboarding'; interests: Theme[]; markets: Market[] }
  | { type: 'setInterests'; interests: Theme[] }
  | { type: 'setMarkets'; markets: Market[] }
  | { type: 'setFilters'; filters: FeedFilters }
  | { type: 'setSwipeMode'; mode: SwipeMode }
  | { type: 'setBroker'; broker: BrokerId | null }
  | { type: 'setPremium'; premium: boolean }
  | { type: 'setRemoteLimits'; limits: Partial<Limits> | null }
  | { type: 'setLimitOverride'; limits: Partial<Limits> | null }
  | { type: 'setUsage'; firstOpen?: string; swipesToday?: number }
  | { type: 'save'; id: StockId }
  | { type: 'unsave'; id: StockId }
  | { type: 'markTraded'; id: StockId }
  | { type: 'unmarkTraded'; id: StockId }
  | { type: 'markSeen'; id: StockId }
  | { type: 'countSwipe'; delta: 1 | -1 }
  | { type: 'paperTrade'; id: StockId; side: TradeSide; qty: number; price: number; currency: Currency }
  | { type: 'resetPaper' }
  | { type: 'resetAll' };

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'hydrate':
      return { ...state, ...action.state, hydrated: true };
    case 'finishOnboarding':
      return { ...state, onboarded: true, interests: action.interests, markets: action.markets };
    case 'setInterests':
      return { ...state, interests: action.interests };
    case 'setMarkets':
      return { ...state, markets: action.markets.length ? action.markets : ['US'] };
    case 'setFilters':
      return { ...state, filters: action.filters };
    case 'setSwipeMode':
      return { ...state, swipeMode: action.mode };
    case 'setBroker':
      return { ...state, broker: action.broker };
    case 'setPremium':
      return { ...state, premium: action.premium };
    case 'setRemoteLimits':
      return { ...state, remoteLimits: action.limits };
    case 'setLimitOverride':
      return { ...state, limitOverride: action.limits };
    case 'setUsage':
      return {
        ...state,
        firstOpen: action.firstOpen ?? state.firstOpen,
        swipesToday:
          action.swipesToday == null ? state.swipesToday : { date: isoDate(), count: Math.max(0, action.swipesToday) },
      };
    case 'save':
      return state.watchlist.includes(action.id)
        ? state
        : { ...state, watchlist: addToTop(state.watchlist, action.id) };
    case 'unsave':
      return { ...state, watchlist: state.watchlist.filter((w) => w !== action.id) };
    case 'markTraded':
      return state.traded.includes(action.id) ? state : { ...state, traded: addToTop(state.traded, action.id) };
    case 'unmarkTraded':
      return { ...state, traded: state.traded.filter((t) => t !== action.id) };
    case 'markSeen':
      return { ...state, seen: [action.id, ...state.seen.filter((s) => s !== action.id)].slice(0, SEEN_MEMORY) };
    case 'countSwipe': {
      const today = isoDate();
      const count = state.swipesToday.date === today ? state.swipesToday.count : 0;
      return { ...state, swipesToday: { date: today, count: Math.max(0, count + action.delta) } };
    }
    case 'paperTrade': {
      const res = applyPaperTrade(state.paper, action, action.currency);
      if (!res.ok) return state;
      const trade = {
        id: action.id,
        side: action.side,
        qty: action.qty,
        price: action.price,
        at: new Date().toISOString(),
      };
      // A traded stock is kept under Trades in Needles, so it is easy to find again.
      return {
        ...state,
        traded: addToTop(state.traded, action.id),
        paper: { cashUsd: res.cashUsd, positions: res.positions, trades: [trade, ...state.paper.trades].slice(0, 200) },
      };
    }
    case 'resetPaper':
      return { ...state, paper: initialState().paper };
    case 'resetAll':
      return { ...initialState(), hydrated: true };
  }
}

const Ctx = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => dispatch({ type: 'hydrate', state: parseSavedState(raw) }))
      .catch(() => dispatch({ type: 'hydrate', state: {} }));
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    const { hydrated: _hydrated, ...rest } = state;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rest)).catch(() => {});
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  // Render nothing until saved state is loaded, so screens never start from defaults.
  if (!state.hydrated) return null;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppState must be used inside AppStateProvider');
  return ctx;
}
