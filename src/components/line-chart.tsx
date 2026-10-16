import { useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

type Props = {
  data: number[];
  height: number;
  color: string;
  /** x축을 이 개수로 고정한다 (장중 차트가 왼쪽부터 채워지도록). 없으면 data 길이. */
  slots?: number;
  /** 점선으로 표시할 기준값 (예: 전일 종가, 원금) */
  baseline?: number;
};

const PADDING_Y = 6;

/** 의존성 없이 SVG로 그리는 단순 라인 차트. */
export function LineChart({ data, height, color, slots, baseline }: Props) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  let path = '';
  let baselineY: number | null = null;
  if (width > 0 && data.length > 0) {
    const values = baseline === undefined ? data : [...data, baseline];
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const count = Math.max(slots ?? data.length, 2);
    const x = (i: number) => (i / (count - 1)) * width;
    const y = (v: number) => PADDING_Y + (1 - (v - min) / (max - min)) * (height - PADDING_Y * 2);
    path = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');
    if (data.length === 1) path += `L${x(0) + 1},${y(data[0]).toFixed(1)}`;
    if (baseline !== undefined) baselineY = y(baseline);
  }

  return (
    <View style={{ height }} onLayout={onLayout}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {baselineY !== null && (
            <Line
              x1={0}
              x2={width}
              y1={baselineY}
              y2={baselineY}
              stroke={theme.textSecondary}
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={0.6}
            />
          )}
          <Path d={path} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" />
        </Svg>
      )}
    </View>
  );
}
