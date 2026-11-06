// The hay and needle "coins", used on the swipe stamps and on the buttons
// under the deck. Skipping a card is hay: a dark coin with a pale wheat stalk.
// Keeping it is the needle: a gold coin with a white needle. Each coin is one
// SVG (disc and glyph), drawn with react-native-svg so iOS and Android match.
import React from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

/** Hay coin colours: a dull, dark disc and a pale straw glyph. */
const HAY_DISC = '#3A3A40';
const HAY_GLYPH = '#CFC6AE';
/** Needle coin colours: a warm gold disc (light at the top) and a white needle. */
const GOLD_TOP = '#FFD27A';
const GOLD_BOTTOM = '#E09A1A';
const NEEDLE = '#FFFFFF';
const NEEDLE_EYE = '#E3A126';

// The coins are drawn on a 48 grid. Each glyph sits on a 24 grid in the middle,
// the same grid as the tab bar icons.
const GLYPH_AT = 'translate(12 12)';

/** Wheat grains as [cx, cy, tilt], in pairs leaning out either side of the stalk. */
const GRAINS: [number, number, number][] = [
  [9.7, 13, -35],
  [14.3, 13, 35],
  [9.7, 8.6, -35],
  [14.3, 8.6, 35],
];

/** The hay coin: a pale wheat stalk on a dark disc. */
export function HayCoin({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Circle cx={24} cy={24} r={24} fill={HAY_DISC} />
      <G transform={GLYPH_AT}>
        <G transform="rotate(-18 12 12)" fill={HAY_GLYPH}>
          <Rect x={11.1} y={9} width={1.8} height={13.5} rx={0.9} />
          {GRAINS.map(([cx, cy, tilt]) => (
            <Ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx={1.6} ry={2.6} transform={`rotate(${tilt} ${cx} ${cy})`} />
          ))}
          <Ellipse cx={12} cy={4.6} rx={1.5} ry={2.6} />
        </G>
      </G>
    </Svg>
  );
}

/** The needle coin: a white needle, its eye showing the gold, on a gold disc. */
export function NeedleCoin({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Defs>
        <LinearGradient id="needleGold" x1="0.2" y1="0" x2="0.8" y2="1">
          <Stop offset="0" stopColor={GOLD_TOP} />
          <Stop offset="1" stopColor={GOLD_BOTTOM} />
        </LinearGradient>
      </Defs>
      <Circle cx={24} cy={24} r={24} fill="url(#needleGold)" />
      <G transform={GLYPH_AT}>
        <G transform="rotate(30 12 12)">
          <Path d="M12 23 10.3 6.8Q10.3 2.2 12 2.2T13.7 6.8Z" fill={NEEDLE} />
          <Rect x={11.35} y={4} width={1.3} height={4.2} rx={0.65} fill={NEEDLE_EYE} />
        </G>
      </G>
    </Svg>
  );
}
