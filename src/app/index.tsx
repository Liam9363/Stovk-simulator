import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText, ThemedView } from '@/components/themed';
import { Button, Card, ChangeText, Row } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { ACHIEVEMENTS } from '@/engine/achievements';
import { DIFFICULTIES } from '@/engine/config';
import { formatDay, formatWon } from '@/engine/format';
import { totalAssets } from '@/engine/game';
import { modeLabel, modeProgress } from '@/engine/modes';
import { useGameStore } from '@/store/game-store';
import { confirm } from '@/utils/confirm';

export default function HomeScreen() {
  const game = useGameStore((s) => s.game);
  const records = useGameStore((s) => s.profile.records);
  const achievements = useGameStore((s) => s.profile.achievements);
  const quitGame = useGameStore((s) => s.quitGame);
  const resetAll = useGameStore((s) => s.resetAll);

  const startNew = () => {
    if (!game) {
      router.push('/new-game');
      return;
    }
    confirm('새 게임', '진행 중인 게임은 기록 없이 사라집니다. 새로 시작할까요?', '새로 시작', () =>
      router.push('/new-game'),
    );
  };

  const endCurrent = () =>
    confirm('게임 끝내기', '지금 자산으로 게임을 마치고 결과를 기록합니다.', '끝내기', quitGame);

  const reset = () =>
    confirm('전체 초기화', '진행 중인 게임, 지난 기록, 업적이 모두 삭제됩니다.', '모두 삭제', () => {
      void resetAll();
    });

  const assets = game ? totalAssets(game) : 0;
  const progress = game ? modeProgress(game.mode, game.market.day, assets, game.startCash) : null;
  const unlockedCount = ACHIEVEMENTS.filter((a) => a.id in achievements).length;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <ThemedText type="title">모의 주식투자</ThemedText>
            <ThemedText themeColor="textSecondary">가상 시장에서 가상 자금으로 투자해 보세요.</ThemedText>
          </View>

          {game && (
            <Card>
              <ThemedText type="heading">진행 중인 게임</ThemedText>
              <Row label="모드">{modeLabel(game.mode)}</Row>
              <Row label="난이도">{DIFFICULTIES[game.difficulty].label}</Row>
              <Row label="날짜">{progress && game.mode.type === 'period' ? progress.label : formatDay(game.market.day)}</Row>
              <Row label="총자산">{formatWon(assets)}</Row>
              <Row label="수익률">
                <ChangeText type="smallBold" rate={assets / game.startCash - 1} />
              </Row>
              <Button title="이어하기" onPress={() => router.push('/market')} style={styles.cardButton} />
              <Button title="게임 끝내기" variant="secondary" onPress={endCurrent} />
            </Card>
          )}

          <Button title="새 게임" variant={game ? 'secondary' : 'primary'} onPress={startNew} />

          <View style={styles.menuRow}>
            <Button
              title={`지난 기록 (${records.length})`}
              variant="secondary"
              onPress={() => router.push('/records')}
              style={styles.menuButton}
            />
            <Button
              title={`업적 ${unlockedCount}/${ACHIEVEMENTS.length}`}
              variant="secondary"
              onPress={() => router.push('/achievements')}
              style={styles.menuButton}
            />
          </View>

          <Pressable accessibilityRole="button" onPress={reset} style={styles.reset}>
            <ThemedText type="caption" themeColor="textSecondary">
              전체 데이터 초기화
            </ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
    justifyContent: 'center',
  },
  hero: {
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  cardButton: {
    marginTop: Spacing.two,
  },
  menuRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  menuButton: {
    flex: 1,
  },
  reset: {
    alignSelf: 'center',
    padding: Spacing.three,
  },
});
