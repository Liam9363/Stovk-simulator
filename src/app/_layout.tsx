import { DarkTheme, DefaultTheme, Stack, ThemeProvider, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { NoticeToast } from '@/components/notice-toast';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useGameClock } from '@/hooks/use-game-clock';
import { useTheme } from '@/hooks/use-theme';
import { useGameStore } from '@/store/game-store';

SplashScreen.preventAutoHideAsync();

/** 메뉴 화면에서는 시간이 흐르지 않는다. */
const MENU_PATHS = new Set(['/', '/new-game']);

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = useTheme();
  const hydrated = useGameStore((s) => s.hydrated);
  const pathname = usePathname();

  useGameClock(hydrated && !MENU_PATHS.has(pathname));

  useEffect(() => {
    useGameStore
      .getState()
      .hydrate()
      .finally(() => SplashScreen.hideAsync());
  }, []);

  if (!hydrated) return null;

  const navTheme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider
      value={{
        ...navTheme,
        colors: { ...navTheme.colors, background: theme.background, card: theme.background },
      }}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="new-game" options={{ title: '새 게임' }} />
        <Stack.Screen name="(game)" options={{ headerShown: false }} />
        <Stack.Screen name="stock/[id]" options={{ title: '' }} />
        <Stack.Screen name="order" options={{ presentation: 'modal', title: '주문' }} />
        <Stack.Screen name="history" options={{ title: '거래 내역' }} />
      </Stack>
      <NoticeToast />
    </ThemeProvider>
  );
}
