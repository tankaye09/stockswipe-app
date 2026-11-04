import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import type { PricePoint } from '../data/types';
import { colors } from '../theme';

interface Props {
  points: PricePoint[];
  width: number;
  height: number;
}

/** Simple line chart, green if the range ended up, red if down. */
export function PriceChart({ points, width, height }: Props) {
  const { line, area, up } = useMemo(() => {
    if (points.length < 2) return { line: '', area: '', up: true };
    const closes = points.map((p) => p.close);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const span = max - min || 1;
    const pad = 4;
    const x = (i: number) => (i / (points.length - 1)) * width;
    const y = (v: number) => pad + (1 - (v - min) / span) * (height - pad * 2);
    const line = closes.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const area = `${line} L${width},${height} L0,${height} Z`;
    return { line, area, up: closes[closes.length - 1] >= closes[0] };
  }, [points, width, height]);

  const stroke = up ? colors.up : colors.down;
  if (!line) return <View style={{ width, height }} />;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={stroke} stopOpacity={0.25} />
          <Stop offset="1" stopColor={stroke} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={area} fill="url(#fill)" />
      <Path d={line} stroke={stroke} strokeWidth={2} fill="none" strokeLinejoin="round" />
    </Svg>
  );
}
