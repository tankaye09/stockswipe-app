import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { NO_FILTERS } from '../../feed/feedEngine';
import { STARTING_CASH_USD } from '../../state/rules';
import { AppStateProvider, initialState, reducer, STORAGE_KEY, useAppState } from '../../state/store';
import { persisted } from '../../test-utils';

const s0 = () => ({ ...initialState(), hydrated: true });

describe('reducer', () => {
  it('finishes onboarding', () => {
    const s = reducer(s0(), { type: 'finishOnboarding', interests: ['ai'], markets: ['US', 'SGX'] });
    expect(s).toMatchObject({ onboarded: true, interests: ['ai'], markets: ['US', 'SGX'] });
  });

  it('updates preferences', () => {
    let s = reducer(s0(), { type: 'setInterests', interests: ['gaming'] });
    s = reducer(s, { type: 'setFilters', filters: { ...NO_FILTERS, caps: ['mega'] } });
    s = reducer(s, { type: 'setSwipeMode', mode: 'trade' });
    s = reducer(s, { type: 'setBroker', broker: 'tiger' });
    s = reducer(s, { type: 'setPremium', premium: true });
    expect(s).toMatchObject({ interests: ['gaming'], swipeMode: 'trade', broker: 'tiger', premium: true });
    expect(s.filters.caps).toEqual(['mega']);
  });

  it('never leaves markets empty', () => {
    expect(reducer(s0(), { type: 'setMarkets', markets: [] }).markets).toEqual(['US']);
    expect(reducer(s0(), { type: 'setMarkets', markets: ['SGX'] }).markets).toEqual(['SGX']);
  });

  it('saves and unsaves without duplicates', () => {
    let s = reducer(s0(), { type: 'save', id: 'US:AAPL' });
    const again = reducer(s, { type: 'save', id: 'US:AAPL' });
    expect(again).toBe(s);
    s = reducer(s, { type: 'save', id: 'US:NVDA' });
    expect(s.watchlist).toEqual(['US:NVDA', 'US:AAPL']);
    expect(reducer(s, { type: 'unsave', id: 'US:AAPL' }).watchlist).toEqual(['US:NVDA']);
  });

  it('keeps traded stocks for Needles > Trades without duplicates', () => {
    let s = reducer(s0(), { type: 'markTraded', id: 'US:AAPL' });
    expect(reducer(s, { type: 'markTraded', id: 'US:AAPL' })).toBe(s);
    s = reducer(s, { type: 'markTraded', id: 'US:NVDA' });
    expect(s.traded).toEqual(['US:NVDA', 'US:AAPL']);
    expect(reducer(s, { type: 'unmarkTraded', id: 'US:AAPL' }).traded).toEqual(['US:NVDA']);
  });

  it('remembers recently seen stocks, newest first, capped', () => {
    let s = s0();
    for (let i = 0; i < 70; i++) s = reducer(s, { type: 'markSeen', id: `US:S${i}` });
    s = reducer(s, { type: 'markSeen', id: 'US:S10' });
    expect(s.seen).toHaveLength(60);
    expect(s.seen[0]).toBe('US:S10');
    expect(s.seen.filter((x) => x === 'US:S10')).toHaveLength(1);
  });

  it('counts swipes per day and never below zero', () => {
    let s = { ...s0(), swipesToday: { date: '2000-01-01', count: 40 } };
    s = reducer(s, { type: 'countSwipe', delta: 1 });
    expect(s.swipesToday.count).toBe(1);
    s = reducer(s, { type: 'countSwipe', delta: -1 });
    s = reducer(s, { type: 'countSwipe', delta: -1 });
    expect(s.swipesToday.count).toBe(0);
  });

  it('records valid paper trades and ignores invalid ones', () => {
    const trade = { type: 'paperTrade', id: 'US:AAPL', side: 'buy', qty: 2, price: 100, currency: 'USD' } as const;
    const s = reducer(s0(), trade);
    expect(s.paper.cashUsd).toBe(STARTING_CASH_USD - 200);
    expect(s.paper.trades[0]).toMatchObject({ id: 'US:AAPL', side: 'buy', qty: 2, price: 100 });
    expect(s.traded).toEqual(['US:AAPL']);
    expect(reducer(s, { ...trade, side: 'sell', qty: 1 }).traded).toEqual(['US:AAPL']);
    const bad = reducer(s, { ...trade, side: 'sell', qty: 99 });
    expect(bad).toBe(s);
    expect(reducer(s, { type: 'resetPaper' }).paper).toEqual(initialState().paper);
  });

  it('resets everything but stays hydrated', () => {
    const s = reducer({ ...s0(), onboarded: true, premium: true }, { type: 'resetAll' });
    expect(s).toMatchObject({ onboarded: false, premium: false, hydrated: true });
  });
});

describe('AppStateProvider', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => <AppStateProvider>{children}</AppStateProvider>;

  it('hydrates from storage and persists changes', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ onboarded: true, interests: ['ai'] }));
    const { result } = await renderHook(() => useAppState(), { wrapper });
    await waitFor(() => expect(result.current.state.hydrated).toBe(true));
    expect(result.current.state.interests).toEqual(['ai']);

    result.current.dispatch({ type: 'save', id: 'US:AAPL' });
    await waitFor(async () => expect((await persisted()).watchlist).toEqual(['US:AAPL']));
    expect((await persisted()) as object).not.toHaveProperty('hydrated');
  });

  it('starts fresh when storage is empty', async () => {
    const { result } = await renderHook(() => useAppState(), { wrapper });
    await waitFor(() => expect(result.current.state.hydrated).toBe(true));
    expect(result.current.state.onboarded).toBe(false);
  });

  it('starts fresh when storage fails', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk'));
    const { result } = await renderHook(() => useAppState(), { wrapper });
    await waitFor(() => expect(result.current.state.hydrated).toBe(true));
  });

  it('ignores write failures', async () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValue(new Error('disk full'));
    const { result } = await renderHook(() => useAppState(), { wrapper });
    await waitFor(() => expect(result.current.state.hydrated).toBe(true));
    jest.restoreAllMocks();
  });

  it('throws when used outside the provider', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(renderHook(() => useAppState())).rejects.toThrow('inside AppStateProvider');
    jest.restoreAllMocks();
  });
});
