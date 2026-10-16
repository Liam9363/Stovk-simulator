import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { formatNumber } from '@/engine/format';
import { changeRate, type StockState } from '@/engine/market';
import { SECTORS, type StockDef } from '@/engine/stocks';
import { useChangeColor } from '@/hooks/use-theme';

import { ThemedText } from './themed';
import { ChangeText } from './ui';

type Props = { def: StockDef; stock: StockState };

export function StockRow({ def, stock }: Props) {
  const rate = changeRate(stock);
  const color = useChangeColor(rate);
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push({ pathname: '/stock/[id]', params: { id: def.id } })}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.name}>
        <ThemedText type="default" numberOfLines={1}>
          {def.name}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {SECTORS[def.sector]}
        </ThemedText>
      </View>
      <View style={styles.price}>
        <ThemedText type="default" color={color}>
          {formatNumber(stock.price)}
        </ThemedText>
        <ChangeText type="caption" rate={rate} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two + Spacing.half,
    gap: Spacing.three,
  },
  pressed: { opacity: 0.6 },
  name: { flex: 1 },
  price: { alignItems: 'flex-end' },
});
