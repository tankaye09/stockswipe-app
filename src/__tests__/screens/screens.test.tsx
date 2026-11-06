import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Alert, Linking, ScrollView } from 'react-native';
import TabsLayout from '../../app/(tabs)/_layout';
import PortfolioScreen from '../../app/(tabs)/portfolio';
import SettingsScreen from '../../app/(tabs)/settings';
import WatchlistScreen from '../../app/(tabs)/watchlist';
import RootLayout from '../../app/_layout';
import FiltersScreen from '../../app/filters';
import Onboarding from '../../app/onboarding';
import StockScreen from '../../app/stock/[id]';
import { marketData } from '../../data';
import { STARTING_CASH_USD } from '../../state/rules';
import { AppStateProvider, STORAGE_KEY } from '../../state/store';
import { idOf, persisted, renderWithState } from '../../test-utils';

/** Icons are hidden from screen readers (the text beside them says the same), so tests opt in to find them. */
const ICON = { includeHiddenElements: true };

const user = () => userEvent.setup();
const params = useLocalSearchParams as jest.Mock;

describe('Onboarding', () => {
  it('needs 3 interests before continuing, then saves choices', async () => {
    await renderWithState(<Onboarding />, { onboarded: false });
    const go = screen.getByTestId('onboarding-continue');
    expect(go).toBeDisabled();
    expect(screen.getByText('Pick 3 more')).toBeOnTheScreen();

    await user().press(screen.getByTestId('interest-gaming'));
    await user().press(screen.getByTestId('interest-ai'));
    await user().press(screen.getByTestId('interest-travel'));
    await user().press(screen.getByTestId('interest-travel'));
    expect(screen.getByText('Pick 1 more')).toBeOnTheScreen();
    await user().press(screen.getByTestId('interest-coffee-food'));
    await user().press(screen.getByTestId('market-SGX'));
    expect(screen.getByText('Start swiping')).toBeOnTheScreen();

    await user().press(go);
    expect(router.replace).toHaveBeenCalledWith('/');
    await waitFor(async () => expect((await persisted()).onboarded).toBe(true));
    const saved = await persisted();
    expect(saved.interests).toEqual(['gaming', 'ai', 'coffee-food']);
    expect(saved.markets).toEqual(['US', 'SGX']);
  });

  it('needs at least one market', async () => {
    await renderWithState(<Onboarding />, { onboarded: false });
    for (const t of ['gaming', 'ai', 'health']) await user().press(screen.getByTestId(`interest-${t}`));
    await user().press(screen.getByTestId('market-US'));
    expect(screen.getByTestId('onboarding-continue')).toBeDisabled();
  });
});

describe('Layouts', () => {
  it('root layout renders the app', async () => {
    await render(<RootLayout />);
    expect(screen.getByTestId('screen-(tabs)')).toBeOnTheScreen();
  });

  it('tabs redirect new users to onboarding', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ onboarded: false }));
    await render(
      <AppStateProvider>
        <TabsLayout />
      </AppStateProvider>,
    );
    expect(await screen.findByText('redirect:/onboarding')).toBeOnTheScreen();
  });

  it('tabs show the four sections for onboarded users', async () => {
    await renderWithState(<TabsLayout />);
    for (const name of ['index', 'watchlist', 'portfolio', 'settings']) {
      expect(await screen.findByTestId(`screen-${name}`)).toBeOnTheScreen();
    }
    for (const icon of ['discover', 'watchlist', 'paper', 'settings']) {
      expect(screen.getByTestId(`tab-icon-${icon}`)).toBeOnTheScreen();
    }
  });
});

describe('Watchlist', () => {
  it('shows an empty state', async () => {
    await renderWithState(<WatchlistScreen />);
    expect(screen.getByText('Nothing saved yet')).toBeOnTheScreen();
  });

  it('lists saved stocks, opens and removes them', async () => {
    await renderWithState(<WatchlistScreen />, { watchlist: [idOf('NVDA'), idOf('D05')] });
    expect(await screen.findByText('DBS Group')).toBeOnTheScreen();
    await user().press(screen.getByTestId(`watch-${idOf('NVDA')}`));
    expect(router.push).toHaveBeenCalledWith('/stock/US%3ANVDA');
    await user().press(screen.getByRole('button', { name: 'Remove NVDA' }));
    await waitFor(() => expect(screen.queryByText('NVIDIA')).not.toBeOnTheScreen());
  });
});

