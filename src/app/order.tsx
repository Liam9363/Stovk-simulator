import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed';
import { Button, Card, ChangeText, Chip, Row } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { formatNumber, formatWon } from '@/engine/format';
import { changeRate } from '@/engine/market';
import { maxBuyQuantity, ORDER_ERROR_MESSAGES, type TradeSide } from '@/engine/portfolio';
import { STOCK_BY_ID } from '@/engine/stocks';
import { useTheme } from '@/hooks/use-theme';
import { useGameStore } from '@/store/game-store';

const QUICK_RATIOS = [0.1, 0.25, 0.5, 1];

export default function OrderScreen() {
  const params = useLocalSearchParams<{ id: string; side: TradeSide }>();
  const theme = useTheme();
  const def = STOCK_BY_ID[params.id];
  const stock = useGameStore((s) => (def ? s.game?.market.stocks[def.id] : undefined));
  const cash = useGameStore((s) => s.game?.portfolio.cash ?? 0);
  const held = useGameStore((s) => (def ? (s.game?.portfolio.holdings[def.id]?.quantity ?? 0) : 0));
  const order = useGameStore((s) => s.order);

  const [side, setSide] = useState<TradeSide>(params.side === 'sell' ? 'sell' : 'buy');
  const [quantityText, setQuantityText] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!def || !stock) {
    return (
      <View style={styles.missing}>
        <ThemedText>종목을 찾을 수 없습니다.</ThemedText>
      </View>
    );
  }

  const quantity = Number.parseInt(quantityText, 10) || 0;
  const maxQuantity = side === 'buy' ? maxBuyQuantity(cash, stock.price) : held;
  const amount = quantity * stock.price;
  const sideColor = side === 'buy' ? theme.up : theme.down;

  const changeSide = (next: TradeSide) => {
    setSide(next);
    setQuantityText('');
    setError(null);
  };

  const setQuantity = (value: number) => {
    setQuantityText(value > 0 ? String(value) : '');
    setError(null);
  };

  const submit = () => {
    const result = order(def.id, side, quantity);
    if (result.ok) {
      router.back();
    } else {
      setError(ORDER_ERROR_MESSAGES[result.error]);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: `${def.name} 주문` }} />

      <View style={styles.sides}>
        <Chip label="매수" selected={side === 'buy'} onPress={() => changeSide('buy')} />
        <Chip label="매도" selected={side === 'sell'} onPress={() => changeSide('sell')} />
      </View>

      <Card>
        <Row label="현재가 (시장가)">
          <View style={styles.price}>
            <ThemedText type="smallBold">{formatWon(stock.price)}</ThemedText>
            <ChangeText type="caption" rate={changeRate(stock)} />
          </View>
        </Row>
        <Row label={side === 'buy' ? '주문 가능 현금' : '보유 수량'}>
          {side === 'buy' ? formatWon(cash) : `${formatNumber(held)}주`}
        </Row>
        <Row label={side === 'buy' ? '최대 매수 가능' : '최대 매도 가능'}>
          {`${formatNumber(maxQuantity)}주`}
        </Row>
      </Card>

      <View>
        <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
          수량
        </ThemedText>
        <TextInput
          value={quantityText}
          onChangeText={(text) => setQuantity(Number.parseInt(text.replace(/[^0-9]/g, ''), 10) || 0)}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel="주문 수량"
          style={[
            styles.input,
            { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: sideColor },
          ]}
        />
        <View style={styles.quick}>
          {QUICK_RATIOS.map((ratio) => (
            <Chip
              key={ratio}
              label={ratio === 1 ? '최대' : `${ratio * 100}%`}
              selected={false}
              onPress={() => setQuantity(Math.floor(maxQuantity * ratio))}
            />
          ))}
        </View>
      </View>

      <Card>
        <Row label="예상 주문 금액">{formatWon(amount)}</Row>
        <Row label="주문 후 현금">{formatWon(side === 'buy' ? cash - amount : cash + amount)}</Row>
        <ThemedText type="caption" themeColor="textSecondary">
          시장가 주문은 주문하는 순간의 현재가로 체결됩니다.
        </ThemedText>
      </Card>

      {error && (
        <ThemedText type="smallBold" color={theme.up}>
          {error}
        </ThemedText>
      )}

      <Button
        title={side === 'buy' ? `${formatNumber(quantity)}주 매수` : `${formatNumber(quantity)}주 매도`}
        variant={side === 'buy' ? 'up' : 'down'}
        disabled={quantity <= 0}
        onPress={submit}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  sides: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  price: {
    alignItems: 'flex-end',
  },
  label: {
    marginBottom: Spacing.one,
  },
  input: {
    fontSize: 28,
    fontWeight: 700,
    borderWidth: 2,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  quick: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
});
