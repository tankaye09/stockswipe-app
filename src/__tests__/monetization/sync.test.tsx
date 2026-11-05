import { act, waitFor } from '@testing-library/react-native';
import React from 'react';
import { View } from 'react-native';
import { MonetizationSync } from '../../monetization/MonetizationSync';
import { createTestPurchases, setPurchases, type Purchases } from '../../monetization/purchases';
import { persisted, renderWithState } from '../../test-utils';

afterEach(() => setPurchases(null));

// The sync renders nothing, so wrap it for the render helper.
const ui = () => (
  <View>
    <MonetizationSync />
  </View>
);

function fake(over: Partial<Purchases>): Purchases & { emit: (p: boolean) => void; off: jest.Mock } {
  let listener: (p: boolean) => void = () => {};
  const off = jest.fn();
  return {
    ...createTestPurchases(),
    isTest: false,
    onChange: (cb) => {
      listener = cb;
      return off;
    },
    emit: (p) => listener(p),
    off,
    ...over,
  };
}

it('syncs Premium and dashboard limits from the store at launch', async () => {
  const p = fake({ isPremium: async () => false, getRemoteLimits: async () => ({ dailySwipes: 30 }) });
  setPurchases(p);
  const view = await renderWithState(ui(), { premium: true });
  await waitFor(async () =>
    expect(await persisted()).toMatchObject({ premium: false, remoteLimits: { dailySwipes: 30 } }),
  );

  await act(async () => p.emit(true));
  await waitFor(async () => expect((await persisted()).premium).toBe(true));
  await view.unmount();
  expect(p.off).toHaveBeenCalled();
});

it('keeps saved values when the store has no answer or is offline', async () => {
  setPurchases(fake({ isPremium: async () => null, getRemoteLimits: () => Promise.reject(new Error('offline')) }));
  await renderWithState(ui(), { premium: true, remoteLimits: { freeDays: 2 } });
  await new Promise((r) => setTimeout(r, 10));
  expect(await persisted()).toMatchObject({ premium: true, remoteLimits: { freeDays: 2 } });

  setPurchases({
    ...fake({ isPremium: () => Promise.reject(new Error('x')), getRemoteLimits: async () => null }),
    isTest: true,
  });
  await renderWithState(ui(), { premium: true, remoteLimits: { freeDays: 2 } });
  await new Promise((r) => setTimeout(r, 10));
  expect(await persisted()).toMatchObject({ premium: true, remoteLimits: { freeDays: 2 } });
});

it('never trusts a saved Premium flag when the real store cannot confirm it', async () => {
  setPurchases(fake({ isPremium: () => Promise.reject(new Error('no store')) }));
  await renderWithState(ui(), { premium: true });
  await waitFor(async () => expect((await persisted()).premium).toBe(false));
});

it('ignores answers that arrive after unmount', async () => {
  let resolve: (v: boolean) => void = () => {};
  setPurchases(fake({ isPremium: () => new Promise((r) => (resolve = r)) }));
  const view = await renderWithState(ui(), { premium: true });
  await view.unmount();
  resolve(false);
  await new Promise((r) => setTimeout(r, 10));
  expect((await persisted()).premium).toBe(true);
});
