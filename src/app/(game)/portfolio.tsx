import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { LedgerRow } from '@/components/ledger-row';
import { LineChart } from '@/components/line-chart';
import { PendingOrders } from '@/components/pending-orders';
import { ThemedText } from '@/components/themed';
import { Button, Card, PnlText, Row } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { formatNumber, formatWon } from '@/engine/format';
import { getStockDef } from '@/engine/market';
import {
  availableCash,
  buildLedger,
  type PositionSummary,
  summarizePortfolio,
} from '@/engine/portfolio';
import { useChangeColor, useTheme } from '@/hooks/use-theme';
import { useGameStore } from '@/store/game-store';

const RECENT_ENTRIES = 5;

export default function PortfolioScreen() {
  const theme = useTheme();
  const game = useGameStore((s) => s.game);
  const summary = game ? summarizePortfolio(game.portfolio, game.market) : null;
  const totalPnl = summary && game ? summary.totalAssets - game.startCash : 0;
  const chartColor = useChangeColor(totalPnl);

  if (!game || !summary) return null;

  const assetSeries = [game.startCash, ...game.assetHistory, summary.totalAssets];
  const ledger = buildLedger(game.portfolio);
  const orderableCash = availableCash(game.portfolio);

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
        {orderableCash !== summary.cash && <Row label="ㄴ 주문 가능 현금">{formatWon(orderableCash)}</Row>}
        <Row label="주식 평가금액">{formatWon(summary.stockValue)}</Row>
        <Row label="시작 자금">{formatWon(game.startCash)}</Row>
      </Card>

      <PendingOrders orders={game.portfolio.orders} />

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

      <ThemedText type="heading">최근 내역</ThemedText>
      {ledger.length === 0 ? (
        <ThemedText themeColor="textSecondary">거래 내역이 없습니다.</ThemedText>
      ) : (
        <Card>
          {ledger.slice(0, RECENT_ENTRIES).map((entry) => (
            <LedgerRow key={entry.id} entry={entry} />
          ))}
        </Card>
      )}
      <Button title="전체 거래 내역" variant="secondary" onPress={() => router.push('/history')} />
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
});
