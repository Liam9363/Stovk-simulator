import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { formatDay, formatNumber, formatSignedNumber, formatWon } from '@/engine/format';
import { getStockDef } from '@/engine/market';
import { type LedgerEntry } from '@/engine/portfolio';
import { useChangeColor, useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed';

/** 계좌 내역 한 줄: 매수·매도 체결 또는 배당 입금. */
export function LedgerRow({ entry }: { entry: LedgerEntry }) {
  const theme = useTheme();
  const realized = entry.kind === 'trade' ? (entry.trade.realizedPnl ?? 0) : 0;
  const pnlColor = useChangeColor(realized);

  if (entry.kind === 'dividend') {
    const { dividend } = entry;
    return (
      <View style={styles.row}>
        <View style={styles.main}>
          <ThemedText type="smallBold">
            <ThemedText type="smallBold" themeColor="tint">
              배당
            </ThemedText>{' '}
            {getStockDef(dividend.stockId).name}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {formatDay(dividend.day)} · {formatNumber(dividend.quantity)}주 × {formatWon(dividend.perShare)} ·
            세금 {formatNumber(dividend.tax)}원
          </ThemedText>
        </View>
        <ThemedText type="smallBold" themeColor="tint">
          +{formatNumber(dividend.gross - dividend.tax)}원
        </ThemedText>
      </View>
    );
  }

  const { trade } = entry;
  const isBuy = trade.side === 'buy';
  const costs = trade.fee + trade.tax;
  return (
    <View style={styles.row}>
      <View style={styles.main}>
        <ThemedText type="smallBold">
          <ThemedText type="smallBold" color={isBuy ? theme.up : theme.down}>
            {trade.orderType === 'limit' ? '지정가 ' : ''}
            {isBuy ? '매수' : '매도'}
          </ThemedText>{' '}
          {getStockDef(trade.stockId).name}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {formatDay(trade.day)} · {formatNumber(trade.quantity)}주 × {formatWon(trade.price)}
          {costs > 0 ? ` · 수수료·세금 ${formatNumber(costs)}원` : ''}
        </ThemedText>
      </View>
      {trade.realizedPnl !== undefined && (
        <ThemedText type="smallBold" color={pnlColor}>
          {formatSignedNumber(trade.realizedPnl)}원
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  main: {
    flex: 1,
  },
});
