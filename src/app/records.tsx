import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed';
import { Card, ChangeText, GradeBadge, Row } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { DIFFICULTIES } from '@/engine/config';
import { formatNumber, formatRate } from '@/engine/format';
import { type GameMode, modeLabel, OUTCOME_LABELS } from '@/engine/modes';
import { bestRecords, type GameRecord } from '@/engine/records';
import { useTheme } from '@/hooks/use-theme';
import { useGameStore } from '@/store/game-store';

const MODE_TITLES: Record<GameMode['type'], string> = {
  period: '기간제',
  target: '목표 달성',
  endless: '무한',
};

function openRecord(record: GameRecord) {
  router.push({ pathname: '/result', params: { id: String(record.id) } });
}

export default function RecordsScreen() {
  const theme = useTheme();
  const records = useGameStore((s) => s.profile.records);
  const best = bestRecords(records);

  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      data={records}
      keyExtractor={(record) => String(record.id)}
      renderItem={({ item }) => <RecordRow record={item} />}
      ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.border }]} />}
      ListHeaderComponent={
        records.length > 0 ? (
          <View style={styles.header}>
            <Card>
              <ThemedText type="heading">모드별 최고 기록</ThemedText>
              {(Object.keys(MODE_TITLES) as GameMode['type'][]).map((type) => {
                const record = best[type];
                return (
                  <Row key={type} label={MODE_TITLES[type]}>
                    {record ? <ChangeText type="smallBold" rate={record.returnRate} /> : '-'}
                  </Row>
                );
              })}
            </Card>
            <ThemedText type="heading">전체 기록 ({formatNumber(records.length)})</ThemedText>
          </View>
        ) : undefined
      }
      ListEmptyComponent={
        <ThemedText themeColor="textSecondary" style={styles.empty}>
          아직 끝난 게임이 없어요.
        </ThemedText>
      }
    />
  );
}

function RecordRow({ record }: { record: GameRecord }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${modeLabel(record.mode)} ${record.grade}등급 ${formatRate(record.returnRate)}`}
      onPress={() => openRecord(record)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <GradeBadge grade={record.grade} />
      <View style={styles.main}>
        <ThemedText type="smallBold">{modeLabel(record.mode)}</ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {DIFFICULTIES[record.difficulty].label} · {OUTCOME_LABELS[record.outcome]} ·{' '}
          {formatNumber(record.daysPlayed)}일 · {new Date(record.endedAt).toLocaleDateString('ko-KR')}
        </ThemedText>
      </View>
      <ChangeText type="smallBold" rate={record.returnRate} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: {
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  pressed: { opacity: 0.6 },
  main: { flex: 1 },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  empty: {
    paddingVertical: Spacing.five,
    textAlign: 'center',
  },
});
