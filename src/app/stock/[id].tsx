import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GameHud } from '@/components/game-hud';
import { LineChart } from '@/components/line-chart';
import { NewsRow } from '@/components/news-list';
import { PendingOrders } from '@/components/pending-orders';
import { ThemedText } from '@/components/themed';
import { Button, Card, ChangeText, Chip, PnlText, Row } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { TICKS_PER_DAY } from '@/engine/config';
import { dividendPerShare, nextDividendDay } from '@/engine/dividend';
import { formatDay, formatNumber, formatWon } from '@/engine/format';
import { priceLimits } from '@/engine/krx';
import { changeRate } from '@/engine/market';
import { isNewsRelated } from '@/engine/news';
import { type TradeSide } from '@/engine/portfolio';
import { SECTORS, STOCK_BY_ID } from '@/engine/stocks';
import { useChangeColor, useTheme } from '@/hooks/use-theme';
import { useGameStore } from '@/store/game-store';

type Range = 'today' | '1m' | '3m';

const RELATED_NEWS = 5;

const RANGES: { key: Range; label: string; days: number }[] = [
  { key: 'today', label: '오늘', days: 0 },
  { key: '1m', label: '1개월', days: 20 },
  { key: '3m', label: '3개월', days: 60 },
];

export default function StockScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const def = STOCK_BY_ID[id];
  const stock = useGameStore((s) => (def ? s.game?.market.stocks[def.id] : undefined));
  const holding = useGameStore((s) => (def ? s.game?.portfolio.holdings[def.id] : undefined));
  const orders = useGameStore((s) => s.game?.portfolio.orders);
  const news = useGameStore((s) => s.game?.market.news);
  const day = useGameStore((s) => s.game?.market.day ?? 1);
  const [range, setRange] = useState<Range>('today');
  const rate = stock ? changeRate(stock) : 0;
  const color = useChangeColor(rate);

  if (!def || !stock) {
    return (
      <View style={styles.missing}>
        <ThemedText>종목을 찾을 수 없습니다.</ThemedText>
      </View>
    );
  }

  const days = RANGES.find((r) => r.key === range)!.days;
  const chartData =
    range === 'today'
      ? stock.intraday
      : [...stock.history.slice(-days).map((c) => c.close), stock.price];
  const chartBaseline = range === 'today' ? stock.prevClose : undefined;
  const chartColor =
    range === 'today' ? color : chartData[chartData.length - 1] >= chartData[0] ? theme.up : theme.down;
  const limits = priceLimits(stock.prevClose);
  const diff = stock.price - stock.prevClose;
  const stockOrders = (orders ?? []).filter((o) => o.stockId === def.id);
  const relatedNews = (news ?? [])
    .filter((item) => isNewsRelated(item, def))
    .slice(-RELATED_NEWS)
    .reverse();
  const dividendDay = nextDividendDay(day);
  const expectedDps = dividendPerShare(def, stock.price);

  const openOrder = (side: TradeSide) =>
    router.push({ pathname: '/order', params: { id: def.id, side } });

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ title: def.name }} />
      <GameHud />
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <ThemedText type="small" themeColor="textSecondary">
            {SECTORS[def.sector]} · {def.id}
          </ThemedText>
          <ThemedText type="title" color={color}>
            {formatWon(stock.price)}
          </ThemedText>
          <View style={styles.changeRow}>
            <ThemedText type="smallBold" color={color}>
              {diff > 0 ? '▲ ' : diff < 0 ? '▼ ' : ''}
              {formatNumber(Math.abs(diff))}
            </ThemedText>
            <ChangeText type="smallBold" rate={rate} />
          </View>
        </View>

        <LineChart
          data={chartData}
          slots={range === 'today' ? TICKS_PER_DAY + 1 : undefined}
          baseline={chartBaseline}
          color={chartColor}
          height={200}
        />
        <View style={styles.ranges}>
          {RANGES.map((r) => (
            <Chip key={r.key} label={r.label} selected={range === r.key} onPress={() => setRange(r.key)} />
          ))}
        </View>

        {holding && (
          <Card>
            <ThemedText type="heading">내 보유</ThemedText>
            <Row label="보유 수량">{`${formatNumber(holding.quantity)}주`}</Row>
            <Row label="평균 매입가">{formatWon(holding.avgPrice)}</Row>
            <Row label="평가금액">{formatWon(stock.price * holding.quantity)}</Row>
            <Row label="평가손익">
              <PnlText
                type="smallBold"
                amount={(stock.price - holding.avgPrice) * holding.quantity}
                rate={stock.price / holding.avgPrice - 1}
              />
            </Row>
          </Card>
        )}

        <PendingOrders orders={stockOrders} showStockName={false} />

        <Card>
          <ThemedText type="heading">시세</ThemedText>
          <Row label="전일 종가">{formatWon(stock.prevClose)}</Row>
          <Row label="시가">{formatWon(stock.open)}</Row>
          <Row label="고가">
            <ThemedText type="smallBold" color={theme.up}>
              {formatWon(stock.high)}
            </ThemedText>
          </Row>
          <Row label="저가">
            <ThemedText type="smallBold" color={theme.down}>
              {formatWon(stock.low)}
            </ThemedText>
          </Row>
          <Row label="상한가 / 하한가">{`${formatNumber(limits.upper)} / ${formatNumber(limits.lower)}`}</Row>
        </Card>

        {relatedNews.length > 0 && (
          <Card>
            <ThemedText type="heading">관련 뉴스</ThemedText>
            {relatedNews.map((item) => (
              <NewsRow key={item.id} item={item} linkToStock={false} />
            ))}
          </Card>
        )}

        <Card>
          <ThemedText type="heading">배당</ThemedText>
          {def.dividendYield > 0 ? (
            <>
              <Row label="연 배당수익률">{`${(def.dividendYield * 100).toFixed(1)}% (분기 배당)`}</Row>
              <Row label="다음 배당일">
                {`${formatDay(dividendDay)} 장 마감${dividendDay === day ? ' (오늘)' : ` (D-${dividendDay - day})`}`}
              </Row>
              <Row label="예상 주당 배당금">{formatWon(expectedDps)}</Row>
              {holding && (
                <Row label="내 예상 배당금 (세전)">{formatWon(expectedDps * holding.quantity)}</Row>
              )}
              <ThemedText type="caption" themeColor="textSecondary">
                배당일 장 마감 때 보유한 주식에 배당금이 지급되고(배당소득세 15.4% 원천징수), 다음
                거래일 기준가는 배당금만큼 낮아집니다(배당락).
              </ThemedText>
            </>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              배당을 하지 않는 성장주입니다.
            </ThemedText>
          )}
        </Card>

        <Card>
          <ThemedText type="heading">기업 정보</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {def.description}
          </ThemedText>
        </Card>
      </ScrollView>

      <View
        style={[
          styles.actions,
          { paddingBottom: insets.bottom + Spacing.two, borderTopColor: theme.border },
        ]}>
        <Button
          title="매도"
          variant="down"
          disabled={!holding}
          onPress={() => openOrder('sell')}
          style={styles.actionButton}
        />
        <Button title="매수" variant="up" onPress={() => openOrder('buy')} style={styles.actionButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  changeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  ranges: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionButton: {
    flex: 1,
  },
});
