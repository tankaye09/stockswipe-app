import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { TabIcon, type TabIconName } from '../../components/TabIcon';

const NAMES: TabIconName[] = ['discover', 'watchlist', 'paper', 'settings'];

interface Node {
  type: string;
  props: { fill?: unknown };
  children: Node[] | null;
}

/** How many of the icon's shapes are painted with a solid fill. */
function filledShapes(node: Node): number {
  const own = /Path|Rect|Circle/.test(node.type) && node.props.fill ? 1 : 0;
  return own + (node.children ?? []).reduce((sum, child) => sum + filledShapes(child), 0);
}

describe('TabIcon', () => {
  it.each(NAMES)('draws the %s icon as an outline when idle', async (name) => {
    const { toJSON } = await render(<TabIcon name={name} color="#888" focused={false} />);
    const icon = screen.getByTestId(`tab-icon-${name}`);
    expect(icon).toHaveProp('width', 24);
    expect(icon).toHaveProp('stroke', '#888');
    expect(filledShapes(toJSON() as Node)).toBe(0);
  });

  it.each(NAMES)('draws the %s icon filled when selected', async (name) => {
    const { toJSON } = await render(<TabIcon name={name} color="#5B8CFF" focused size={28} />);
    expect(screen.getByTestId(`tab-icon-${name}-filled`)).toHaveProp('width', 28);
    expect(filledShapes(toJSON() as Node)).toBeGreaterThan(0);
  });
});
