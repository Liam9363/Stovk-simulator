import { FlatList, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { ACHIEVEMENTS } from '@/engine/achievements';
import { useTheme } from '@/hooks/use-theme';
import { useGameStore } from '@/store/game-store';

export default function AchievementsScreen() {
  const theme = useTheme();
  const unlocked = useGameStore((s) => s.profile.achievements);
  const count = ACHIEVEMENTS.filter((a) => a.id in unlocked).length;

  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      data={ACHIEVEMENTS}
      keyExtractor={(a) => a.id}
      ListHeaderComponent={
        <ThemedText type="heading" style={styles.header}>
          {count} / {ACHIEVEMENTS.length} 달성
        </ThemedText>
      }
      renderItem={({ item }) => {
        const entry = unlocked[item.id];
        return (
          <View
            style={[
              styles.item,
              { backgroundColor: theme.backgroundElement, opacity: entry ? 1 : 0.55 },
            ]}>
            <ThemedText type="subtitle">{entry ? '🏆' : '🔒'}</ThemedText>
            <View style={styles.text}>
              <ThemedText type="smallBold">{item.title}</ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {item.description}
              </ThemedText>
              {entry && (
                <ThemedText type="caption" themeColor="tint">
                  {new Date(entry.at).toLocaleDateString('ko-KR')} 달성
                </ThemedText>
              )}
            </View>
          </View>
        );
      }}
      ItemSeparatorComponent={() => <View style={styles.gap} />}
    />
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
    marginBottom: Spacing.three,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.large,
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
  gap: {
    height: Spacing.two,
  },
});
