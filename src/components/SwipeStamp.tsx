// The hay and needle graphics, used on the swipe stamps and on the buttons
// under the deck. Skipping a card is hay: a few loose, dull straws. Keeping
// it is the needle: golden, with a sparkle. Drawn with react-native-svg so
// they look the same on iOS and Android.
import React from 'react';
import Svg, { Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

/** Loose straws in muted, slightly different tones, as [path, colour, width]. */
const STRAWS: [string, string, number][] = [
  ['M22 74 L70 22', '#857756', 3.4],
  ['M30 80 L74 34', '#9A8B66', 3.4],
  ['M18 62 L58 20', '#7A6F52', 3],
  ['M40 82 L82 42', '#8C7E5C', 3],
  ['M26 66 L80 50', '#968862', 3],
  ['M34 30 L62 78', '#7D7154', 2.8],
  ['M50 84 L66 58', '#9C8E6A', 2.6],
];

/** A four-pointed sparkle centred on (x, y). */
const sparkle = (x: number, y: number, r: number) => {
  const k = r * 0.18;
  return (
    `M${x} ${y - r} Q${x + k} ${y - k} ${x + r} ${y} Q${x + k} ${y + k} ${x} ${y + r} ` +
    `Q${x - k} ${y + k} ${x - r} ${y} Q${x - k} ${y - k} ${x} ${y - r} Z`
  );
};

/** The hay: a few loose, dull straws. */
export function Hay({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {STRAWS.map(([d, color, width]) => (
        <Path key={d} d={d} stroke={color} strokeWidth={width} strokeLinecap="round" fill="none" />
      ))}
    </Svg>
  );
}

/** The needle: golden, with its eye cut out and a sparkle beside it. */
export function Needle({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#FFE08A" />
          <Stop offset="0.5" stopColor="#F5B83D" />
          <Stop offset="1" stopColor="#C98F12" />
        </LinearGradient>
      </Defs>
      <G transform="rotate(20 50 50)">
        <Path d="M50 90 L45 30 Q45 12 50 12 Q55 12 55 30 Z" fill="url(#gold)" />
        <Rect x={48.3} y={18} width={3.4} height={12} rx={1.7} fill="#0B0F14" />
      </G>
      <Path d={sparkle(28, 28, 8)} fill="#FFF3C9" />
    </Svg>
  );
}