describe('Portfolio', () => {
  it('shows an empty account', async () => {
    await renderWithState(<PortfolioScreen />);
    expect(screen.getByTestId('portfolio-total')).toHaveTextContent('$100,000.00');
    expect(screen.getByTestId('portfolio-empty')).toBeOnTheScreen();
  });

  it('values positions and links to them', async () => {
    await renderWithState(<PortfolioScreen />, {
      paper: {
        cashUsd: STARTING_CASH_USD - 2000,
        trades: [],
        positions: [
          { id: idOf('AAPL'), qty: 10, avgPrice: 200 },
          { id: idOf('TSLA'), qty: -1, avgPrice: 500 },
        ],
      },
    });
    expect(await screen.findByText('10 shares')).toBeOnTheScreen();
    expect(screen.getByText('1 short')).toBeOnTheScreen();
    expect(screen.getByText('+$413.00')).toBeOnTheScreen();
    expect(screen.getByText('+$87.10')).toBeOnTheScreen();
    await user().press(screen.getByTestId(`position-${idOf('AAPL')}`));
    expect(router.push).toHaveBeenCalledWith('/stock/US%3AAAPL');
  });

  it('shows a loss and resets after confirming', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    await renderWithState(<PortfolioScreen />, {
      paper: { cashUsd: 90_000, trades: [], positions: [{ id: idOf('AAPL'), qty: 1, avgPrice: 300 }] },
    });
    expect(await screen.findByText('-$58.70')).toBeOnTheScreen();
    expect(screen.getByText('1 share')).toBeOnTheScreen();
    await user().press(screen.getByTestId('reset-paper'));
    const buttons = alert.mock.calls[0][2]!;
    buttons[1].onPress!();
    await waitFor(async () => expect((await persisted()).paper.positions).toEqual([]));
  });
});

describe('Settings', () => {
  it('picks a broker, markets and interests', async () => {
    params.mockReturnValue({ pickBroker: '1' });
    await renderWithState(<SettingsScreen />, { interests: ['ai'] });
    expect(screen.getByTestId('pick-broker-hint')).toBeOnTheScreen();
    await user().press(screen.getByTestId('broker-moomoo'));
    await user().press(screen.getByTestId('settings-market-SGX'));
    await user().press(screen.getByText('Gaming'));
    await user().press(screen.getByText('AI'));
    await waitFor(async () => expect((await persisted()).interests).toEqual(['gaming']));
    const s = await persisted();
    expect(s).toMatchObject({ broker: 'moomoo', markets: ['US', 'SGX'], interests: ['gaming'] });
    expect(screen.queryByTestId('pick-broker-hint')).not.toBeOnTheScreen();

    await user().press(screen.getByTestId('broker-moomoo'));
    await waitFor(async () => expect((await persisted()).broker).toBeNull());
  });

  it('jumps to the broker picker each time Trade mode asks for a broker', async () => {
    const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo');
    params.mockReturnValue({ pickBroker: '1' });
    await renderWithState(<SettingsScreen />);
    await fireEvent(screen.getByTestId('broker-section'), 'layout', { nativeEvent: { layout: { y: 40 } } });
    params.mockReturnValue({ pickBroker: '2' });
    await screen.rerender(
      <AppStateProvider>
        <SettingsScreen />
      </AppStateProvider>,
    );
    expect(scrollTo).toHaveBeenLastCalledWith({ y: 40, animated: false });
    expect(scrollTo).toHaveBeenCalledTimes(2);
    scrollTo.mockRestore();
  });

  it('keeps its scroll position when opened normally', async () => {
    const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo');
    params.mockReturnValue({});
    await renderWithState(<SettingsScreen />);
    expect(scrollTo).not.toHaveBeenCalled();
    scrollTo.mockRestore();
  });

  it('resets the app', async () => {
    await renderWithState(<SettingsScreen />);
    expect(screen.getByText(/Prices shown are sample data\./)).toBeOnTheScreen();
    await user().press(screen.getByTestId('reset-all'));
    await waitFor(async () => expect((await persisted()).onboarded).toBe(false));
  });
});

