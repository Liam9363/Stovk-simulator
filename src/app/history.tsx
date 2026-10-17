import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { LedgerRow } from '@/components/ledger-row';
import { ThemedText } from '@/components/themed';
import { Card, Chip, Row } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { formatSignedNumber, formatWon } from '@/engine/format';
import { buildLedger, type LedgerEntry, tradingTotals } from '@/engine/portfolio';
import { useChangeColor, useTheme } from '@/hooks/use-theme';
import { useGameStore } from '@/store/game-store';

type Filter = 'all' | 'buy' | 'sell' | 'dividend';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'buy', label: '매수' },
  { key: 'sell', label: '매도' },
  { key: 'dividend', label: '배당' },
];

function matches(entry: LedgerEntry, filter: Filter): boolean {
  if (filter === 'all') return true;
  if (filter === 'dividend') return entry.kind === 'dividend';
  return entry.kind === 'trade' && entry.trade.side === filter;
}

export default function HistoryScreen() {
  const theme = useTheme();
  const portfolio = useGameStore((s) => s.game?.portfolio);
  const [filter, setFilter] = useState<Filter>('all');
  const totals = portfolio ? tradingTotals(portfolio) : null;
  const realizedColor = useChangeColor(totals?.realizedPnl ?? 0);

  if (!portfolio || !totals) return null;

  const entries = buildLedger(portfolio).filter((entry) => matches(entry, filter));

  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      data={entries}
      keyExtractor={(entry) => String(entry.id)}
      renderItem={({ item }) => <LedgerRow entry={item} />}
      ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.border }]} />}
      ListEmptyComponent={
        <ThemedText themeColor="textSecondary" style={styles.empty}>
          내역이 없습니다.
        </ThemedText>
      }
      ListHeaderComponent={
        <View style={styles.header}>
          <Card>
            <Row label="실현손익 (매도)" term="realized_pnl">
              <ThemedText type="smallBold" color={realizedColor}>
                {formatSignedNumber(totals.realizedPnl)}원
              </ThemedText>
            </Row>
            <Row label="받은 배당금 (세후)" term="dividend_tax">{formatWon(totals.dividendsNet)}</Row>
            <Row label="낸 수수료" term="fee">{formatWon(totals.fees)}</Row>
            <Row label="낸 세금 (거래세·배당세)" term="sell_tax">{formatWon(totals.taxes)}</Row>
          </Card>
          <View style={styles.filters}>
            {FILTERS.map((f) => (
              <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} />
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
  filters: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  empty: {
    paddingVertical: Spacing.four,
    textAlign: 'center',
  },
});
