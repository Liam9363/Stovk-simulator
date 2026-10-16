import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { GAME_SPEEDS, TICKS_PER_DAY } from '@/engine/config';
import { formatDay, formatWon } from '@/engine/format';
import { totalAssets } from '@/engine/game';
import { useTheme } from '@/hooks/use-theme';
import { useGameStore } from '@/store/game-store';

import { ThemedText } from './themed';
import { ChangeText } from './ui';

/** 게임 날짜·장중 진행률·배속 조절·총자산을 보여주는 상단 바. */
export function GameHud({ showMenu = false }: { showMenu?: boolean }) {
  const theme = useTheme();
  const game = useGameStore((s) => s.game);
  const speed = useGameStore((s) => s.speed);
  const paused = useGameStore((s) => s.paused);
  const setSpeed = useGameStore((s) => s.setSpeed);
  const setPaused = useGameStore((s) => s.setPaused);

  if (!game) return null;
  const assets = totalAssets(game);
  const progress = game.market.tick / TICKS_PER_DAY;

  return (
    <View style={[styles.container, { borderBottomColor: theme.border }]}>
      <View style={styles.topRow}>
        {showMenu && (
          <SpeedButton
            label="☰"
            accessibilityLabel="메인 메뉴"
            selected={false}
            onPress={() => router.dismissTo('/')}
          />
        )}
        <View style={styles.date}>
          <ThemedText type="smallBold">{formatDay(game.market.day)}</ThemedText>
          <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}>
            <View
              style={[styles.progressFill, { backgroundColor: theme.tint, width: `${progress * 100}%` }]}
            />
          </View>
        </View>
        <View style={styles.controls}>
          <SpeedButton
            label={paused ? '▶' : '❚❚'}
            accessibilityLabel={paused ? '재개' : '일시정지'}
            selected={paused}
            onPress={() => setPaused(!paused)}
          />
          {GAME_SPEEDS.map((s) => (
            <SpeedButton
              key={s}
              label={`${s}x`}
              accessibilityLabel={`${s}배속`}
              selected={!paused && speed === s}
              onPress={() => setSpeed(s)}
            />
          ))}
        </View>
      </View>
      <View style={styles.assetRow}>
        <ThemedText type="caption" themeColor="textSecondary">
          총자산
        </ThemedText>
        <ThemedText type="smallBold">{formatWon(assets)}</ThemedText>
        <ChangeText type="smallBold" rate={assets / game.startCash - 1} />
      </View>
    </View>
  );
}

type SpeedButtonProps = {
  label: string;
  accessibilityLabel: string;
  selected: boolean;
  onPress: () => void;
};

function SpeedButton({ label, accessibilityLabel, selected, onPress }: SpeedButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      onPress={onPress}
      hitSlop={4}
      style={[
        styles.speedButton,
        { backgroundColor: selected ? theme.tint : theme.backgroundElement },
      ]}>
      <ThemedText type="caption" color={selected ? theme.onTint : theme.text}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: Spacing.one,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  date: {
    flex: 1,
  },
  progressTrack: {
    width: 72,
    height: 3,
    borderRadius: 2,
    marginTop: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
  },
  controls: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  speedButton: {
    minWidth: 40,
    height: 30,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
});
