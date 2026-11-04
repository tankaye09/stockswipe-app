import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space } from '../theme';

export const UNDO_MS = 3500;

export interface Pending {
  message: string;
  /** Called if the user taps Undo. */
  onUndo: () => void;
  /** Called when the undo window closes without an undo. */
  onExpire?: () => void;
}

/** Holds one undoable action at a time. Starting a new one commits the old one. */
export function useUndo(ms = UNDO_MS) {
  const [pending, setPending] = useState<Pending | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = useRef<Pending | null>(null);

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    current.current = null;
    setPending(null);
  };

  const expire = useCallback(() => {
    const p = current.current;
    clear();
    p?.onExpire?.();
  }, []);

  const start = useCallback(
    (p: Pending) => {
      if (current.current) expire();
      current.current = p;
      setPending(p);
      timer.current = setTimeout(expire, ms);
    },
    [expire, ms],
  );

  const undo = useCallback(() => {
    const p = current.current;
    clear();
    p?.onUndo();
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { pending, start, undo, flush: expire };
}

export function UndoToast({ pending, onUndo }: { pending: Pending | null; onUndo: () => void }) {
  if (!pending) return null;
  return (
    <View style={styles.toast} testID="undo-toast">
      <Text style={styles.text} numberOfLines={2}>
        {pending.message}
      </Text>
      <Pressable onPress={onUndo} testID="undo-button" accessibilityRole="button" hitSlop={10}>
        <Text style={styles.undo}>UNDO</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: space(4),
    right: space(4),
    bottom: space(4),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space(4),
    paddingVertical: space(3),
    gap: space(3),
  },
  text: { color: colors.text, flex: 1, fontSize: 14 },
  undo: { color: colors.accent, fontWeight: '800', fontSize: 14 },
});
