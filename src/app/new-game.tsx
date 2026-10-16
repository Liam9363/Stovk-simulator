import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed';
import { Button } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { DIFFICULTIES, type Difficulty } from '@/engine/config';
import { formatCompactWon } from '@/engine/format';
import { useTheme } from '@/hooks/use-theme';
import { useGameStore } from '@/store/game-store';

export default function NewGameScreen() {
  const theme = useTheme();
  const startNewGame = useGameStore((s) => s.startNewGame);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [starting, setStarting] = useState(false);

  const start = () => {
    setStarting(true);
    // 시장 생성(워밍업 시뮬레이션)이 동기 작업이라 로딩 표시가 먼저 그려지도록 한 프레임 미룬다.
    setTimeout(() => {
      startNewGame(difficulty);
      router.dismissTo('/market');
    }, 16);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedText type="heading">난이도</ThemedText>
      {(Object.keys(DIFFICULTIES) as Difficulty[]).map((key) => {
        const config = DIFFICULTIES[key];
        const selected = key === difficulty;
        return (
          <Pressable
            key={key}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => setDifficulty(key)}
            style={[
              styles.option,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: selected ? theme.tint : 'transparent',
              },
            ]}>
            <View style={styles.optionHeader}>
              <ThemedText type="heading">{config.label}</ThemedText>
              <ThemedText type="smallBold" themeColor="tint">
                시작 자금 {formatCompactWon(config.startCash)}원
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {config.description}
            </ThemedText>
          </Pressable>
        );
      })}

      <ThemedText type="caption" themeColor="textSecondary" style={styles.note}>
        게임 속 하루는 1배속 기준 1분입니다. 화면 위쪽에서 배속과 일시정지를 조절할 수 있어요.
      </ThemedText>

      <Button title={starting ? '시장 준비 중…' : '시작하기'} disabled={starting} onPress={start} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  option: {
    borderRadius: Radius.large,
    borderWidth: 2,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  note: {
    marginVertical: Spacing.two,
  },
});
