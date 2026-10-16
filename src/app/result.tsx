import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed';
import { Button, Card, GradeBadge, PnlText, Row } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { ACHIEVEMENT_BY_ID } from '@/engine/achievements';
import { DIFFICULTIES } from '@/engine/config';
import { formatNumber, formatSignedNumber, formatWon } from '@/engine/format';
import { getStockDef } from '@/engine/market';
import { modeLabel, OUTCOME_LABELS } from '@/engine/modes';
import { useTheme } from '@/hooks/use-theme';
import { useGameStore } from '@/store/game-store';

export default function ResultScreen() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const theme = useTheme();
  const profile = useGameStore((s) => s.profile);
  const record = profile.records.find((r) => String(r.id) === id);
  const justFinished = fresh === '1';

  if (!record) {
    return (
      <View style={styles.missing}>
        <ThemedText>기록을 찾을 수 없습니다.</ThemedText>
      </View>
    );
  }

  const unlocked = Object.entries(profile.achievements)
    .filter(([, value]) => value.gameId === record.id)
    .map(([achievementId]) => ACHIEVEMENT_BY_ID[achievementId])
    .filter(Boolean);
  const pnl = record.finalAssets - record.startCash;

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      {/* 방금 끝난 게임이면 뒤로 가기(진행 중이던 화면)로 돌아가지 못하게 한다. */}
      <Stack.Screen options={{ headerBackVisible: !justFinished, gestureEnabled: !justFinished }} />

      <View style={styles.hero}>
        <GradeBadge grade={record.grade} size={96} />
        <ThemedText type="subtitle">{OUTCOME_LABELS[record.outcome]}</ThemedText>
        <ThemedText themeColor="textSecondary">
          {modeLabel(record.mode)} · {DIFFICULTIES[record.difficulty].label}
        </ThemedText>
      </View>

      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          최종 자산
        </ThemedText>
        <ThemedText type="subtitle">{formatWon(record.finalAssets)}</ThemedText>
        <PnlText type="heading" amount={pnl} rate={record.returnRate} />
        <View style={styles.spacer} />
        <Row label="시작 자금">{formatWon(record.startCash)}</Row>
        <Row label="플레이 기간">{`${formatNumber(record.daysPlayed)}거래일`}</Row>
        <Row label="거래 횟수">{`${formatNumber(record.tradeCount)}회`}</Row>
        <Row label="받은 배당금 (세후)">{formatWon(record.dividendsNet)}</Row>
        {record.bestStock && (
          <Row label="효자 종목">
            {`${getStockDef(record.bestStock.stockId).name} (${formatSignedNumber(record.bestStock.pnl)}원)`}
          </Row>
        )}
      </Card>

      {unlocked.length > 0 && (
        <Card>
          <ThemedText type="heading">이번 게임에서 달성한 업적</ThemedText>
          {unlocked.map((a) => (
            <View key={a.id}>
              <ThemedText type="smallBold">🏆 {a.title}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {a.description}
              </ThemedText>
            </View>
          ))}
        </Card>
      )}

      {justFinished ? (
        <>
          <Button title="새 게임" onPress={() => router.replace('/new-game')} />
          <Button title="홈으로" variant="secondary" onPress={() => router.dismissTo('/')} />
        </>
      ) : (
        <Button title="돌아가기" variant="secondary" onPress={() => router.back()} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  spacer: {
    height: Spacing.one,
  },
});
