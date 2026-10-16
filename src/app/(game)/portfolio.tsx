import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { LineChart } from '@/components/line-chart';
import { ThemedText } from '@/components/themed';
import { Card, PnlText, Row } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { formatDay, formatNumber, formatSignedNumber, formatWon } from '@/engine/format';
import { getStockDef } from '@/engine/market';
import { type PositionSummary, summarizePortfolio, type Trade } from '@/engine/portfolio';
import { useChangeColor, useTheme } from '@/hooks/use-theme';
import { useGameStore } from '@/store/game-store';

const RECENT_TRADES = 20;

export default function PortfolioScreen() {
  const theme = useTheme();
  const game = useGameStore((s) => s.game);
  const summary = game ? summarizePortfolio(game.portfolio, game.market) : null;
  const totalPnl = summary && game ? summary.totalAssets - game.startCash : 0;
  const chartColor = useChangeColor(totalPnl);

  if (!game || !summary) return null;

  const assetSeries = [game.startCash, ...game.assetHistory, summary.totalAssets];
  const recentTrades = game.portfolio.trades.slice(-RECENT_TRADES).reverse();

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Card>
        <ThemedText type="small" themeColor="textSecondary">
        총자산
        </ThemedText>
        <ThemedText type="subtitle">{formatWon(summary.totalAssets)}</ThemedText>
        <PnlText type="smallBold" amount={totalPnl} rate={summary.totalAssets / game.startCash - 1} />
        {assetSeries.length > 2 && (
        <LineChart data={assetSeries} baseline={game.startCash} color={chartColor} height={72} />
        )}
        <View style={styles.divider} />
        <Row label="현금">{formatWon(summary.cash)}</Row>
        <Row label="주식 평가금액">{formatWon(summary.stockValue)}</Row>
        <Row label="시작 자금">{formatWon(game.startCash)}</Row>
      </Card>

      <ThemedText type="heading">보유 종목</ThemedText>
      {summary.positions.length === 0 ? (
        <ThemedText themeColor="textSecondary">
          아직 보유한 주식이 없어요. 마켓에서 종목을 골라 매수해 보세요.
        </ThemedText>
      ) : (
        summary.positions.map((position) => (
          <PositionCard
            key={position.stockId}
            position={position}
            weight={position.value / summary.totalAssets}
          />
        ))
      )}

      <ThemedText type="heading">최근 거래</ThemedText>
      {recentTrades.length === 0 ? (
        <ThemedText themeColor="textSecondary">거래 내역이 없습니다.</ThemedText>
      ) : (
        <Card>
          {recentTrades.map((trade) => (
            <TradeRow key={trade.id} trade={trade} />
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

function PositionCard({ position, weight }: { position: PositionSummary; weight: number }) {
  const def = getStockDef(position.stockId);
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push({ pathname: '/stock/[id]', params: { id: position.stockId } })}>
      <Card>
        <View style={styles.positionHeader}>
          <ThemedText type="heading">{def.name}</ThemedText>
          <ThemedText type="smallBold">{formatWon(position.value)}</ThemedText>
        </View>
        <View style={styles.positionHeader}>
          <ThemedText type="small" themeColor="textSecondary">
            {formatNumber(position.quantity)}주 · 비중 {(weight * 100).toFixed(1)}%
          </ThemedText>
          <PnlText type="small" amount={position.pnl} rate={position.returnRate} />
        </View>
        <Row label="평균 매입가">{formatWon(position.avgPrice)}</Row>
        <Row label="현재가">{formatWon(position.price)}</Row>
      </Card>
    </Pressable>
  );
}

function TradeRow({ trade }: { trade: Trade }) {
  const theme = useTheme();
  const pnlColor = useChangeColor(trade.realizedPnl ?? 0);
  const isBuy = trade.side === 'buy';
  return (
    <View style={styles.tradeRow}>
      <View style={styles.tradeMain}>
        <ThemedText type="smallBold">
          <ThemedText type="smallBold" color={isBuy ? theme.up : theme.down}>
            {isBuy ? '매수' : '매도'}
          </ThemedText>{' '}
          {getStockDef(trade.stockId).name}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {formatDay(trade.day)} · {formatNumber(trade.quantity)}주 × {formatWon(trade.price)}
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
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  divider: {
    height: Spacing.one,
  },
  positionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tradeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
  tradeMain: {
    flex: 1,
  },
});
