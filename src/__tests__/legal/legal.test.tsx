import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import React from 'react';
import SettingsScreen from '../../app/(tabs)/settings';
import Onboarding from '../../app/onboarding';
import PrivacyScreen from '../../app/privacy';
import { ABOUT_DISCLAIMER, ONBOARDING_DISCLAIMER, shortDisclaimer } from '../../legal/disclaimer';
import { POLICY_TITLE, PRIVACY_POLICY, privacyPolicyMarkdown } from '../../legal/privacyPolicy';
import { renderWithState } from '../../test-utils';

const user = () => userEvent.setup();

describe('Privacy policy', () => {
  it('PRIVACY.md matches the policy in the app (run `npm run privacy` to update it)', () => {
    const file = readFileSync(join(__dirname, '..', '..', '..', 'PRIVACY.md'), 'utf8');
    expect(file).toBe(privacyPolicyMarkdown());
  });

  it('covers every service the app talks to', () => {
    const text = privacyPolicyMarkdown();
    for (const name of ['RevenueCat', 'AdMob', 'Supabase', 'Expo', 'PDPA', 'Data Protection Officer']) {
      expect(text).toContain(name);
    }
  });

  it('shows every section on the privacy screen', async () => {
    await render(<PrivacyScreen />);
    expect(screen.getByText(POLICY_TITLE)).toBeOnTheScreen();
    for (const s of PRIVACY_POLICY) expect(screen.getByText(s.heading)).toBeOnTheScreen();
    expect(screen.getByText(/We don't sell your data\./)).toBeOnTheScreen();
  });

  it('opens from Settings', async () => {
    await renderWithState(<SettingsScreen />);
    await user().press(screen.getByTestId('open-privacy'));
    expect(router.push).toHaveBeenCalledWith('/privacy');
  });

  it('opens from onboarding', async () => {
    await renderWithState(<Onboarding />, { onboarded: false });
    await user().press(screen.getByTestId('onboarding-privacy'));
    expect(router.push).toHaveBeenCalledWith('/privacy');
  });
});

describe('Not financial advice', () => {
  it('says so before the first swipe', async () => {
    await renderWithState(<Onboarding />, { onboarded: false });
    expect(screen.getByTestId('onboarding-disclaimer')).toHaveTextContent(ONBOARDING_DISCLAIMER);
    expect(ONBOARDING_DISCLAIMER).toMatch(/not financial advice/);
  });

  it('says so in Settings', async () => {
    await renderWithState(<SettingsScreen />);
    expect(screen.getByTestId('about-disclaimer')).toHaveTextContent(new RegExp(ABOUT_DISCLAIMER.slice(0, 40)));
  });

  it('only mentions sample data when the app shows it', () => {
    expect(shortDisclaimer(true)).toBe('For information and education only. Not financial advice. Sample data.');
    expect(shortDisclaimer(false)).toBe(
      'For information and education only. Not financial advice. Prices may be delayed or wrong.',
    );
  });
});
