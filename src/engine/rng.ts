/**
 * 시드 기반 난수 생성기 (mulberry32).
 * 상태가 숫자 하나라서 게임 저장 시 그대로 직렬화할 수 있다.
 */
export type RngState = number;

/** [0, 1) 난수와 다음 상태를 반환한다. */
export function nextFloat(state: RngState): [number, RngState] {
  const next = (state + 0x6d2b79f5) | 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, next];
}

/**
 * 가변 상태를 감싼 편의 래퍼. 엔진 내부 한 스텝 동안만 사용하고
 * 끝나면 `state`를 다시 게임 상태에 저장한다.
 */
export class Rng {
  constructor(public state: RngState) {}

  float(): number {
    const [value, next] = nextFloat(this.state);
    this.state = next;
    return value;
  }

  /** 표준정규분포 난수 (Box-Muller). */
  normal(): number {
    let u = 0;
    while (u === 0) u = this.float();
    const v = this.float();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.float();
  }
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
