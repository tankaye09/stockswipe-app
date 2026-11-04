import type { SFSymbolIcon } from 'expo-router/native-tabs';
import type { TabIconName } from '../components/TabIcon';

/** One tab in the bottom bar. `name` is the route under `src/app/(tabs)`. */
export interface TabSpec {
  name: string;
  label: string;
  /** iOS: SF Symbol, outlined when idle and filled when selected, like Apple's own apps. */
  sf: NonNullable<SFSymbolIcon['sf']>;
  /** Android: our own icon drawn in the same style (see TabIcon). */
  icon: TabIconName;
}

export const TABS: readonly TabSpec[] = [
  {
    name: 'index',
    label: 'Discover',
    sf: { default: 'rectangle.stack', selected: 'rectangle.stack.fill' },
    icon: 'discover',
  },
  { name: 'watchlist', label: 'Watchlist', sf: { default: 'star', selected: 'star.fill' }, icon: 'watchlist' },
  { name: 'portfolio', label: 'Paper', sf: { default: 'chart.bar', selected: 'chart.bar.fill' }, icon: 'paper' },
  {
    name: 'settings',
    label: 'Settings',
    sf: { default: 'gearshape', selected: 'gearshape.fill' },
    icon: 'settings',
  },
];
