// The graphics shown on a card while it is dragged, in the style of the
// Haystack logo (concept C): gold straws that are also a bar chart, and a
// silver needle. Skipping a card shows the hay, keeping it shows the needle.
// Drawn with react-native-svg so they look the same on iOS and Android.
import React from 'react';
import Svg, { G, Path, Rect } from 'react-native-svg';

const HAY = '#F5B83D';
const STEEL = '#F2F5F8';
const EYE = '#0B0F14';

/** Seven rounded straws rising to a mound, like a bar chart. */
const STRAWS = 'M20 74 V60 M30 74 V48 M40 74 V36 M50 74 V28 M60 74 V36 M70 74 V48 M80 74 V60';

/** A four-pointed sparkle centred on (x, y). */
const sparkle = (x: number, y: number, r: number) => {
  const k = r * 0.18;
  return (
    `M${x} ${y - r} Q${x + k} ${y - k} ${x + r} ${y} Q${x + k} ${y + k} ${x} ${y + r} ` +
    `Q${x - k} ${y + k} ${x - r} ${y} Q${x - k} ${y - k} ${x} ${y - r} Z`
  );
};

/** The hay: a mound of gold straws. */
export function Hay({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d={STRAWS} stroke={HAY} strokeWidth={6.5} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** The needle: silver, with its eye cut out and a sparkle beside it. */
export function Needle({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <G transform="rotate(20 50 50)">
        <Path d="M50 90 L45 30 Q45 12 50 12 Q55 12 55 30 Z" fill={STEEL} />
        <Rect x={48.3} y={18} width={3.4} height={12} rx={1.7} fill={EYE} />
      </G>
      <Path d={sparkle(28, 28, 8)} fill={HAY} />
    </Svg>
  );
}
