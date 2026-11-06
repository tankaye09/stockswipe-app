// Hand-off to the user's own broker. We never place orders ourselves: we just
// open the broker's page for the stock so the user decides there.
//
// Users without a broker can open an account through a referral link, which
// is how Haystack earns from brokers. Referral links are set in config
// (EXPO_PUBLIC_REFERRAL_*); until then the broker's normal sign-up page opens.
//
// TODO before launch: confirm each broker's official deep link / universal link
// format as part of the referral partnership. The quote URLs below are best
// guesses at public quote pages; IBKR has no public per-stock page, so it
// opens the IBKR site.
import { Linking } from 'react-native';
import type { Market } from '../data/types';
import { REFERRAL_URLS } from '../monetization/config';

export type BrokerId = 'moomoo' | 'tiger' | 'ibkr';

interface Broker {
  id: BrokerId;
  name: string;
  quoteUrl: (symbol: string, market: Market) => string;
  /** Public account opening page, used when no referral link is set. */
  signUpUrl: string;
}

export const BROKERS: Broker[] = [
  {
    id: 'moomoo',
    name: 'moomoo',
    quoteUrl: (symbol, market) =>
      `https://www.moomoo.com/stock/${encodeURIComponent(symbol)}-${market === 'SGX' ? 'SG' : 'US'}`,
    signUpUrl: 'https://www.moomoo.com/sg/',
  },
  {
    id: 'tiger',
    name: 'Tiger Brokers',
    quoteUrl: (symbol, market) =>
      `https://www.itiger.com/stock/${encodeURIComponent(market === 'SGX' ? `${symbol}.SI` : symbol)}`,
    signUpUrl: 'https://www.tigerbrokers.com.sg/',
  },
  {
    id: 'ibkr',
    name: 'Interactive Brokers',
    quoteUrl: () => 'https://www.interactivebrokers.com/',
    signUpUrl: 'https://www.interactivebrokers.com.sg/',
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

/** The account opening link for a broker: our referral link when one is set, otherwise their sign-up page. */
export function signUpLink(id: BrokerId, referrals: Partial<Record<BrokerId, string>> = REFERRAL_URLS) {
  const referral = referrals[id];
  return { url: referral ?? brokerById(id).signUpUrl, isReferral: !!referral };
}

export async function openBrokerSignUp(id: BrokerId): Promise<boolean> {
  try {
    await Linking.openURL(signUpLink(id).url);
    return true;
  } catch {
    return false;
  }
}
