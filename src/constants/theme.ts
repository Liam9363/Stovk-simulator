export const Colors = {
  light: {
    text: '#111316',
    textSecondary: '#60646C',
    background: '#ffffff',
    backgroundElement: '#F2F3F5',
    backgroundSelected: '#E0E1E6',
    border: '#E3E5E8',
    tint: '#3182F6',
    onTint: '#ffffff',
    /** 한국식: 상승 = 빨강 */
    up: '#E8364A',
    /** 한국식: 하락 = 파랑 */
    down: '#2F6FE4',
  },
  dark: {
    text: '#F4F5F7',
    textSecondary: '#A0A5AD',
    background: '#0E0F11',
    backgroundElement: '#1C1E22',
    backgroundSelected: '#2A2D33',
    border: '#2A2D33',
    tint: '#4C93F8',
    onTint: '#ffffff',
    up: '#FF5A68',
    down: '#4E8DFF',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: 8,
  medium: 12,
  large: 16,
} as const;

export const MaxContentWidth = 640;
