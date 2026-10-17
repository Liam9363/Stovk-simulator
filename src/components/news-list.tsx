import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { formatDay } from '@/engine/format';
import { type NewsItem } from '@/engine/news';
import { SECTORS, type SectorId } from '@/engine/stocks';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed';

function scopeLabel(item: NewsItem): string {
  if (item.scope === 'market') return item.major ? '대형 이벤트' : '시장';
  if (item.scope === 'sector') return SECTORS[item.targetId as SectorId];
  return '종목';
}

/** 뉴스 한 건. 종목 뉴스는 누르면 해당 종목으로 이동한다. */
export function NewsRow({ item, linkToStock = true }: { item: NewsItem; linkToStock?: boolean }) {
  const theme = useTheme();
  const color = item.sentiment === 'good' ? theme.up : theme.down;
  const canLink = linkToStock && item.scope === 'stock' && item.targetId !== null;

  return (
    <Pressable
      disabled={!canLink}
      accessibilityRole={canLink ? 'link' : undefined}
      onPress={() => router.push({ pathname: '/stock/[id]', params: { id: item.targetId! } })}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.meta}>
        <View style={[styles.tag, { backgroundColor: color }]}>
          <ThemedText type="caption" color={theme.onTint}>
            {item.sentiment === 'good' ? '호재' : '악재'}
          </ThemedText>
        </View>
        <ThemedText type="caption" themeColor="textSecondary">
          {scopeLabel(item)} · {formatDay(item.day)}
        </ThemedText>
      </View>
      <ThemedText type={item.major ? 'heading' : 'default'}>{item.headline}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: Spacing.two + Spacing.half,
    gap: Spacing.one,
  },
  pressed: { opacity: 0.6 },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  tag: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.small,
  },
});
