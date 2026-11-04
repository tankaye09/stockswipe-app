import { fireEvent, screen, userEvent, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Linking } from 'react-native';
import SettingsScreen from '../../app/(tabs)/settings';
import AdminScreen from '../../app/admin';
import PaywallScreen from '../../app/paywall';
import { openBrokerSignUp, signUpLink } from '../../broker/brokers';
import { DEFAULT_LIMITS } from '../../monetization/config';
import { createTestPurchases, setPurchases, type Purchases } from '../../monetization/purchases';
import { isoDate, trialEndedFirstOpen } from '../../state/rules';
import { persisted, renderWithState } from '../../test-utils';

const user = () => userEvent.setup();
const params = useLocalSearchParams as jest.Mock;
const store = (over: Partial<Purchases> = {}) => setPurchases({ ...createTestPurchases(), ...over });

beforeEach(() => params.mockReturnValue({}));
afterEach(() => setPurchases(null));

describe('Paywall', () => {
  it('lists plans with the annual plan picked, and subscribes', async () => {
    await renderWithState(<PaywallScreen />);
    expect(await screen.findByTestId('plan-annual')).toBeSelected();
    expect(screen.getByText('S$5.98 / month')).toBeOnTheScreen();
    expect(screen.getByText(`♾️ Unlimited swipes (free is ${DEFAULT_LIMITS.dailySwipes} a day)`)).toBeOnTheScreen();
    expect(screen.getByTestId('paywall-test-mode')).toBeOnTheScreen();
    await user().press(screen.getByTestId('plan-monthly'));
    expect(screen.getByTestId('plan-monthly')).toBeSelected();
    await user().press(screen.getByTestId('paywall-subscribe'));
    await waitFor(async () => expect((await persisted()).premium).toBe(true));
    expect(router.back).toHaveBeenCalled();
  });

  it('passes the chosen plan to the store and shows errors', async () => {
    const purchase = jest.fn(async () => ({ status: 'failed' as const, error: 'Card declined' }));
    store({ isTest: false, purchase });
    await renderWithState(<PaywallScreen />);
    await user().press(await screen.findByTestId('paywall-subscribe'));
    expect(purchase).toHaveBeenCalledWith('annual');
    expect(await screen.findByTestId('paywall-error')).toHaveTextContent('Card declined');
    expect(screen.queryByTestId('paywall-test-mode')).not.toBeOnTheScreen();
    expect((await persisted()).premium).toBe(false);
  });

  it('does nothing when the user cancels', async () => {
    store({ purchase: async () => ({ status: 'cancelled' }) });
    await renderWithState(<PaywallScreen />);
    await user().press(await screen.findByTestId('paywall-subscribe'));
    expect(screen.queryByTestId('paywall-error')).not.toBeOnTheScreen();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('says when no plans are available', async () => {
    store({ getPlans: () => Promise.reject(new Error('offline')) });
    await renderWithState(<PaywallScreen />);
    expect(await screen.findByTestId('paywall-no-plans')).toBeOnTheScreen();
    expect(screen.getByTestId('paywall-subscribe')).toBeDisabled();
    await fireEvent.press(screen.getByTestId('paywall-subscribe'));
  });

  it('restores a purchase, or says none was found', async () => {
    const restore = jest
      .fn()
      .mockResolvedValueOnce(false)
      .mockRejectedValueOnce(new Error('x'))
      .mockResolvedValueOnce(true);
    store({ restore });
    await renderWithState(<PaywallScreen />);
    await user().press(await screen.findByTestId('paywall-restore'));
    expect(await screen.findByTestId('paywall-error')).toHaveTextContent(/No Premium subscription found/);
    await user().press(screen.getByTestId('paywall-restore'));
    expect(await screen.findByTestId('paywall-error')).toBeOnTheScreen();
    await user().press(screen.getByTestId('paywall-restore'));
    await waitFor(async () => expect((await persisted()).premium).toBe(true));
  });

  it('tells Premium users they already have it', async () => {
    await renderWithState(<PaywallScreen />, { premium: true });
    expect(screen.getByText('You’re on Premium ✨')).toBeOnTheScreen();
    await user().press(screen.getByTestId('paywall-close'));
    expect(router.back).toHaveBeenCalled();
  });

  it('ignores plans that arrive after leaving', async () => {
    let resolve: (v: []) => void = () => {};
    store({ getPlans: () => new Promise((r) => (resolve = r)) });
    await renderWithState(<PaywallScreen />);
    await screen.unmount();
    resolve([]);
  });
});

describe('Settings: Premium, referrals and admin', () => {
  it('shows trial days left and opens the paywall', async () => {
    await renderWithState(<SettingsScreen />, { firstOpen: isoDate() });
    expect(screen.getByTestId('plan-status')).toHaveTextContent(
      `Free: unlimited swipes for ${DEFAULT_LIMITS.freeDays} more days`,
    );
    await user().press(screen.getByTestId('see-premium'));
    expect(router.push).toHaveBeenCalledWith('/paywall');
  });

  it('shows the daily cap after the trial, and the last trial day', async () => {
    await renderWithState(<SettingsScreen />, { firstOpen: '2020-01-01', remoteLimits: { dailySwipes: 25 } });
    expect(screen.getByTestId('plan-status')).toHaveTextContent('Free: 25 swipes a day, with ads');
    await screen.unmount();
    await renderWithState(<SettingsScreen />, { firstOpen: isoDate(), limitOverride: { freeDays: 1 } });
    expect(screen.getByTestId('plan-status')).toHaveTextContent(/for 1 more day$/);
  });

  it('shows Premium as active', async () => {
    await renderWithState(<SettingsScreen />, { premium: true });
    expect(screen.getByTestId('premium-active')).toBeOnTheScreen();
    expect(screen.queryByTestId('see-premium')).not.toBeOnTheScreen();
  });

  it('restores purchases', async () => {
    const restore = jest
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockRejectedValueOnce(new Error());
    store({ restore });
    await renderWithState(<SettingsScreen />);
    await user().press(screen.getByTestId('restore-purchases'));
    expect(await screen.findByText('Premium restored.')).toBeOnTheScreen();
    expect((await persisted()).premium).toBe(true);
    await user().press(screen.getByTestId('restore-purchases'));
    expect(await screen.findByText('No Premium subscription found for this account.')).toBeOnTheScreen();
    await user().press(screen.getByTestId('restore-purchases'));
    expect(await screen.findByText('Could not reach the store. Try again later.')).toBeOnTheScreen();
  });

  it('offers broker sign-up links with a disclosure until a broker is picked', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await renderWithState(<SettingsScreen />);
    expect(screen.getByText(/may earn a referral fee/)).toBeOnTheScreen();
    await user().press(screen.getByTestId('signup-tiger'));
    expect(open).toHaveBeenCalledWith('https://www.tigerbrokers.com.sg/');
    await user().press(screen.getByTestId('broker-tiger'));
    expect(screen.queryByTestId('signup-tiger')).not.toBeOnTheScreen();
  });

  it('opens the admin page in development builds', async () => {
    await renderWithState(<SettingsScreen />);
    await user().press(screen.getByTestId('open-admin'));
    expect(router.push).toHaveBeenCalledWith('/admin');
  });
});

describe('Broker referrals', () => {
  it('uses a referral link when one is set', () => {
    expect(signUpLink('moomoo', { moomoo: 'https://ref.example/m' })).toEqual({
      url: 'https://ref.example/m',
      isReferral: true,
    });
    expect(signUpLink('ibkr')).toEqual({ url: 'https://www.interactivebrokers.com.sg/', isReferral: false });
  });

  it('reports when the sign-up page cannot open', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValueOnce(new Error('no'));
    await expect(openBrokerSignUp('moomoo')).resolves.toBe(false);
    jest.spyOn(Linking, 'openURL').mockResolvedValueOnce(undefined);
    await expect(openBrokerSignUp('moomoo')).resolves.toBe(true);
  });
});

