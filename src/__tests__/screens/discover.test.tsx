import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import React from 'react';
import { Linking, PanResponder, type PanResponderCallbacks, type PanResponderGestureState } from 'react-native';
import DiscoverScreen from '../../app/(tabs)/index';
import { SAMPLE_STOCKS } from '../../data/mock/stocks';
import { stockId } from '../../data/types';
import { NO_FILTERS } from '../../feed/feedEngine';
import { isoDate } from '../../state/rules';
import { persisted, renderWithState } from '../../test-utils';

/** Icons are hidden from screen readers (the text beside them says the same), so tests opt in to find them. */
const ICON = { includeHiddenElements: true };

// The top card renders after the one behind it, so its symbol is the last match.
const topSymbol = () => {
  const symbols = screen.getAllByTestId('card-symbol');
  return symbols[symbols.length - 1].props.children as string;
};

/** The icon on every stock card that says why it was shown. */
const REASON = /^reason-(liked|news|wildcard)$/;

const OLD_USER = { firstOpen: '2020-01-01' };

async function openFeed(state = {}) {
  await renderWithState(<DiscoverScreen />, { interests: ['gaming', 'ai'], ...state });
  await screen.findByTestId('deck');
  await waitFor(() =>
    expect(
      screen.queryAllByTestId(REASON, ICON).length + screen.queryAllByText(/swipes for today/).length,
    ).toBeGreaterThan(0),
  );
}

const press = async (testID: string) => {
  await fireEvent.press(screen.getByTestId(testID));
  await act(async () => jest.advanceTimersByTime(400));
};

beforeEach(() => jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] }));
afterEach(() => jest.useRealTimers());

it('shows a card with the reason it appeared', async () => {
  await openFeed();
  expect(screen.getByTestId('mode-save')).toBeSelected();
  expect(screen.queryByTestId('swipes-left')).not.toBeOnTheScreen(); // first 7 days are unlimited
  expect(screen.getByText(/Not financial advice/)).toBeOnTheScreen();
});

it('saves on a right swipe, with undo', async () => {
  await openFeed();
  const symbol = topSymbol();
  await press('right-button');
  expect(await screen.findByText(`Saved ${symbol} to Needles`)).toBeOnTheScreen();
  await waitFor(async () => expect((await persisted()).watchlist).toEqual([`US:${symbol}`]));

  await fireEvent.press(screen.getByTestId('undo-button'));
  await waitFor(async () => expect((await persisted()).watchlist).toEqual([]));
  expect(topSymbol()).toBe(symbol);
  expect((await persisted()).swipesToday.count).toBe(0);
});

it('undo keeps a stock that was already saved', async () => {
  const everything = SAMPLE_STOCKS.map(stockId);
  await openFeed({ watchlist: everything });
  await press('right-button');
  await fireEvent.press(await screen.findByTestId('undo-button'));
  expect((await persisted()).watchlist).toHaveLength(everything.length);
});

it('skips on a left swipe and counts it', async () => {
  await openFeed();
  const first = topSymbol();
  await press('skip-button');
  expect(topSymbol()).not.toBe(first);
  await waitFor(async () => expect((await persisted()).swipesToday.count).toBe(1));
  expect((await persisted()).seen[0]).toBe(`US:${first}`);
  expect((await persisted()).watchlist).toEqual([]);
});

it('Trade mode without a broker sends you to pick one', async () => {
  await openFeed({ swipeMode: 'trade' });
  expect(screen.getByTestId('right-button')).toHaveAccessibleName('Trade');
  await press('right-button');
  expect(router.push).toHaveBeenCalledWith(expect.stringMatching(/^\/settings\?pickBroker=\d+$/));
});

it('Trade mode opens the broker after the undo window', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  await openFeed({ swipeMode: 'trade', broker: 'moomoo' });
  const symbol = topSymbol();
  await press('right-button');
  expect(await screen.findByText(`Opening ${symbol} in moomoo…`)).toBeOnTheScreen();
  expect(open).not.toHaveBeenCalled();
  expect((await persisted()).traded).toEqual([]);
  await act(async () => jest.advanceTimersByTime(4000));
  expect(open).toHaveBeenCalledWith(`https://www.moomoo.com/stock/${symbol}-US`);
  await waitFor(async () => expect((await persisted()).traded).toEqual([`US:${symbol}`]));
  expect((await persisted()).watchlist).toEqual([]);
});

it('Trade mode undo cancels the hand-off', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  await openFeed({ swipeMode: 'trade', broker: 'tiger' });
  await press('right-button');
  await fireEvent.press(await screen.findByTestId('undo-button'));
  await act(async () => jest.advanceTimersByTime(4000));
  expect(open).not.toHaveBeenCalled();
  expect((await persisted()).traded).toEqual([]);
});

it('switches swipe mode', async () => {
  await openFeed();
  await fireEvent.press(screen.getByTestId('mode-trade'));
  expect(screen.getByTestId('mode-trade')).toBeSelected();
  await waitFor(async () => expect((await persisted()).swipeMode).toBe('trade'));
});

