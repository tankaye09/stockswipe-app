import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { stockId, type StockSummary } from './data/types';
import { SAMPLE_STOCKS } from './data/mock/stocks';
import { AppStateProvider, initialState, STORAGE_KEY } from './state/store';
import type { AppState } from './state/types';

/** Renders UI inside the real app state provider, seeded with the given state. */
export async function renderWithState(ui: React.ReactElement, state: Partial<AppState> = {}) {
  const { hydrated: _h, ...base } = initialState();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...base, onboarded: true, ...state }));
  await render(<AppStateProvider>{ui}</AppStateProvider>);
  // The provider renders once saved state has loaded.
  await waitFor(() => expect(screen.toJSON()).not.toBeNull());
  return screen;
}

/** Reads what the provider last persisted. */
export async function persisted(): Promise<AppState> {
  return JSON.parse((await AsyncStorage.getItem(STORAGE_KEY)) ?? '{}');
}

export const sample = (symbol: string): StockSummary => {
  const s = SAMPLE_STOCKS.find((x) => x.symbol === symbol);
  if (!s) throw new Error(`No sample stock ${symbol}`);
  return s;
};

export const idOf = (symbol: string) => stockId(sample(symbol));
