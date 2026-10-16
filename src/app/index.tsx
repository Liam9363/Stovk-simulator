import { router } from 'expo-router';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText, ThemedView } from '@/components/themed';
import { Button, Card, ChangeText, Row } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { DIFFICULTIES } from '@/engine/config';
import { formatDay, formatWon } from '@/engine/format';
import { totalAssets } from '@/engine/game';
import { useGameStore } from '@/store/game-store';

export default function HomeScreen() {
  const game = useGameStore((s) => s.game);

  const startNew = () => {
    if (!game) {
      router.push('/new-game');
      return;
    }
    const message = '진행 중인 게임이 사라집니다. 새로 시작할까요?';
    if (Platform.OS === 'web') {
      if (window.confirm(message)) router.push('/new-game');
      return;
    }
    Alert.alert('새 게임', message, [
      { text: '취소', style: 'cancel' },
      { text: '새로 시작', style: 'destructive', onPress: () => router.push('/new-game') },
    ]);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.hero}>
          <ThemedText type="title">모의 주식투자</ThemedText>
          <ThemedText themeColor="textSecondary">
            가상 시장에서 가상 자금으로 투자해 보세요.
          </ThemedText>
        </View>

        {game && (
          <Card>
            <ThemedText type="heading">진행 중인 게임</ThemedText>
            <Row label="난이도">{DIFFICULTIES[game.difficulty].label}</Row>
            <Row label="날짜">{formatDay(game.market.day)}</Row>
            <Row label="총자산">{formatWon(totalAssets(game))}</Row>
            <Row label="수익률">
              <ChangeText type="smallBold" rate={totalAssets(game) / game.startCash - 1} />
            </Row>
            <Button title="이어하기" onPress={() => router.push('/market')} style={styles.cardButton} />
          </Card>
        )}

        <Button
          title="새 게임"
          variant={game ? 'secondary' : 'primary'}
          onPress={startNew}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    padding: Spacing.four,
    gap: Spacing.three,
    justifyContent: 'center',
  },
  hero: {
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  cardButton: {
    marginTop: Spacing.two,
  },
});
