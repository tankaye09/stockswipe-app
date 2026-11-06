// The hay and needle graphics, used on the swipe stamps and on the buttons
// under the deck. Skipping a card is hay: a dull wheat stalk. Keeping
// it is the needle: golden, with a sparkle. Drawn with react-native-svg so
// they look the same on iOS and Android.
import React from 'react';
import Svg, { Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

const STRAW = '#9A8B66';
const STRAW_DARK = '#7A6E50';

/** Grains on the wheat head, from the bottom up, as [x, y, tilt]: pairs leaning out either side. */
const GRAINS: [number, number, number][] = [44, 37, 30, 23, 16].flatMap((y): [number, number, number][] => [
  [45.8, y, -28],
  [54.2, y + 2, 28],
]);

/** A four-pointed sparkle centred on (x, y). */
const sparkle = (x: number, y: number, r: number) => {
  const k = r * 0.18;
  return (
    `M${x} ${y - r} Q${x + k} ${y - k} ${x + r} ${y} Q${x + k} ${y + k} ${x} ${y + r} ` +
    `Q${x - k} ${y + k} ${x - r} ${y} Q${x - k} ${y - k} ${x} ${y - r} Z`
  );
};

/** The hay: a wheat stalk, the kind you chew on, in dull straw colours. Leans the other way to the needle. */
export function Hay({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <G transform="translate(4 4) rotate(-20 50 50)" fill="none" strokeLinecap="round">
        <Path d="M50 94 Q48 72 50 46" stroke={STRAW_DARK} strokeWidth={3.2} />
        {GRAINS.map(([x, y, tilt]) => {
          const out = Math.sign(tilt);
          return (
            <G key={`${x}-${y}`}>
              <Path d={`M${x + out * 2} ${y - 4} L${x + out * 9} ${y - 14}`} stroke={STRAW_DARK} strokeWidth={1.1} />
              <Ellipse
                cx={x}
                cy={y}
                rx={3.4}
                ry={6}
                transform={`rotate(${tilt} ${x} ${y})`}
                fill={STRAW}
                stroke={STRAW_DARK}
                strokeWidth={0.8}
              />
            </G>
          );
        })}
        <Path d="M50 5 V-4" stroke={STRAW_DARK} strokeWidth={1.1} />
        <Ellipse cx={50} cy={10} rx={3} ry={5.5} fill={STRAW} stroke={STRAW_DARK} strokeWidth={0.8} />
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
