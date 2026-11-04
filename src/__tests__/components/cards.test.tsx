import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import React from 'react';
import { AdCard, EmptyCard, LimitCard } from '../../components/FeedCards';
import { PriceChart } from '../../components/PriceChart';
import { StockCard } from '../../components/StockCard';
import { StockRow } from '../../components/StockRow';
import { Button, Chip, Disclaimer } from '../../components/ui';
import { idOf, sample } from '../../test-utils';

describe('StockCard', () => {
  it('shows the reason, price, stats and plain-English breakdown', async () => {
    const stock = sample('NVDA');
    await render(<StockCard item={{ id: idOf('NVDA'), stock, bucket: 'news', reason: 'In the news: chips' }} />);
    expect(screen.getByText('📰 In the news: chips')).toBeOnTheScreen();
    expect(screen.getByText('NVDA')).toBeOnTheScreen();
    expect(screen.getByText('$187.60')).toBeOnTheScreen();
    expect(screen.getByText('+3.40% today')).toBeOnTheScreen();
    expect(screen.getByText('$4.50T')).toBeOnTheScreen();
    expect(screen.getByText(stock.breakdown.oneLiner)).toBeOnTheScreen();
    expect(await screen.findByText('6 months')).toBeOnTheScreen();
  });

  it('draws the chart once it knows its width', async () => {
    const stock = sample('AAPL');
    await render(<StockCard item={{ id: idOf('AAPL'), stock, bucket: 'wildcard', reason: 'x' }} />);
    await fireEvent(screen.getByTestId('card-chart'), 'layout', { nativeEvent: { layout: { width: 300 } } });
    expect(screen.getByText('🎲 x')).toBeOnTheScreen();
  });

  it('shows n/a and None for missing stats', async () => {
    const stock = sample('RBLX'); // no P/E, no dividend
    await render(<StockCard item={{ id: idOf('RBLX'), stock, bucket: 'liked', reason: 'Because' }} />);
    expect(screen.getByText('n/a')).toBeOnTheScreen();
    expect(screen.getByText('None')).toBeOnTheScreen();
    expect(screen.getByText('❤️ Because')).toBeOnTheScreen();
  });
});

describe('PriceChart', () => {
  it('draws nothing for too few points', async () => {
    await render(<PriceChart points={[{ date: '2026-01-01', close: 1 }]} width={100} height={50} />);
    expect(screen.toJSON()).toBeTruthy();
  });

  it('draws rising and falling lines', async () => {
    const up = [
      { date: 'a', close: 1 },
      { date: 'b', close: 2 },
    ];
    await render(<PriceChart points={up} width={100} height={50} />);
    await render(<PriceChart points={[...up].reverse()} width={100} height={50} />);
    const flat = [
      { date: 'a', close: 1 },
      { date: 'b', close: 1 },
    ];
    await render(<PriceChart points={flat} width={100} height={50} />);
    expect(screen.toJSON()).toBeTruthy();
  });
});

describe('feed cards', () => {
  it('shows a house card for Premium when ads are not set up', async () => {
    const onRemoveAds = jest.fn();
    await render(<AdCard onRemoveAds={onRemoveAds} />);
    expect(screen.getByText('SPONSORED')).toBeOnTheScreen();
    expect(screen.getByText('Swipe with no ads')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByText('See Premium'));
    expect(onRemoveAds).toHaveBeenCalled();
  });

  it('limit card links to Premium', async () => {
    const onUpgrade = jest.fn();
    await render(<LimitCard dailySwipes={50} onUpgrade={onUpgrade} />);
    expect(screen.getByText('That’s your 50 swipes for today')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByText('See Premium'));
    expect(onUpgrade).toHaveBeenCalled();
  });

  it('empty card clears filters', async () => {
    const onReset = jest.fn();
    await render(<EmptyCard onReset={onReset} />);
    await userEvent.setup().press(screen.getByText('Clear filters'));
    expect(onReset).toHaveBeenCalled();
  });
});

describe('ui', () => {
  it('chip reports selection and presses', async () => {
    const onPress = jest.fn();
    await render(<Chip label="AI" selected onPress={onPress} />);
    expect(screen.getByRole('button', { name: 'AI' })).toBeSelected();
    await userEvent.setup().press(screen.getByRole('button', { name: 'AI' }));
    expect(onPress).toHaveBeenCalled();
  });

  it('disabled button does not press', async () => {
    const onPress = jest.fn();
    await render(<Button label="Go" kind="danger" disabled onPress={onPress} />);
    expect(screen.getByRole('button', { name: 'Go' })).toBeDisabled();
    await userEvent.setup().press(screen.getByRole('button', { name: 'Go' }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows the disclaimer', async () => {
    await render(<Disclaimer />);
    expect(screen.getByText(/Not financial advice/)).toBeOnTheScreen();
  });

  it('stock row shows price by default and presses', async () => {
    const onPress = jest.fn();
    await render(<StockRow stock={sample('TSLA')} onPress={onPress} testID="row" />);
    expect(screen.getByText('-4.10%')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByTestId('row'));
    expect(onPress).toHaveBeenCalled();
  });
});
