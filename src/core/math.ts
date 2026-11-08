export interface Vec2 {
  x: number;
  y: number;
}

export const TAU = Math.PI * 2;

export const clamp = (v: number, min: number, max: number): number => (v < min ? min : v > max ? max : v);

export const distSq = (ax: number, ay: number, bx: number, by: number): number => {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
};

/** Normalizes (x, y) into `out`; a zero vector stays zero. Returns the original length. */
export function normalizeInto(out: Vec2, x: number, y: number): number {
  const len = Math.hypot(x, y);
  if (len === 0) {
    out.x = 0;
    out.y = 0;
  } else {
    out.x = x / len;
    out.y = y / len;
  }
  return len;
}

/** Smallest signed difference between two angles, in (-PI, PI]. */
export function angleDiff(a: number, b: number): number {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d <= -Math.PI) d += TAU;
  return d;
}

/** Small, fast, seedable PRNG (mulberry32), so runs and tests are reproducible. */
export class Rng {
  private s: number;

  constructor(seed = Date.now()) {
    this.s = seed >>> 0;
  }

  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  /** Picks an item by `weight`. */
  weighted<T extends { weight: number }>(items: readonly T[]): T {
    let total = 0;
    for (const it of items) total += it.weight;
    let r = this.next() * total;
    for (const it of items) {
      r -= it.weight;
      if (r < 0) return it;
    }
    return items[items.length - 1] as T;
  }

  /** A random element, or undefined for an empty array. */
  pick<T>(arr: readonly T[]): T | undefined {
    return arr.length > 0 ? arr[this.int(arr.length)] : undefined;
  }

  /** Fisher-Yates shuffle, in place. */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [arr[i], arr[j]] = [arr[j] as T, arr[i] as T];
    }
    return arr;
  }
}
