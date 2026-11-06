// Small shared building blocks so screens stay consistent.
import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { USING_SAMPLE_DATA } from '../data';
import { shortDisclaimer } from '../legal/disclaimer';
import { colors, radius, space } from '../theme';
import { Icon, type IconName } from './Icon';

export function Chip({
  label,
  selected,
  onPress,
  testID,
  icon,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
  /** Shown before the label, in the label's colour. */
  icon?: IconName;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipOn]}
    >
      {icon && <Icon name={icon} size={16} color={selected ? '#fff' : colors.textDim} />}
      <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  kind = 'primary',
  disabled,
  testID,
  style,
  icon,
  iconFilled,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  testID?: string;
  style?: ViewStyle;
  /** Shown before the label, in the label's colour. */
  icon?: IconName;
  iconFilled?: boolean;
}) {
  const textColor = kind === 'secondary' ? colors.text : '#fff';
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, styles[kind], disabled && styles.disabled, style]}
    >
      {icon && <Icon name={icon} size={18} color={textColor} filled={iconFilled} />}
      <Text style={[styles.buttonText, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

/** A pill-shaped choice between a few options, such as Save / Trade. Each option gets the testID `${testIDPrefix}-${value}`. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  testIDPrefix,
}: {
  options: readonly { value: T; label: string; icon: IconName }[];
  value: T;
  onChange: (value: T) => void;
  testIDPrefix: string;
}) {
  return (
    <View style={styles.segmented} accessibilityRole="radiogroup">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            testID={`${testIDPrefix}-${o.value}`}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, on && styles.segmentOn]}
          >
            <Icon name={o.icon} size={16} color={on ? colors.text : colors.textFaint} />
            <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.section}>{children}</Text>;
}

export function Row({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export function Disclaimer() {
  return (
    <Text style={styles.disclaimer} testID="disclaimer">
      {shortDisclaimer(USING_SAMPLE_DATA)}
    </Text>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: space(3.5),
    paddingVertical: space(2),
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.5),
  },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textDim, fontSize: 14, fontWeight: '600' },
  chipTextOn: { color: '#fff' },
  button: {
    borderRadius: radius.md,
    paddingVertical: space(3.5),
    paddingHorizontal: space(4),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space(2),
  },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: colors.down },
  disabled: { opacity: 0.4 },
  buttonText: { fontWeight: '700', fontSize: 16 },
  segmented: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 999, padding: 3 },
  segment: {
    paddingHorizontal: space(3.5),
    paddingVertical: space(1.5),
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1.5),
  },
  segmentOn: { backgroundColor: colors.cardAlt },
  segmentText: { color: colors.textFaint, fontWeight: '700' },
  segmentTextOn: { color: colors.text },
  section: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: space(6),
    marginBottom: space(2),
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2) },
  disclaimer: { color: colors.textFaint, fontSize: 11, textAlign: 'center', marginVertical: space(3) },
});
