import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameHud } from '@/components/game-hud';
import { MarketIcon, WalletIcon } from '@/components/tab-icons';
import { useTheme } from '@/hooks/use-theme';
import { useGameStore } from '@/store/game-store';

function Header() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  return (
    <View style={{ paddingTop: insets.top, backgroundColor: theme.background }}>
      <GameHud showMenu />
    </View>
  );
}

export default function GameLayout() {
  const theme = useTheme();
  const hasGame = useGameStore((s) => s.game !== null);
  if (!hasGame) return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        header: () => <Header />,
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.background, borderTopColor: theme.border },
      }}>
      <Tabs.Screen
        name="market"
        options={{
          title: '마켓',
          tabBarIcon: ({ color }) => <MarketIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: '내 자산',
          tabBarIcon: ({ color }) => <WalletIcon color={color} />,
        }}
      />
    </Tabs>
  );
}
