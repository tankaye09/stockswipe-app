import React from 'react';
import type { ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

/**
 * Tab bar icons drawn in the style of Apple's SF Symbols: a 24pt grid,
 * rounded caps and joins, an outline when the tab is idle and a filled
 * shape when it is selected. Drawn here (not SF Symbols themselves) so the
 * same set works on iOS and Android.
 *
 * Every shape sets `fill` itself: react-native-svg paints shapes black
 * unless told otherwise.
 */
export type TabIconName = 'discover' | 'watchlist' | 'paper' | 'settings';

interface Props {
  name: TabIconName;
  color: ColorValue;
  focused: boolean;
  size?: number;
}

const STROKE = 1.8;

const STAR = 'M12 3.3L14.53 9.12L20.84 9.73L16.09 13.93L17.47 20.12L12 16.9L6.53 20.12L7.91 13.93L3.16 9.73L9.47 9.12Z';

const GEAR =
  'M10.14 5.05L10.5 2.52L13.5 2.52L13.86 5.05L15.6 5.76L17.64 4.23L19.77 6.36L18.24 8.4L18.95 10.14' +
  'L21.48 10.5L21.48 13.5L18.95 13.86L18.24 15.6L19.77 17.64L17.64 19.77L15.6 18.24L13.86 18.95' +
  'L13.5 21.48L10.5 21.48L10.14 18.95L8.4 18.24L6.36 19.77L4.23 17.64L5.76 15.6L5.05 13.86' +
  'L2.52 13.5L2.52 10.5L5.05 10.14L5.76 8.4L4.23 6.36L6.36 4.23L8.4 5.76Z';

/** A circle drawn as a path, so it can be cut out of the gear with evenodd. */
const GEAR_HOLE = 'M15.2 12A3.2 3.2 0 1 1 8.8 12A3.2 3.2 0 1 1 15.2 12Z';

const BARS = [
  { x: 3.5, y: 13, height: 7.5 },
  { x: 9.75, y: 8, height: 12.5 },
  { x: 16, y: 3.5, height: 17 },
];

function glyph(name: TabIconName, color: ColorValue, focused: boolean) {
  const fill = focused ? color : 'none';
  switch (name) {
    case 'discover':
      // A card in front of another, like "square.on.square".
      return (
        <>
          <Path d="M7.5 7.5V6.5a3 3 0 0 1 3-3h7a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-1" fill="none" />
          <Rect x={3.5} y={7.5} width={13} height={13} rx={3} fill={fill} />
        </>
      );
    case 'watchlist':
      return <Path d={STAR} fill={fill} />;
    case 'paper':
      // Rising bars, like "chart.bar".
      return BARS.map((bar) => (
        <Rect key={bar.x} x={bar.x} y={bar.y} width={4.5} height={bar.height} rx={1.5} fill={fill} />
      ));
    case 'settings':
      return focused ? (
        <Path d={GEAR + GEAR_HOLE} fill={color} fillRule="evenodd" />
      ) : (
        <>
          <Path d={GEAR} fill="none" />
          <Circle cx={12} cy={12} r={3.2} fill="none" />
        </>
      );
  }
}

export function TabIcon({ name, color, focused, size = 24 }: Props) {
  return (
    <Svg
      testID={`tab-icon-${name}${focused ? '-filled' : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {glyph(name, color, focused)}
    </Svg>
  );
}
