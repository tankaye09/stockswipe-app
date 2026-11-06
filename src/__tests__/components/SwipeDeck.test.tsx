import { act, render, screen } from '@testing-library/react-native';
import React, { createRef } from 'react';
import { PanResponder, Text, type PanResponderCallbacks, type PanResponderGestureState } from 'react-native';
import { SwipeDeck, type SwipeDeckHandle } from '../../components/SwipeDeck';

type Card = { id: string; locked?: boolean };

let handlers: PanResponderCallbacks;
beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(PanResponder, 'create').mockImplementation((cfg) => {
    handlers = cfg;
    return { panHandlers: {} } as ReturnType<typeof PanResponder.create>;
  });
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const g = (over: Partial<PanResponderGestureState>) =>
  ({ dx: 0, dy: 0, vx: 0, vy: 0, ...over }) as PanResponderGestureState;
const evt = {} as never;

async function setup(items: Card[] = [{ id: 'a' }, { id: 'b' }]) {
  const onSwipe = jest.fn();
  const onTap = jest.fn();
  const ref = createRef<SwipeDeckHandle>();
  await render(
    <SwipeDeck<Card>
      ref={ref}
      items={items}
      keyOf={(c) => c.id}
      render={(c) => <Text>card {c.id}</Text>}
      onSwipe={onSwipe}
      onTap={onTap}
      rightColor="green"
      canSwipe={(c) => !c.locked}
    />,
  );
  return { onSwipe, onTap, ref };
}

const finishAnimation = () => act(async () => jest.advanceTimersByTime(1000));

it('shows the top card and the next one behind it', async () => {
  await setup();
  expect(screen.getByText('card a')).toBeOnTheScreen();
  expect(screen.getByText('card b')).toBeOnTheScreen();
  // Graphics, not words, so they are found by testID and named for screen readers.
  expect(screen.getByTestId('stamp-needle')).toHaveAccessibleName('Needle');
  expect(screen.getByTestId('stamp-hay')).toHaveAccessibleName('Hay');
});

it('renders nothing when empty', async () => {
  await setup([]);
  expect(screen.queryByText(/card/)).not.toBeOnTheScreen();
});

it('swipes right past the threshold', async () => {
  const { onSwipe } = await setup();
  expect(handlers.onStartShouldSetPanResponder!(evt, g({}))).toBe(true);
  expect(handlers.onMoveShouldSetPanResponder!(evt, g({ dx: 20 }))).toBe(true);
  expect(handlers.onMoveShouldSetPanResponder!(evt, g({ dx: 1 }))).toBe(false);
  handlers.onPanResponderMove!(evt, g({ dx: 200, dy: 10 }));
  handlers.onPanResponderRelease!(evt, g({ dx: 300 }));
  await finishAnimation();
  expect(onSwipe).toHaveBeenCalledWith({ id: 'a' }, 'right');
});

it('swipes left on a fast fling', async () => {
  const { onSwipe } = await setup();
  handlers.onPanResponderRelease!(evt, g({ dx: -30, vx: -2 }));
  await finishAnimation();
  expect(onSwipe).toHaveBeenCalledWith({ id: 'a' }, 'left');
});

it('springs back on a short drag', async () => {
  const { onSwipe } = await setup();
  handlers.onPanResponderRelease!(evt, g({ dx: 20 }));
  handlers.onPanResponderTerminate!(evt, g({}));
  await finishAnimation();
  expect(onSwipe).not.toHaveBeenCalled();
});

it('treats a tiny movement as a tap', async () => {
  const { onSwipe, onTap } = await setup();
  handlers.onPanResponderRelease!(evt, g({ dx: 1, dy: 1 }));
  expect(onTap).toHaveBeenCalledWith({ id: 'a' });
  expect(onSwipe).not.toHaveBeenCalled();
});

it('does not swipe locked cards', async () => {
  const { onSwipe } = await setup([{ id: 'x', locked: true }]);
  handlers.onPanResponderRelease!(evt, g({ dx: 400 }));
  await finishAnimation();
  expect(onSwipe).not.toHaveBeenCalled();
});

it('can be swiped from buttons and ignores input while animating', async () => {
  const { onSwipe, ref } = await setup();
  await act(async () => {
    ref.current!.swipe('left');
    ref.current!.swipe('right'); // ignored: already animating
  });
  handlers.onPanResponderMove!(evt, g({ dx: 50 })); // ignored while busy
  handlers.onPanResponderRelease!(evt, g({ dx: 400 })); // ignored while busy
  await finishAnimation();
  expect(onSwipe).toHaveBeenCalledTimes(1);
  expect(onSwipe).toHaveBeenCalledWith({ id: 'a' }, 'left');
});

it('ignores gestures and button swipes when there are no cards', async () => {
  const { onSwipe, onTap, ref } = await setup([]);
  handlers.onPanResponderMove!(evt, g({ dx: 50 }));
  handlers.onPanResponderRelease!(evt, g({ dx: 1 }));
  ref.current?.swipe('right');
  await finishAnimation();
  expect(onSwipe).not.toHaveBeenCalled();
  expect(onTap).not.toHaveBeenCalled();
});
