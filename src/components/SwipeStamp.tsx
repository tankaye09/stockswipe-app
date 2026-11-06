// The hay and needle graphics, used on the swipe stamps and on the buttons
// under the deck. Skipping a card is hay: one loose, dull straw. Keeping
// it is the needle: golden, with a sparkle. Drawn with react-native-svg so
// they look the same on iOS and Android.
import React from 'react';
import Svg, { Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

const STRAW = '#9A8B66';
const STRAW_NODE = '#75694C';

/** A four-pointed sparkle centred on (x, y). */
const sparkle = (x: number, y: number, r: number) => {
  const k = r * 0.18;
  return (
    `M${x} ${y - r} Q${x + k} ${y - k} ${x + r} ${y} Q${x + k} ${y + k} ${x} ${y + r} ` +
    `Q${x - k} ${y + k} ${x - r} ${y} Q${x - k} ${y - k} ${x} ${y - r} Z`
  );
};

/** The hay: a single loose, dull straw with a frayed tip, leaning the other way to the needle. */
export function Hay({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <G transform="rotate(-20 50 50)" fill="none" strokeLinecap="round">
        <Path d="M50 90 Q47 60 50 28" stroke={STRAW} strokeWidth={6.5} />
        <Path d="M50 28 L46 14 M50 28 L51 11 M50 28 L55 15" stroke={STRAW} strokeWidth={2.6} />
        <Path d="M45 58 H52.5" stroke={STRAW_NODE} strokeWidth={3} />
      </G>
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
