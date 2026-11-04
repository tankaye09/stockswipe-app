import type { MaterialIcon, SFSymbolIcon } from 'expo-router/native-tabs';

/** One tab in the bottom bar. `name` is the route under `src/app/(tabs)`. */
export interface TabSpec {
  name: string;
  label: string;
  /** SF Symbol on iOS: outline when idle, filled when selected, like Apple's own apps. */
  sf: NonNullable<SFSymbolIcon['sf']>;
  /** Material Symbol on Android. */
  md: MaterialIcon['md'];
}

export const TABS: readonly TabSpec[] = [
  {
    name: 'index',
    label: 'Discover',
    sf: { default: 'rectangle.stack', selected: 'rectangle.stack.fill' },
    md: 'stacks',
  },
  { name: 'watchlist', label: 'Watchlist', sf: { default: 'star', selected: 'star.fill' }, md: 'star' },
  { name: 'portfolio', label: 'Paper', sf: { default: 'chart.bar', selected: 'chart.bar.fill' }, md: 'bar_chart' },
  {
    name: 'settings',
    label: 'Settings',
    sf: { default: 'gearshape', selected: 'gearshape.fill' },
    md: 'settings',
  },
];
