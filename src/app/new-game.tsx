import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed';
import { Button, Chip } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { DIFFICULTIES, type Difficulty } from '@/engine/config';
import { formatCompactWon } from '@/engine/format';
import { type GameMode, PERIOD_OPTIONS, type PeriodDays, TARGET_MODE } from '@/engine/modes';
import { useTheme } from '@/hooks/use-theme';
import { useGameStore } from '@/store/game-store';

type ModeType = GameMode['type'];

const MODE_OPTIONS: { type: ModeType; title: string; description: string }[] = [
  {
    type: 'period',
    title: '기간제',
    description: '정해진 기간이 끝나면 최종 수익률로 등급(S~F)을 매깁니다.',
  },
  {
    type: 'target',
    title: '목표 달성',
    description: `총자산 ${TARGET_MODE.targetMultiple}배를 만들면 클리어, ${TARGET_MODE.floorMultiple * 100}% 이하로 떨어지면 게임 오버.`,
  },
  {
    type: 'endless',
    title: '무한',
    description: '끝없이 이어지는 자유 모드. 원할 때 직접 게임을 끝낼 수 있어요.',
  },
];

export default function NewGameScreen() {
  const startNewGame = useGameStore((s) => s.startNewGame);
  const [modeType, setModeType] = useState<ModeType>('period');
  const [periodDays, setPeriodDays] = useState<PeriodDays>(62);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [starting, setStarting] = useState(false);

  const mode: GameMode =
    modeType === 'period'
      ? { type: 'period', days: periodDays }
      : modeType === 'target'
        ? TARGET_MODE
        : { type: 'endless' };

  const start = () => {
    setStarting(true);
    // 시장 생성(워밍업 시뮬레이션)이 동기 작업이라 로딩 표시가 먼저 그려지도록 한 프레임 미룬다.
    setTimeout(() => {
      startNewGame(difficulty, mode);
      router.dismissTo('/market');
    }, 16);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedText type="heading">게임 모드</ThemedText>
      {MODE_OPTIONS.map((option) => (
        <Option
          key={option.type}
          selected={modeType === option.type}
          onPress={() => setModeType(option.type)}
          title={option.title}
          description={option.description}>
          {option.type === 'period' && modeType === 'period' && (
            <View style={styles.periods}>
              {PERIOD_OPTIONS.map((p) => (
                <Chip
                  key={p.days}
                  label={`${p.label} (${p.days}일)`}
                  selected={periodDays === p.days}
                  onPress={() => setPeriodDays(p.days)}
                />
              ))}
            </View>
          )}
        </Option>
      ))}

      <ThemedText type="heading" style={styles.section}>
        난이도
      </ThemedText>
      {(Object.keys(DIFFICULTIES) as Difficulty[]).map((key) => {
        const config = DIFFICULTIES[key];
        return (
          <Option
            key={key}
            selected={key === difficulty}
            onPress={() => setDifficulty(key)}
            title={config.label}
            badge={`시작 자금 ${formatCompactWon(config.startCash)}원`}
            description={config.description}
          />
        );
      })}

      <ThemedText type="caption" themeColor="textSecondary" style={styles.note}>
        게임 속 하루는 1배속 기준 1분입니다. 화면 위쪽에서 배속과 일시정지를 조절할 수 있어요.
      </ThemedText>

      <Button title={starting ? '시장 준비 중…' : '시작하기'} disabled={starting} onPress={start} />
    </ScrollView>
  );
}

type OptionProps = {
  selected: boolean;
  onPress: () => void;
  title: string;
  description: string;
  badge?: string;
  children?: ReactNode;
};

function Option({ selected, onPress, title, description, badge, children }: OptionProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.option,
        { backgroundColor: theme.backgroundElement, borderColor: selected ? theme.tint : 'transparent' },
      ]}>
      <View style={styles.optionHeader}>
        <ThemedText type="heading">{title}</ThemedText>
        {badge && (
          <ThemedText type="smallBold" themeColor="tint">
            {badge}
          </ThemedText>
        )}
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {description}
      </ThemedText>
      {children}
    </Pressable>
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
  section: {
    marginTop: Spacing.two,
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
  periods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  note: {
    marginVertical: Spacing.two,
  },
});
