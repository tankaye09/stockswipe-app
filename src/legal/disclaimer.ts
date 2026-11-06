// What the app says about advice. Haystack explains companies; it never tells anyone what to buy or sell.

/** One line under the feed and stock pages. */
export function shortDisclaimer(sampleData: boolean): string {
  return `For information and education only. Not financial advice. ${
    sampleData ? 'Sample data.' : 'Prices may be delayed or wrong.'
  }`;
}

/** Shown on onboarding, before the first swipe. */
export const ONBOARDING_DISCLAIMER =
  'Haystack explains companies in plain English. It is not financial advice and never tells you what to buy or sell. Do your own research before you invest.';

/** The fuller version in Settings > About. */
export const ABOUT_DISCLAIMER =
  'Haystack shows information for learning and discovery. It is not financial advice and does not recommend buying or selling any stock. Paper trades use pretend money. Any real trade happens in your broker’s app, and you are responsible for your own investment decisions.';
