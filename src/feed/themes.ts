import type { IconName } from '../components/Icon';
import type { CapBucket, Sector, Theme } from '../data/types';

export const THEME_LABELS: Record<Theme, string> = {
  ai: 'AI',
  gaming: 'Gaming',
  'coffee-food': 'Coffee & food',
  'clean-energy': 'Clean energy',
  ev: 'Electric cars',
  banking: 'Banks & fintech',
  travel: 'Travel',
  health: 'Health',
  shopping: 'Shopping',
  streaming: 'Streaming',
  semiconductors: 'Chips',
  property: 'Property & REITs',
  dividends: 'Dividends',
};

/** The icon shown beside each interest, from the app's one icon set. */
export const THEME_ICON: Record<Theme, IconName> = {
  ai: 'ai',
  gaming: 'gamepad',
  'coffee-food': 'coffee',
  'clean-energy': 'leaf',
  ev: 'car',
  banking: 'landmark',
  travel: 'plane',
  health: 'pill',
  shopping: 'shopping',
  streaming: 'tv',
  semiconductors: 'chip',
  property: 'building',
  dividends: 'coins',
};

export const ALL_THEMES = Object.keys(THEME_LABELS) as Theme[];

export const ALL_SECTORS: Sector[] = [
  'Technology',
  'Consumer',
  'Financials',
  'Healthcare',
  'Energy',
  'Industrials',
  'Communication',
  'Real Estate',
];

export const CAP_LABELS: Record<CapBucket, string> = {
  mega: 'Mega (US$200B+)',
  large: 'Large (US$10B+)',
  mid: 'Mid (US$2B+)',
  small: 'Small',
};
