import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed';
import { Button, Card, ChangeText, Chip, Row, TermLabel } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { FEE_RATE, SELL_TAX_RATE } from '@/engine/config';
import { formatNumber, formatWon } from '@/engine/format';
import { isOnTick, priceLimits, roundToTick, stepPrice } from '@/engine/krx';
import { changeRate } from '@/engine/market';
import {
  availableCash,
  availableShares,
  calcFee,
  calcSellTax,
  maxBuyQuantity,
  ORDER_ERROR_MESSAGES,
  type OrderType,
  type TradeSide,
} from '@/engine/portfolio';
import { STOCK_BY_ID } from '@/engine/stocks';
import { useTheme } from '@/hooks/use-theme';
import { useGameStore } from '@/store/game-store';

const QUICK_RATIOS = [0.1, 0.25, 0.5, 1];

function parseDigits(text: string): number {
  return Number.parseInt(text.replace(/[^0-9]/g, ''), 10) || 0;
}

export default function OrderScreen() {
  const params = useLocalSearchParams<{ id: string; side: TradeSide }>();
  const theme = useTheme();
  const def = STOCK_BY_ID[params.id];
  const stock = useGameStore((s) => (def ? s.game?.market.stocks[def.id] : undefined));
  const portfolio = useGameStore((s) => s.game?.portfolio);
  const order = useGameStore((s) => s.order);

  const [side, setSide] = useState<TradeSide>(params.side === 'sell' ? 'sell' : 'buy');
  const [type, setType] = useState<OrderType>('market');
  const [quantityText, setQuantityText] = useState('');
  const [limitPrice, setLimitPrice] = useState(stock?.price ?? 0);
  const [error, setError] = useState<string | null>(null);

  if (!def || !stock || !portfolio) {
    return (
      <View style={styles.missing}>
        <ThemedText>종목을 찾을 수 없습니다.</ThemedText>
      </View>
    );
  }

  const cash = availableCash(portfolio);
  const shares = availableShares(portfolio, def.id);
  const quantity = parseDigits(quantityText);
  const orderPrice = type === 'market' ? stock.price : limitPrice;
  const maxQuantity = side === 'buy' ? maxBuyQuantity(cash, orderPrice) : shares;
  const amount = quantity * orderPrice;
  const fee = calcFee(amount);
  const tax = side === 'sell' ? calcSellTax(amount) : 0;
  const total = side === 'buy' ? amount + fee : amount - fee - tax;
  const limits = priceLimits(stock.prevClose);
  const sideColor = side === 'buy' ? theme.up : theme.down;
  const sideLabel = side === 'buy' ? '매수' : '매도';

  const resetError = () => setError(null);

  const changeSide = (next: TradeSide) => {
    setSide(next);
    setQuantityText('');
    resetError();
  };

  const changeType = (next: OrderType) => {
    setType(next);
    setLimitPrice(stock.price);
    resetError();
  };

  const setQuantity = (value: number) => {
    setQuantityText(value > 0 ? String(value) : '');
    resetError();
  };

  const clampPrice = (price: number) => Math.min(limits.upper, Math.max(limits.lower, price));

  const submit = () => {
    if (type === 'limit' && !isOnTick(limitPrice)) {
      setLimitPrice(clampPrice(roundToTick(limitPrice)));
      setError(ORDER_ERROR_MESSAGES.invalid_tick);
      return;
    }
    const result = order({
      stockId: def.id,
      side,
      type,
      quantity,
      limitPrice: type === 'limit' ? limitPrice : undefined,
    });
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

      <View style={styles.toggles}>
        <View style={styles.toggleGroup}>
          <Chip label="매수" selected={side === 'buy'} onPress={() => changeSide('buy')} />
          <Chip label="매도" selected={side === 'sell'} onPress={() => changeSide('sell')} />
        </View>
        <View style={styles.toggleGroup}>
          <Chip label="시장가" selected={type === 'market'} onPress={() => changeType('market')} />
          <Chip label="지정가" selected={type === 'limit'} onPress={() => changeType('limit')} />
        </View>
      </View>

      <Card>
        <Row label="현재가" term={type === 'market' ? 'market_order' : 'tick_size'}>
          <View style={styles.price}>
            <ThemedText type="smallBold">{formatWon(stock.price)}</ThemedText>
            <ChangeText type="caption" rate={changeRate(stock)} />
          </View>
        </Row>
        <Row label={side === 'buy' ? '주문 가능 현금' : '주문 가능 수량'} term={side === 'buy' ? 'orderable_cash' : 'pending_order'}>
          {side === 'buy' ? formatWon(cash) : `${formatNumber(shares)}주`}
        </Row>
        <Row label={`최대 ${sideLabel} 가능`}>{`${formatNumber(maxQuantity)}주`}</Row>
      </Card>

      {type === 'limit' && (
        <View>
          <View style={styles.label}>
            <TermLabel type="small" themeColor="textSecondary" term="limit_order">
              지정가 (하한가 {formatNumber(limits.lower)} ~ 상한가 {formatNumber(limits.upper)})
            </TermLabel>
          </View>
          <View style={styles.stepper}>
            <StepButton
              label="−"
              accessibilityLabel="호가 내리기"
              onPress={() => {
                setLimitPrice(clampPrice(stepPrice(limitPrice, -1)));
                resetError();
              }}
            />
            <TextInput
              value={limitPrice > 0 ? formatNumber(limitPrice) : ''}
              onChangeText={(text) => {
                setLimitPrice(parseDigits(text));
                resetError();
              }}
              onEndEditing={() => setLimitPrice(clampPrice(roundToTick(limitPrice)))}
              keyboardType="number-pad"
              accessibilityLabel="지정가"
              style={[
                styles.input,
                styles.priceInput,
                { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}
            />
            <StepButton
              label="+"
              accessibilityLabel="호가 올리기"
              onPress={() => {
                setLimitPrice(clampPrice(stepPrice(limitPrice, 1)));
                resetError();
              }}
            />
          </View>
        </View>
      )}

      <View>
        <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
          수량
        </ThemedText>
        <TextInput
          value={quantityText}
          onChangeText={(text) => setQuantity(parseDigits(text))}
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
        <Row label="주문 금액">{formatWon(amount)}</Row>
        <Row label={`수수료 (${(FEE_RATE * 100).toFixed(3)}%)`} term="fee">{formatWon(fee)}</Row>
        {side === 'sell' && <Row label={`거래세 (${(SELL_TAX_RATE * 100).toFixed(2)}%)`} term="sell_tax">{formatWon(tax)}</Row>}
        <Row label={side === 'buy' ? '총 결제 금액' : '예상 정산 금액'}>
          <ThemedText type="smallBold" color={sideColor}>
            {formatWon(total)}
          </ThemedText>
        </Row>
        <ThemedText type="caption" themeColor="textSecondary">
          {type === 'market'
            ? '시장가 주문은 주문하는 순간의 현재가로 체결됩니다.'
            : side === 'buy'
              ? '현재가가 지정가 이하로 내려오면 체결됩니다. 체결 전까지 주문 금액만큼 현금이 묶이고, 오늘 장이 끝나면 자동 취소됩니다.'
              : '현재가가 지정가 이상으로 올라오면 체결됩니다. 체결 전까지 주문 수량은 다른 주문에 쓸 수 없고, 오늘 장이 끝나면 자동 취소됩니다.'}
        </ThemedText>
      </Card>

      {error && (
        <ThemedText type="smallBold" color={theme.up}>
          {error}
        </ThemedText>
      )}

      <Button
        title={`${formatNumber(quantity)}주 ${type === 'limit' ? '지정가 ' : ''}${sideLabel}`}
        variant={side === 'buy' ? 'up' : 'down'}
        disabled={quantity <= 0}
        onPress={submit}
      />
    </ScrollView>
  );
}

function StepButton({
  label,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.stepButton,
        { backgroundColor: theme.backgroundSelected, opacity: pressed ? 0.7 : 1 },
      ]}>
      <ThemedText type="subtitle">{label}</ThemedText>
    </Pressable>
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
    // 튜토리얼 안내 카드에 주문 버튼이 가려지지 않도록 아래 여백을 넉넉히 둔다.
    paddingBottom: Spacing.six * 3,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  toggles: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  toggleGroup: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  price: {
    alignItems: 'flex-end',
  },
  label: {
    marginBottom: Spacing.one,
  },
  stepper: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  stepButton: {
    width: 56,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
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
  priceInput: {
    flex: 1,
    // 웹에서 TextInput 기본 너비가 행 밖으로 밀려나지 않도록 한다.
    minWidth: 0,
    width: '100%',
    fontSize: 22,
  },
  quick: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
});