it('shows an ad after 10 swipes for free users, which can be swiped away', async () => {
  await openFeed();
  for (let i = 0; i < 10; i++) await press('skip-button');
  expect(await screen.findByText('SPONSORED')).toBeOnTheScreen();
  await press('skip-button');
  expect(screen.queryByText('SPONSORED')).not.toBeOnTheScreen();
  expect((await persisted()).swipesToday.count).toBe(10);
});

it('stops at the daily limit after the free week', async () => {
  await openFeed({ ...OLD_USER, swipesToday: { date: isoDate(), count: 49 } });
  expect(screen.getByTestId('swipes-left')).toHaveTextContent('1 left');
  await press('skip-button');
  expect(await screen.findByText('That’s your 50 swipes for today')).toBeOnTheScreen();
  expect(screen.getByTestId('skip-button')).toBeDisabled();
  await fireEvent.press(screen.getByTestId('limit-upgrade'));
  expect(router.push).toHaveBeenCalledWith('/paywall');
});

it('uses limits from the dashboard and the admin override', async () => {
  await openFeed({ ...OLD_USER, remoteLimits: { dailySwipes: 20 }, swipesToday: { date: isoDate(), count: 5 } });
  expect(screen.getByTestId('swipes-left')).toHaveTextContent('15 left');
  screen.unmount();
  await openFeed({
    ...OLD_USER,
    remoteLimits: { dailySwipes: 20 },
    limitOverride: { dailySwipes: 3, adEvery: 2 },
    swipesToday: { date: isoDate(), count: 0 },
  });
  expect(screen.getByTestId('swipes-left')).toHaveTextContent('3 left');
  await press('skip-button');
  await press('skip-button');
  expect(await screen.findByTestId('ad-card')).toBeOnTheScreen();
  await fireEvent.press(screen.getByTestId('ad-remove-ads'));
  expect(router.push).toHaveBeenCalledWith('/paywall');
  await press('skip-button');
  await press('skip-button');
  expect(await screen.findByText('That’s your 3 swipes for today')).toBeOnTheScreen();
});

it('shows no ads when the admin sets the interval to 0', async () => {
  await openFeed({ limitOverride: { adEvery: 0 } });
  for (let i = 0; i < 10; i++) await press('skip-button');
  expect(screen.queryByTestId('ad-card')).not.toBeOnTheScreen();
});

it('Premium users have no limit and no ads', async () => {
  await openFeed({ ...OLD_USER, premium: true, swipesToday: { date: isoDate(), count: 500 } });
  expect(screen.queryByTestId('swipes-left')).not.toBeOnTheScreen();
  for (let i = 0; i < 10; i++) await press('skip-button');
  expect(screen.queryByText('SPONSORED')).not.toBeOnTheScreen();
});

it('shows the filter count and an empty state that clears filters', async () => {
  await renderWithState(<DiscoverScreen />, {
    filters: { ...NO_FILTERS, sectors: ['Healthcare'], caps: ['small'], themes: ['ai'], earningsWithinDays: 14 },
  });
  expect(await screen.findByText('No stocks match your filters')).toBeOnTheScreen();
  expect(screen.getByText('Filters (4)')).toBeOnTheScreen();
  await fireEvent.press(screen.getByText('Clear filters'));
  await screen.findAllByTestId(REASON, ICON);
  expect(screen.getByText('Filters')).toBeOnTheScreen();
});

it('opens filters', async () => {
  await openFeed();
  await fireEvent.press(screen.getByTestId('open-filters'));
  expect(router.push).toHaveBeenCalledWith('/filters');
});

it('keeps refilling the deck as you swipe', async () => {
  await openFeed();
  for (let i = 0; i < 25; i++) await press('skip-button');
  expect(screen.getAllByTestId(REASON, ICON).length).toBeGreaterThan(0);
});

describe('card gestures', () => {
  let handlers: PanResponderCallbacks;
  beforeEach(() => {
    jest.spyOn(PanResponder, 'create').mockImplementation((cfg) => {
      handlers = cfg;
      return { panHandlers: {} } as ReturnType<typeof PanResponder.create>;
    });
  });
  const gesture = (dx: number) => ({ dx, dy: 0, vx: 0, vy: 0 }) as PanResponderGestureState;

  it('tapping a card opens its details', async () => {
    await openFeed();
    const symbol = topSymbol();
    handlers.onPanResponderRelease!({} as never, gesture(0));
    expect(router.push).toHaveBeenCalledWith(`/stock/US%3A${symbol}`);
  });

  it('the limit card cannot be swiped or tapped open', async () => {
    await openFeed({ ...OLD_USER, swipesToday: { date: isoDate(), count: 50 } });
    expect(await screen.findByText('That’s your 50 swipes for today')).toBeOnTheScreen();
    handlers.onPanResponderRelease!({} as never, gesture(0));
    handlers.onPanResponderRelease!({} as never, gesture(500));
    await act(async () => jest.advanceTimersByTime(400));
    expect(router.push).not.toHaveBeenCalled();
  });
});
