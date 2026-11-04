// A Tinder-style card stack built on React Native's own PanResponder and
// Animated, so it runs in Expo Go with no extra native modules.
import React, { forwardRef, useImperativeHandle, useLayoutEffect, useState } from 'react';
import { Animated, Dimensions, PanResponder, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';

export type SwipeDir = 'left' | 'right';

export interface SwipeDeckHandle {
  swipe: (dir: SwipeDir) => void;
}

interface Props<T> {
  items: T[];
  keyOf: (item: T) => string;
  render: (item: T) => React.ReactNode;
  onSwipe: (item: T, dir: SwipeDir) => void;
  onTap?: (item: T) => void;
  /** Label shown when dragging right, e.g. "SAVE" or "TRADE". */
  rightLabel: string;
  rightColor: string;
  /** Some cards (ads, limits) can disable swiping. */
  canSwipe?: (item: T) => boolean;
}

const SCREEN_W = Dimensions.get('window').width;
const THRESHOLD = SCREEN_W * 0.28;
const TAP_SLOP = 6;

/** Creates the drag position, pan responder and fling animation for one deck. */
function createGestures<T>(initialProps: Props<T>) {
  const pos = new Animated.ValueXY();
  let props = initialProps;
  const getProps = () => props;
  const setProps = (next: Props<T>) => {
    props = next;
  };
  let busy = false;
  const fling = (dir: SwipeDir, vy = 0) => {
    const current = getProps().items[0];
    if (!current || busy) return;
    busy = true;
    Animated.timing(pos, {
      toValue: { x: (dir === 'right' ? 1.5 : -1.5) * SCREEN_W, y: vy * 40 },
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      pos.setValue({ x: 0, y: 0 });
      busy = false;
      getProps().onSwipe(current, dir);
    });
  };
  const springBack = () =>
    Animated.spring(pos, { toValue: { x: 0, y: 0 }, friction: 6, useNativeDriver: true }).start();

  const responder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > TAP_SLOP || Math.abs(g.dy) > TAP_SLOP,
    onPanResponderMove: (_, g) => {
      if (busy || !getProps().items[0]) return;
      pos.setValue({ x: g.dx, y: g.dy * 0.3 });
    },
    onPanResponderRelease: (_, g) => {
      const item = getProps().items[0];
      if (!item || busy) return;
      if (Math.abs(g.dx) < TAP_SLOP && Math.abs(g.dy) < TAP_SLOP) {
        getProps().onTap?.(item);
        return;
      }
      const allowed = getProps().canSwipe?.(item) ?? true;
      if (allowed && (g.dx > THRESHOLD || g.vx > 0.8)) fling('right', g.vy);
      else if (allowed && (g.dx < -THRESHOLD || g.vx < -0.8)) fling('left', g.vy);
      else springBack();
    },
    onPanResponderTerminate: springBack,
  });
  return { pos, fling, responder, setProps };
}

function SwipeDeckInner<T>(props: Props<T>, ref: React.Ref<SwipeDeckHandle>) {
  const { items, keyOf, render, rightLabel, rightColor } = props;
  // Gestures are created once and kept in sync with the latest props.
  const [gestures] = useState(() => createGestures(props));
  const { pos, fling, responder } = gestures;
  useLayoutEffect(() => {
    gestures.setProps(props);
  });

  useImperativeHandle(ref, () => ({ swipe: (dir) => fling(dir) }), [fling]);

  const top = items[0];
  if (!top) return null;
  const next = items[1];

  const rotate = pos.x.interpolate({ inputRange: [-SCREEN_W, 0, SCREEN_W], outputRange: ['-12deg', '0deg', '12deg'] });
  const rightOpacity = pos.x.interpolate({ inputRange: [0, THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp' });
  const leftOpacity = pos.x.interpolate({ inputRange: [-THRESHOLD, 0], outputRange: [1, 0], extrapolate: 'clamp' });
  const nextScale = pos.x.interpolate({
    inputRange: [-SCREEN_W, 0, SCREEN_W],
    outputRange: [1, 0.95, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.wrap}>
      {next && (
        <Animated.View
          key={keyOf(next)}
          style={[styles.card, { transform: [{ scale: nextScale }] }]}
          pointerEvents="none"
        >
          {render(next)}
        </Animated.View>
      )}
      <Animated.View
        key={keyOf(top)}
        style={[styles.card, { transform: [{ translateX: pos.x }, { translateY: pos.y }, { rotate }] }]}
        {...responder.panHandlers}
      >
        {render(top)}
        <Animated.View style={[styles.stamp, styles.stampRight, { borderColor: rightColor, opacity: rightOpacity }]}>
          <Text style={[styles.stampText, { color: rightColor }]}>{rightLabel}</Text>
        </Animated.View>
        <Animated.View style={[styles.stamp, styles.stampLeft, { borderColor: colors.skip, opacity: leftOpacity }]}>
          <Text style={[styles.stampText, { color: colors.skip }]}>SKIP</Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

export const SwipeDeck = forwardRef(SwipeDeckInner) as <T>(
  props: Props<T> & { ref?: React.Ref<SwipeDeckHandle> },
) => React.ReactElement | null;

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  card: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.lg },
  stamp: {
    position: 'absolute',
    top: 28,
    borderWidth: 3,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  stampRight: { left: 24, transform: [{ rotate: '-14deg' }] },
  stampLeft: { right: 24, transform: [{ rotate: '14deg' }] },
  stampText: { fontSize: 28, fontWeight: '900', letterSpacing: 2 },
});
