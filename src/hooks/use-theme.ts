import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
  const scheme = useColorScheme();
  return Colors[scheme === 'dark' ? 'dark' : 'light'];
}

/** 등락에 따른 색 (상승 빨강, 하락 파랑, 보합 기본색). */
export function useChangeColor(value: number) {
  const theme = useTheme();
  if (value > 0) return theme.up;
  if (value < 0) return theme.down;
  return theme.textSecondary;
}
