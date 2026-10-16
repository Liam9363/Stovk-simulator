import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { formatRate, formatSignedNumber } from '@/engine/format';
import { type TermId } from '@/engine/glossary';
import { type Grade } from '@/engine/modes';
import { useChangeColor, useTheme } from '@/hooks/use-theme';

import { TermInfo } from './term-info';
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
  // 0.00%로 표시될 만큼 작은 변화는 보합 색으로 칠한다.
  const color = useChangeColor(Math.abs(rate) < 0.00005 ? 0 : rate);
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

/** 라벨 + 값 한 줄. `term`을 주면 라벨 옆에 용어 설명(ⓘ)이 붙는다. */
export function Row({ label, term, children }: { label: string; term?: TermId; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.label}>
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
        {term && <TermInfo term={term} />}
      </View>
      {typeof children === 'string' ? <ThemedText type="smallBold">{children}</ThemedText> : children}
    </View>
  );
}

/** 제목·라벨 텍스트 + 용어 설명(ⓘ). */
export function TermLabel({ term, children, ...rest }: { term: TermId; children: ReactNode } & ThemedTextProps) {
  return (
    <View style={styles.label}>
      <ThemedText {...rest}>{children}</ThemedText>
      <TermInfo term={term} />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + Spacing.half,
  },
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
  grade: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const GRADE_COLORS: Record<Grade, string> = {
  S: '#E2A400',
  A: '#3182F6',
  B: '#20A86B',
  C: '#8B95A1',
  D: '#E8833A',
  F: '#E8364A',
};

/** 등급 배지 (S~F). */
export function GradeBadge({ grade, size = 40 }: { grade: Grade; size?: number }) {
  return (
    <View
      style={[
        styles.grade,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: GRADE_COLORS[grade] },
      ]}>
      <ThemedText style={{ fontSize: size * 0.5, lineHeight: size * 0.62, fontWeight: 800 }} color="#ffffff">
        {grade}
      </ThemedText>
    </View>
  );
}
