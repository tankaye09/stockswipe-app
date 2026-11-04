// Hand-off to the user's own broker. We never place orders ourselves: we just
// open the broker's page for the stock so the user decides there.
//
// TODO before launch: confirm each broker's official deep link / universal link
// format (ideally as part of a referral partnership) and add referral codes.
// The URLs below are best guesses at public quote pages; IBKR has no public
// per-stock page, so it opens the IBKR site.
import { Linking } from 'react-native';
import type { Market } from '../data/types';

export type BrokerId = 'moomoo' | 'tiger' | 'ibkr';

interface Broker {
  id: BrokerId;
  name: string;
  quoteUrl: (symbol: string, market: Market) => string;
}

export const BROKERS: Broker[] = [
  {
    id: 'moomoo',
    name: 'moomoo',
    quoteUrl: (symbol, market) =>
      `https://www.moomoo.com/stock/${encodeURIComponent(symbol)}-${market === 'SGX' ? 'SG' : 'US'}`,
  },
  {
    id: 'tiger',
    name: 'Tiger Brokers',
    quoteUrl: (symbol, market) =>
      `https://www.itiger.com/stock/${encodeURIComponent(market === 'SGX' ? `${symbol}.SI` : symbol)}`,
  },
  {
    id: 'ibkr',
    name: 'Interactive Brokers',
    quoteUrl: () => 'https://www.interactivebrokers.com/',
  },
];

export const brokerById = (id: BrokerId) => BROKERS.find((b) => b.id === id)!;

export async function openInBroker(id: BrokerId, symbol: string, market: Market): Promise<boolean> {
  try {
    await Linking.openURL(brokerById(id).quoteUrl(symbol, market));
    return true;
  } catch {
    return false;
  }
}
