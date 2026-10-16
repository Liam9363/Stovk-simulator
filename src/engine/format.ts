/** 화면 표시용 포맷터. */

const wonFormatter = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 });

export function formatNumber(value: number): string {
  return wonFormatter.format(Math.round(value));
}

export function formatWon(value: number): string {
  return `${formatNumber(value)}원`;
}

/** 부호를 붙인 금액. 예: +12,300 / -4,500 */
export function formatSignedNumber(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded > 0 ? '+' : rounded < 0 ? '-' : '';
  return `${sign}${formatNumber(Math.abs(rounded))}`;
}

/** 부호를 붙인 퍼센트. 0.0123 → +1.23% */
export function formatRate(rate: number): string {
  const percent = rate * 100;
  const fixed = Math.abs(percent).toFixed(2);
  if (fixed === '0.00') return '0.00%';
  return `${percent > 0 ? '+' : '-'}${fixed}%`;
}

/** 큰 금액 축약. 12,345,678 → 1,235만, 123,456,789 → 1.23억 */
export function formatCompactWon(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 100_000_000) return `${(value / 100_000_000).toFixed(2)}억`;
  if (abs >= 10_000) return `${formatNumber(value / 10_000)}만`;
  return formatNumber(value);
}

export function formatIndex(value: number): string {
  return value.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** 거래일 표시. 게임 시작 전(워밍업) 날짜는 "시작 N일 전"으로 보여준다. */
export function formatDay(day: number): string {
  if (day <= 0) return `시작 ${1 - day}일 전`;
  return `${day}일차`;
}
