import { Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { formatNumber, formatWon } from '@/engine/format';
import { getStockDef } from '@/engine/market';
import { type PendingOrder } from '@/engine/portfolio';
import { useTheme } from '@/hooks/use-theme';
import { useGameStore } from '@/store/game-store';

import { ThemedText } from './themed';
import { Card } from './ui';

type Props = {
  orders: PendingOrder[];
  /** 종목 상세 화면처럼 한 종목만 보여줄 때는 종목명을 생략한다. */
  showStockName?: boolean;
};

/** 미체결 지정가 주문 목록 (취소 버튼 포함). 주문이 없으면 아무것도 그리지 않는다. */
export function PendingOrders({ orders, showStockName = true }: Props) {
  const theme = useTheme();
  const cancelOrder = useGameStore((s) => s.cancelOrder);
  if (orders.length === 0) return null;

  return (
    <Card>
      <ThemedText type="heading">미체결 주문</ThemedText>
      {orders.map((order) => (
        <View key={order.id} style={styles.row}>
          <View style={styles.main}>
            <ThemedText type="smallBold">
              <ThemedText type="smallBold" color={order.side === 'buy' ? theme.up : theme.down}>
                지정가 {order.side === 'buy' ? '매수' : '매도'}
              </ThemedText>
              {showStockName ? ` ${getStockDef(order.stockId).name}` : ''}
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {formatWon(order.limitPrice)} × {formatNumber(order.quantity)}주 · 오늘 장 마감 시 자동 취소
            </ThemedText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`주문 ${order.id} 취소`}
            onPress={() => cancelOrder(order.id)}
            style={({ pressed }) => [
              styles.cancel,
              { backgroundColor: theme.backgroundSelected, opacity: pressed ? 0.7 : 1 },
            ]}>
            <ThemedText type="caption">취소</ThemedText>
          </Pressable>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  main: {
    flex: 1,
  },
  cancel: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.small,
  },
});
