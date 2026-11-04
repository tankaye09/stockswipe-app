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

export const THEME_EMOJI: Record<Theme, string> = {
  ai: '🤖',
  gaming: '🎮',
  'coffee-food': '☕',
  'clean-energy': '🌱',
  ev: '🚗',
  banking: '🏦',
  travel: '✈️',
  health: '💊',
  shopping: '🛍️',
  streaming: '📺',
  semiconductors: '💾',
  property: '🏢',
  dividends: '💰',
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
