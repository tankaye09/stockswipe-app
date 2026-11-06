import ArrowUpRight from 'lucide-react-native/icons/arrow-up-right';
import Ban from 'lucide-react-native/icons/ban';
import BrainCircuit from 'lucide-react-native/icons/brain-circuit';
import Building from 'lucide-react-native/icons/building';
import CarFront from 'lucide-react-native/icons/car-front';
import Coffee from 'lucide-react-native/icons/coffee';
import Coins from 'lucide-react-native/icons/coins';
import Cpu from 'lucide-react-native/icons/cpu';
import Dices from 'lucide-react-native/icons/dices';
import Gamepad2 from 'lucide-react-native/icons/gamepad-2';
import Heart from 'lucide-react-native/icons/heart';
import Hourglass from 'lucide-react-native/icons/hourglass';
import InfinityIcon from 'lucide-react-native/icons/infinity';
import Landmark from 'lucide-react-native/icons/landmark';
import Leaf from 'lucide-react-native/icons/leaf';
import Newspaper from 'lucide-react-native/icons/newspaper';
import Pill from 'lucide-react-native/icons/pill';
import Plane from 'lucide-react-native/icons/plane';
import SearchX from 'lucide-react-native/icons/search-x';
import ShoppingBag from 'lucide-react-native/icons/shopping-bag';
import Sparkles from 'lucide-react-native/icons/sparkles';
import Star from 'lucide-react-native/icons/star';
import Tv from 'lucide-react-native/icons/tv';
import X from 'lucide-react-native/icons/x';
import React from 'react';

/**
 * Every icon in the app outside the tab bar, from Lucide. Lucide is drawn on
 * the same 24pt grid with rounded caps and joins as `TabIcon`, and we use the
 * same stroke width, so the two read as one set on iOS and Android.
 *
 * Icons are imported one by one so the bundle only carries the ones we use.
 * To add one, import it here and give it a name in `ICONS`.
 */
const ICONS = {
  ai: BrainCircuit,
  ban: Ban,
  building: Building,
  car: CarFront,
  chip: Cpu,
  close: X,
  coffee: Coffee,
  coins: Coins,
  dice: Dices,
  external: ArrowUpRight,
  gamepad: Gamepad2,
  heart: Heart,
  hourglass: Hourglass,
  infinity: InfinityIcon,
  landmark: Landmark,
  leaf: Leaf,
  newspaper: Newspaper,
  noResults: SearchX,
  pill: Pill,
  plane: Plane,
  shopping: ShoppingBag,
  sparkles: Sparkles,
  star: Star,
  tv: Tv,
};

export type IconName = keyof typeof ICONS;

/** Matches `TabIcon`, so tab bar and in-app icons have the same weight. */
export const ICON_STROKE = 1.8;

interface Props {
  name: IconName;
  color: string;
  size?: number;
  /** Fill the shape too, like a selected tab (for example a saved star). */
  filled?: boolean;
  testID?: string;
}

export function Icon({ name, color, size = 20, filled = false, testID }: Props) {
  const Glyph = ICONS[name];
  return (
    <Glyph
      testID={testID ?? `icon-${name}${filled ? '-filled' : ''}`}
      color={color}
      size={size}
      strokeWidth={ICON_STROKE}
      fill={filled ? color : 'none'}
    />
  );
}
