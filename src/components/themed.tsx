import { type ColorValue, StyleSheet, Text, type TextProps, View, type ViewProps } from 'react-native';

import { type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'subtitle' | 'heading' | 'small' | 'smallBold' | 'caption';
  themeColor?: ThemeColor;
  color?: ColorValue;
};

export function ThemedText({ style, type = 'default', themeColor, color, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  return (
    <Text
      style={[{ color: color ?? theme[themeColor ?? 'text'] }, styles[type], styles.tabular, style]}
      {...rest}
    />
  );
}

export type ThemedViewProps = ViewProps & { type?: ThemeColor };

export function ThemedView({ style, type = 'background', ...rest }: ThemedViewProps) {
  const theme = useTheme();
  return <View style={[{ backgroundColor: theme[type] }, style]} {...rest} />;
}

const styles = StyleSheet.create({
  tabular: { fontVariant: ['tabular-nums'] },
  default: { fontSize: 16, lineHeight: 22, fontWeight: 500 },
  title: { fontSize: 32, lineHeight: 40, fontWeight: 700 },
  subtitle: { fontSize: 24, lineHeight: 32, fontWeight: 700 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: 700 },
  small: { fontSize: 14, lineHeight: 20, fontWeight: 500 },
  smallBold: { fontSize: 14, lineHeight: 20, fontWeight: 700 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: 500 },
});