describe('Admin page', () => {
  it('is not reachable when admin tools are off', async () => {
    await renderWithState(<AdminScreen enabled={false} />);
    expect(screen.getByText('redirect:/settings')).toBeOnTheScreen();
  });

  it('shows where each limit comes from', async () => {
    await renderWithState(<AdminScreen />, { remoteLimits: { dailySwipes: 30 }, limitOverride: null });
    expect(screen.getByTestId('admin-current')).toHaveTextContent(
      `${DEFAULT_LIMITS.freeDays} trial days · 30 swipes a day · ad every ${DEFAULT_LIMITS.adEvery}`,
    );
    expect(screen.getByText(/Dashboard: dailySwipes 30\. This device: none\./)).toBeOnTheScreen();
    expect(screen.getByTestId('admin-free-days').props.value).toBe(String(DEFAULT_LIMITS.freeDays));
  });

  it('saves an override for this device, and rejects bad values', async () => {
    await renderWithState(<AdminScreen />);
    await user().clear(screen.getByTestId('admin-daily-swipes'));
    await user().type(screen.getByTestId('admin-daily-swipes'), 'lots');
    await user().press(screen.getByTestId('admin-save'));
    expect(screen.getByTestId('admin-note')).toHaveTextContent(/whole number/);

    await user().clear(screen.getByTestId('admin-daily-swipes'));
    await user().type(screen.getByTestId('admin-daily-swipes'), '12');
    await user().clear(screen.getByTestId('admin-free-days'));
    await user().type(screen.getByTestId('admin-free-days'), '0');
    await user().clear(screen.getByTestId('admin-ad-every'));
    await user().type(screen.getByTestId('admin-ad-every'), '5');
    await user().press(screen.getByTestId('admin-save'));
    await waitFor(async () =>
      expect((await persisted()).limitOverride).toEqual({ freeDays: 0, dailySwipes: 12, adEvery: 5 }),
    );
    expect(screen.getByTestId('admin-current')).toHaveTextContent('0 trial days · 12 swipes a day · ad every 5');
    expect(screen.getByTestId('admin-usage')).toHaveTextContent('12 swipes left today.');
  });

  it('clears the override back to the dashboard values', async () => {
    await renderWithState(<AdminScreen />, { remoteLimits: { dailySwipes: 30 }, limitOverride: { dailySwipes: 3 } });
    await user().press(screen.getByTestId('admin-clear'));
    await waitFor(async () => expect((await persisted()).limitOverride).toBeNull());
    expect(screen.getByTestId('admin-daily-swipes').props.value).toBe('30');
  });

  it('ends the trial, resets today’s count and turns Premium off', async () => {
    await renderWithState(<AdminScreen />, {
      firstOpen: isoDate(),
      premium: true,
      swipesToday: { date: isoDate(), count: 9 },
    });
    expect(screen.getByTestId('admin-usage')).toHaveTextContent(/Premium is on/);
    await user().press(screen.getByTestId('admin-premium-off'));
    expect(screen.getByTestId('admin-usage')).toHaveTextContent(`${DEFAULT_LIMITS.freeDays} trial days left.`);
    await user().press(screen.getByTestId('admin-end-trial'));
    await user().press(screen.getByTestId('admin-reset-today'));
    await waitFor(async () =>
      expect(await persisted()).toMatchObject({
        premium: false,
        firstOpen: trialEndedFirstOpen(DEFAULT_LIMITS.freeDays),
        swipesToday: { date: isoDate(), count: 0 },
      }),
    );
    expect(screen.getByTestId('admin-usage')).toHaveTextContent(`${DEFAULT_LIMITS.dailySwipes} swipes left today.`);
    await user().press(screen.getByTestId('admin-done'));
    expect(router.back).toHaveBeenCalled();
  });
});
