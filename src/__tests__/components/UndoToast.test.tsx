import { act, render, renderHook, screen, userEvent } from '@testing-library/react-native';
import React from 'react';
import { UndoToast, useUndo } from '../../components/UndoToast';

describe('useUndo', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('expires after the timeout and calls onExpire', async () => {
    const onExpire = jest.fn();
    const onUndo = jest.fn();
    const { result } = await renderHook(() => useUndo(1000));
    await act(async () => result.current.start({ message: 'Saved', onUndo, onExpire }));
    expect(result.current.pending?.message).toBe('Saved');
    await act(async () => jest.advanceTimersByTime(1000));
    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(onUndo).not.toHaveBeenCalled();
    expect(result.current.pending).toBeNull();
  });

  it('undo cancels the timer', async () => {
    const onExpire = jest.fn();
    const onUndo = jest.fn();
    const { result } = await renderHook(() => useUndo(1000));
    await act(async () => result.current.start({ message: 'x', onUndo, onExpire }));
    await act(async () => result.current.undo());
    await act(async () => jest.advanceTimersByTime(5000));
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('starting a new action commits the previous one', async () => {
    const first = jest.fn();
    const { result } = await renderHook(() => useUndo());
    await act(async () => result.current.start({ message: 'a', onUndo: jest.fn(), onExpire: first }));
    await act(async () => result.current.start({ message: 'b', onUndo: jest.fn() }));
    expect(first).toHaveBeenCalledTimes(1);
    expect(result.current.pending?.message).toBe('b');
    await act(async () => result.current.flush());
    expect(result.current.pending).toBeNull();
  });

  it('undo and flush are safe with nothing pending', async () => {
    const { result, unmount } = await renderHook(() => useUndo());
    await act(async () => {
      result.current.undo();
      result.current.flush();
    });
    expect(result.current.pending).toBeNull();
    await unmount();
  });

  it('clears its timer on unmount', async () => {
    const onExpire = jest.fn();
    const { result, unmount } = await renderHook(() => useUndo(1000));
    await act(async () => result.current.start({ message: 'x', onUndo: jest.fn(), onExpire }));
    await unmount();
    jest.advanceTimersByTime(2000);
    expect(onExpire).not.toHaveBeenCalled();
  });
});

describe('UndoToast', () => {
  it('renders nothing without a pending action', async () => {
    await render(<UndoToast pending={null} onUndo={jest.fn()} />);
    expect(screen.queryByText('UNDO')).not.toBeOnTheScreen();
  });

  it('shows the message and an undo button', async () => {
    const onUndo = jest.fn();
    await render(<UndoToast pending={{ message: 'Saved AAPL', onUndo: jest.fn() }} onUndo={onUndo} />);
    expect(screen.getByText('Saved AAPL')).toBeOnTheScreen();
    await userEvent.setup().press(screen.getByRole('button', { name: 'UNDO' }));
    expect(onUndo).toHaveBeenCalled();
  });
});
