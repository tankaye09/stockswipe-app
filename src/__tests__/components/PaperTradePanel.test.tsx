import { screen, userEvent } from '@testing-library/react-native';
import React from 'react';
import { PaperTradePanel } from '../../components/PaperTradePanel';
import { idOf, persisted, renderWithState, sample } from '../../test-utils';

const user = () => userEvent.setup();

it('buys shares with virtual cash', async () => {
  await renderWithState(<PaperTradePanel stock={sample('AAPL')} />);
  const qty = await screen.findByLabelText('Number of shares');
  await user().clear(qty);
  await user().type(qty, '10');
  await user().press(screen.getByRole('button', { name: 'Buy' }));
  expect(await screen.findByText('Buy 10 AAPL at $241.30')).toBeOnTheScreen();
  expect(screen.getByText(/You hold 10 at \$241\.30/)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Sell' })).toBeOnTheScreen();
  expect((await persisted()).paper.positions).toEqual([{ id: idOf('AAPL'), qty: 10, avgPrice: 241.3 }]);
});

it('shows why a trade was rejected', async () => {
  await renderWithState(<PaperTradePanel stock={sample('AAPL')} />);
  const qty = await screen.findByLabelText('Number of shares');
  await user().clear(qty);
  await user().type(qty, '100000');
  await user().press(screen.getByRole('button', { name: 'Short' }));
  expect(await screen.findByText('Not enough virtual cash.')).toBeOnTheScreen();
});

it('offers Short and Cover for a short position, with the FX note for SGX', async () => {
  await renderWithState(<PaperTradePanel stock={sample('D05')} />, {
    paper: { cashUsd: 90_000, trades: [], positions: [{ id: idOf('D05'), qty: -100, avgPrice: 60 }] },
  });
  expect(await screen.findByText(/You hold 100 short at S\$60\.00/)).toBeOnTheScreen();
  expect(screen.getByText(/S\$1 = US\$0.77/)).toBeOnTheScreen();
  expect(screen.getByText('+S$760.00')).toBeOnTheScreen();
  await user().press(screen.getByRole('button', { name: 'Cover' }));
  expect(await screen.findByText('Cover 1 D05 at S$52.40')).toBeOnTheScreen();
});

it('shows losses in red with a minus sign', async () => {
  await renderWithState(<PaperTradePanel stock={sample('AAPL')} />, {
    paper: { cashUsd: 90_000, trades: [], positions: [{ id: idOf('AAPL'), qty: 1, avgPrice: 300 }] },
  });
  expect(await screen.findByText('-$58.70')).toBeOnTheScreen();
});
