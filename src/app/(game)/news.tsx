import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { NewsRow } from '@/components/news-list';
import { ThemedText } from '@/components/themed';
import { Chip } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { getStockDef } from '@/engine/market';
import { effectWeight, type NewsItem } from '@/engine/news';
import { useTheme } from '@/hooks/use-theme';
import { useGameStore } from '@/store/game-store';

type Filter = 'all' | 'mine' | 'market';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'mine', label: '내 종목' },
  { key: 'market', label: '시장' },
];

export default function NewsScreen() {
  const theme = useTheme();
  const news = useGameStore((s) => s.game?.market.news);
  const holdings = useGameStore((s) => s.game?.portfolio.holdings);
  const [filter, setFilter] = useState<Filter>('all');

  if (!news || !holdings) return null;

  const held = Object.keys(holdings).map(getStockDef);
  const matches = (item: NewsItem) => {
    if (filter === 'market') return item.scope === 'market';
    if (filter === 'mine') return item.scope !== 'market' && held.some((def) => effectWeight(item, def) !== 0);
    return true;
  };
  const items = news.filter(matches).reverse();

  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <NewsRow item={item} />}
      ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.border }]} />}
      ListHeaderComponent={
        <View style={styles.filters}>
          {FILTERS.map((f) => (
            <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} />
          ))}
        </View>
      }
      ListEmptyComponent={
        <ThemedText themeColor="textSecondary" style={styles.empty}>
          {filter === 'mine' ? '보유 종목에 관한 뉴스가 없습니다.' : '아직 뉴스가 없습니다.'}
        </ThemedText>
      }
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
  filters: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  empty: {
    paddingVertical: Spacing.four,
    textAlign: 'center',
  },
});
