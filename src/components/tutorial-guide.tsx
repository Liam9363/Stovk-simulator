import { usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { advanceTutorial, TUTORIAL_MESSAGES, TUTORIAL_STEPS } from '@/engine/tutorial';
import { useTheme } from '@/hooks/use-theme';
import { useGameStore } from '@/store/game-store';

import { ThemedText } from './themed';

/** 튜토리얼 안내를 띄우지 않는 화면 (메뉴·결과 등). */
const HIDDEN_PATHS = new Set(['/', '/new-game', '/result', '/records', '/achievements', '/glossary']);

/** 진행 중인 튜토리얼 단계를 화면 아래쪽 안내 카드로 보여주고, 플레이어 행동에 맞춰 단계를 넘긴다. */
export function TutorialGuide() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const step = useGameStore((s) => s.profile.tutorial);
  const game = useGameStore((s) => s.game);
  const setTutorialStep = useGameStore((s) => s.setTutorialStep);
  const endTutorial = useGameStore((s) => s.endTutorial);
  // 카드가 화면 아래쪽 내용을 가릴 수 있어 접을 수 있게 한다. 단계가 바뀌면 다시 펼친다.
  const [collapsedStep, setCollapsedStep] = useState<string | null>(null);

  useEffect(() => {
    if (!step) return;
    const next = advanceTutorial(step, { pathname, game });
    if (next !== step) setTutorialStep(next);
  }, [step, pathname, game, setTutorialStep]);

  if (!step || !game || HIDDEN_PATHS.has(pathname)) return null;

  const message = TUTORIAL_MESSAGES[step];
  const index = TUTORIAL_STEPS.indexOf(step);
  const isDone = step === 'done';
  const label = isDone ? message.title : `튜토리얼 ${index + 1}/${TUTORIAL_STEPS.length - 1} · ${message.title}`;

  if (collapsedStep === step) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="튜토리얼 안내 펼치기"
        onPress={() => setCollapsedStep(null)}
        style={[styles.pill, { bottom: insets.bottom + 88, backgroundColor: theme.tint }]}>
        <ThemedText type="caption" color={theme.onTint}>
          {label} ▴
        </ThemedText>
      </Pressable>
    );
  }

  return (
    <View
      accessibilityRole="summary"
      style={[styles.card, { bottom: insets.bottom + 88, backgroundColor: theme.tint }]}>
      <View style={styles.header}>
        <ThemedText type="smallBold" color={theme.onTint} style={styles.title}>
          {label}
        </ThemedText>
        {!isDone && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="튜토리얼 안내 접기"
            onPress={() => setCollapsedStep(step)}
            hitSlop={8}>
            <ThemedText type="smallBold" color={theme.onTint} style={styles.action}>
              접기
            </ThemedText>
          </Pressable>
        )}
        <Pressable accessibilityRole="button" onPress={endTutorial} hitSlop={8}>
          <ThemedText type="smallBold" color={theme.onTint} style={styles.action}>
            {isDone ? '완료' : '건너뛰기'}
          </ThemedText>
        </Pressable>
      </View>
      <ThemedText type="small" color={theme.onTint}>
        {message.body}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    alignSelf: 'center',
    maxWidth: MaxContentWidth,
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.one,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    flex: 1,
  },
  action: {
    textDecorationLine: 'underline',
  },
  pill: {
    position: 'absolute',
    right: Spacing.three,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    elevation: 6,
  },
});
