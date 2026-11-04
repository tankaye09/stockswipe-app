import { useEffect, useRef, useState } from 'react';
import { marketData, stockId, type Market, type StockId, type StockSummary } from '../data';
import { useAppState } from '../state/store';
import { shouldShowAd, swipesRemaining } from '../state/rules';
import { buildBatch, type FeedItem } from './feedEngine';

export type DeckItem =
  | { kind: 'stock'; key: string; item: FeedItem }
  | { kind: 'ad'; key: string }
  | { kind: 'limit'; key: string }
  | { kind: 'empty'; key: string };

const REFILL_BELOW = 3;
let keySeq = 0;
const nextKey = (p: string) => `${p}-${++keySeq}`;

const queuedIds = (q: DeckItem[]): StockId[] => q.flatMap((d) => (d.kind === 'stock' ? [d.item.id] : []));

/** Loads every stock the feed may show for the chosen markets. Null while loading. */
export function useUniverse(markets: Market[]): StockSummary[] | null {
  const key = markets.join(',');
  const [loaded, setLoaded] = useState<{ key: string; list: StockSummary[] } | null>(null);
  useEffect(() => {
    let live = true;
    marketData.listUniverse(key.split(',') as Market[]).then((list) => live && setLoaded({ key, list }));
    return () => {
      live = false;
    };
  }, [key]);
  return loaded?.key === key ? loaded.list : null;
}

/**
 * Owns the card queue for one feed session: builds batches, tops them up,
 * and inserts ads and the daily-limit card. Remount (via `key`) to start over
 * when filters, interests or markets change.
 */
export function useFeed(universe: StockSummary[]) {
  const { state } = useAppState();
  const sessionSwipes = useRef(0);

  const makeBatch = (alsoSeen: StockId[]): DeckItem[] =>
    buildBatch({
      universe,
      markets: state.markets,
      interests: state.interests,
      saved: universe.filter((s) => state.watchlist.includes(stockId(s))),
      seen: new Set([...state.seen, ...alsoSeen]),
      filters: state.filters,
    }).map((item) => ({ kind: 'stock', key: nextKey(item.id), item }));

  const [queue, setQueue] = useState<DeckItem[]>(() => {
    const fresh = makeBatch([]);
    return fresh.length ? fresh : [{ kind: 'empty', key: nextKey('empty') }];
  });

  const topUp = (q: DeckItem[]): DeckItem[] => {
    const queued = queuedIds(q);
    if (queued.length >= REFILL_BELOW) return q;
    const more = makeBatch(queued).filter((m) => m.kind === 'stock' && !queued.includes(m.item.id));
    return [...q, ...more];
  };

  /** Removes the top card after a swipe. */
  const advance = (wasStock: boolean) => {
    if (wasStock) sessionSwipes.current += 1;
    const rest = topUp(queue.slice(1));
    const showAd = wasStock && shouldShowAd(state.premium, sessionSwipes.current);
    setQueue(showAd ? [{ kind: 'ad', key: nextKey('ad') }, ...rest] : rest);
  };

  /** Puts a card back on top after an undo. */
  const restore = (item: DeckItem) => {
    sessionSwipes.current = Math.max(0, sessionSwipes.current - 1);
    // Drop an ad that the undone swipe may have triggered.
    setQueue((q) => [item, ...(q[0]?.kind === 'ad' ? q.slice(1) : q)]);
  };

  const remaining = swipesRemaining(state);
  // Swap in the limit card once free swipes run out (but let a showing ad finish).
  const deck: DeckItem[] = remaining <= 0 && queue[0]?.kind !== 'ad' ? [{ kind: 'limit', key: 'limit' }] : queue;

  return { deck, remaining, advance, restore };
}