describe('Filters', () => {
  it('applies chosen filters', async () => {
    await renderWithState(<FiltersScreen />);
    await user().press(screen.getByTestId('filter-sector-Energy'));
    await user().press(screen.getByTestId('filter-sector-Healthcare'));
    await user().press(screen.getByTestId('filter-sector-Healthcare'));
    await user().press(screen.getByTestId('filter-cap-mid'));
    await user().press(screen.getByTestId('filter-theme-clean-energy'));
    await user().press(screen.getByTestId('filter-earnings'));
    await user().press(screen.getByTestId('filter-earnings'));
    await user().press(screen.getByTestId('filter-earnings'));
    await user().press(screen.getByTestId('filters-apply'));
    expect(router.back).toHaveBeenCalled();
    await waitFor(async () =>
      expect((await persisted()).filters).toEqual({
        sectors: ['Energy'],
        caps: ['mid'],
        themes: ['clean-energy'],
        earningsWithinDays: 14,
      }),
    );
  });

  it('clears filters', async () => {
    await renderWithState(<FiltersScreen />, {
      filters: { sectors: ['Energy'], caps: [], themes: [], earningsWithinDays: null },
    });
    expect(screen.getByTestId('filter-sector-Energy')).toBeSelected();
    await user().press(screen.getByTestId('filters-clear'));
    expect(screen.getByTestId('filter-sector-Energy')).not.toBeSelected();
  });
});

describe('Stock detail', () => {
  it('shows the full breakdown, stats and news', async () => {
    params.mockReturnValue({ id: encodeURIComponent(idOf('NVDA')) });
    await renderWithState(<StockScreen />);
    expect(await screen.findByText('NVIDIA')).toBeOnTheScreen();
    for (const t of ['What they do', 'How they make money', 'Why people watch it', 'Risks to know', 'News'])
      expect(screen.getByText(t)).toBeOnTheScreen();
    expect(screen.getByText(/Cloud giants raise AI spending/)).toBeOnTheScreen();
    await user().press(screen.getByTestId('range-1Y'));
    expect(screen.getByTestId('range-1Y')).toBeSelected();
  });

  it('hides breakdown parts a real stock does not have yet', async () => {
    const base = (await marketData.getStock(idOf('NVDA')))!;
    const partial = {
      ...base,
      news: [],
      breakdown: { ...base.breakdown, howTheyMakeMoney: '', whyPeopleWatch: '', risksToKnow: '' },
    };
    const spy = jest.spyOn(marketData, 'getStock').mockResolvedValue(partial);
    params.mockReturnValue({ id: idOf('NVDA') });
    await renderWithState(<StockScreen />);
    expect(await screen.findByText('What they do')).toBeOnTheScreen();
    for (const t of ['How they make money', 'Why people watch it', 'Risks to know', 'News'])
      expect(screen.queryByText(t)).not.toBeOnTheScreen();
    spy.mockRestore();
  });

  it('saves, unsaves and asks for a broker', async () => {
    params.mockReturnValue({ id: idOf('RBLX') });
    await renderWithState(<StockScreen />);
    await user().press(await screen.findByText('Save'));
    expect(await screen.findByText('Saved')).toBeOnTheScreen();
    expect(screen.getByTestId('icon-star-filled', ICON)).toBeOnTheScreen();
    await user().press(screen.getByText('Saved'));
    expect(await screen.findByText('Save')).toBeOnTheScreen();
    expect(screen.getByTestId('icon-star', ICON)).toBeOnTheScreen();
    await user().press(screen.getByText('Choose a broker'));
    expect(router.push).toHaveBeenCalledWith('/settings');
  });

  it('opens the stock in the chosen broker', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    params.mockReturnValue({ id: idOf('D05') });
    await renderWithState(<StockScreen />, { broker: 'tiger' });
    await user().press(await screen.findByText('Open in Tiger Brokers'));
    expect(open).toHaveBeenCalledWith('https://www.itiger.com/stock/D05.SI');
  });

  it('fills in missing stats', async () => {
    params.mockReturnValue({ id: idOf('C38U') });
    await renderWithState(<StockScreen />);
    expect(await screen.findByText('Not announced')).toBeOnTheScreen();
    expect(screen.getByText('n/a')).toBeOnTheScreen();
  });

  it('handles an unknown stock', async () => {
    params.mockReturnValue({ id: 'US:NOPE' });
    await renderWithState(<StockScreen />);
    expect(await screen.findByText('Stock not found.')).toBeOnTheScreen();
  });

  it.each([['%E0%A4%A'], ['javascript:alert(1)'], ['US:../../etc'], [undefined]])(
    'shows not found for a malformed deep link id (%s)',
    async (id) => {
      params.mockReturnValue({ id });
      await renderWithState(<StockScreen />);
      expect(await screen.findByText('Stock not found.')).toBeOnTheScreen();
    },
  );
});
