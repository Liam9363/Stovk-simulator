import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';

import { LineChart } from '@/components/line-chart';
import { StockRow } from '@/components/stock-row';
import { ThemedText } from '@/components/themed';
import { Card, ChangeText, Chip } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { TICKS_PER_DAY } from '@/engine/config';
import { formatIndex } from '@/engine/format';
import { changeRate, marketIndex, previousIndex } from '@/engine/market';
import { SECTORS, type SectorId, STOCKS } from '@/engine/stocks';
import { useChangeColor, useTheme } from '@/hooks/use-theme';
import { useGameStore } from '@/store/game-store';

type SortKey = 'default' | 'gainers' | 'losers';

const SORT_LABELS: Record<SortKey, string> = {
  default: '기본',
  gainers: '상승률',
  losers: '하락률',
};

export default function MarketScreen() {
  const theme = useTheme();
  const market = useGameStore((s) => s.game?.market);
  const [sector, setSector] = useState<SectorId | 'all'>('all');
  const [sort, setSort] = useState<SortKey>('default');

  const index = market ? marketIndex(market) : 0;
  const prevIndex = market ? previousIndex(market) : 0;
  const indexRate = prevIndex > 0 ? index / prevIndex - 1 : 0;
  const indexColor = useChangeColor(indexRate);

  if (!market) return null;

  const stocks = STOCKS.filter((def) => sector === 'all' || def.sector === sector);
  if (sort !== 'default') {
    const dir = sort === 'gainers' ? -1 : 1;
    stocks.sort((a, b) => dir * (changeRate(market.stocks[a.id]) - changeRate(market.stocks[b.id])));
  }

  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      data={stocks}
      keyExtractor={(def) => def.id}
      renderItem={({ item }) => <StockRow def={item} stock={market.stocks[item.id]} />}
      ItemSeparatorComponent={() => (
        <View style={[styles.separator, { backgroundColor: theme.border }]} />
      )}
      ListHeaderComponent={
        <View style={styles.header}>
          <Card>
            <ThemedText type="small" themeColor="textSecondary">
              가상 종합지수
            </ThemedText>
            <View style={styles.indexRow}>
              <ThemedText type="subtitle" color={indexColor}>
                {formatIndex(index)}
              </ThemedText>
              <ChangeText type="smallBold" rate={indexRate} />
            </View>
            <LineChart
              data={market.indexIntraday}
              slots={TICKS_PER_DAY + 1}
              baseline={prevIndex}
              color={indexColor}
              height={56}
            />
          </Card>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label="전체" selected={sector === 'all'} onPress={() => setSector('all')} />
            {(Object.keys(SECTORS) as SectorId[]).map((id) => (
              <Chip key={id} label={SECTORS[id]} selected={sector === id} onPress={() => setSector(id)} />
            ))}
          </ScrollView>

          <View style={styles.sortRow}>
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <Chip key={key} label={SORT_LABELS[key]} selected={sort === key} onPress={() => setSort(key)} />
            ))}
          </View>
        </View>
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
  header: {
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  indexRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  chips: {
    gap: Spacing.two,
  },
  sortRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
});
