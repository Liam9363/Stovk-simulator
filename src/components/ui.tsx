import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { formatRate, formatSignedNumber } from '@/engine/format';
import { useChangeColor, useTheme } from '@/hooks/use-theme';

import { ThemedText, type ThemedTextProps } from './themed';

export function Card({ style, ...rest }: ViewProps) {
  const theme = useTheme();
  return (
    <View
      style={[styles.card, { backgroundColor: theme.backgroundElement }, style]}
      {...rest}
    />
  );
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'up' | 'down';
  disabled?: boolean;
  style?: ViewProps['style'];
};

export function Button({ title, onPress, variant = 'primary', disabled, style }: ButtonProps) {
  const theme = useTheme();
  const background = {
    primary: theme.tint,
    secondary: theme.backgroundSelected,
    up: theme.up,
    down: theme.down,
  }[variant];
  const textColor = variant === 'secondary' ? theme.text : theme.onTint;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
        style,
      ]}>
      <ThemedText type="heading" color={textColor}>
        {title}
      </ThemedText>
    </Pressable>
  );
}

type ChipProps = { label: string; selected: boolean; onPress: () => void };

export function Chip({ label, selected, onPress }: ChipProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: selected ? theme.text : theme.backgroundElement },
      ]}>
      <ThemedText type="smallBold" color={selected ? theme.background : theme.textSecondary}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/** 등락률 텍스트 (색상 포함). */
export function ChangeText({ rate, ...rest }: { rate: number } & ThemedTextProps) {
  const color = useChangeColor(rate);
  return (
    <ThemedText color={color} {...rest}>
      {formatRate(rate)}
    </ThemedText>
  );
}

/** 부호 있는 금액 + 등락률. 예: +12,300원 (+1.23%) */
export function PnlText({ amount, rate, ...rest }: { amount: number; rate: number } & ThemedTextProps) {
  const color = useChangeColor(amount);
  return (
    <ThemedText color={color} {...rest}>
      {formatSignedNumber(amount)}원 ({formatRate(rate)})
    </ThemedText>
  );
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      {typeof children === 'string' ? <ThemedText type="smallBold">{children}</ThemedText> : children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  button: {
    minHeight: 52,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 999,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
