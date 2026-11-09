import type Phaser from 'phaser';
import type { WeaponId } from '../data/weapons';
import { disc, ring } from './shapes';

/**
 * A fixed pool of tiny cartoon sparks (hit sparks, death stars, confetti, rings), created once and never
 * reallocated. A hard cap (half with the calm screen) and a per-frame budget keep 500-enemy waves cheap.
 * Fed by GameScene from what the core already exposes (fresh hits, new puffs); purely visual.
 */
export const SPARK = {
  /** White four-point star: blades, knives, hammers, shields. */
  star: 0,
  /** Gold plus: holy light. */
  cross: 1,
  /** White-lilac snowflake: frost. */
  flake: 2,
  /** Ember that floats up: fire. */
  ember: 3,
  /** Confetti that falls: an elite's chest. */
  confetti: 4,
  /** A ring growing out: big moments. */
  ring: 5,
  /** A drop that falls: bleeding. */
  drop: 6,
} as const;
type SparkKind = (typeof SPARK)[keyof typeof SPARK];

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  ttl: number;
  size: number;
  color: number;
  kind: SparkKind;
  spin: number;
}

const CAP = 96;
/** New sparks allowed per frame (big moments may go over it, never over the cap). */
const BUDGET = 24;

/** The spark a weapon's hit makes: [kind, color]. Weapons not listed make a white star. */
export const HIT_SPARK: Partial<Record<WeaponId, readonly [SparkKind, number]>> = {
  yahAura: [SPARK.cross, 0xffd870],
  elunLight: [SPARK.cross, 0xb8f0a0],
  holyLight: [SPARK.cross, 0xfff6c0],
  wisps: [SPARK.cross, 0x9af0e8],
  soulProcession: [SPARK.cross, 0xc0d8ff],
  lightning: [SPARK.cross, 0xe0b8ff],
  storm: [SPARK.cross, 0xe0b8ff],
  frost: [SPARK.flake, 0xf0ecff],
  blizzard: [SPARK.flake, 0xf0ecff],
  fire: [SPARK.ember, 0xffa83a],
  fireSword: [SPARK.ember, 0xff8a20],
  yahFlame: [SPARK.ember, 0xff9a30],
  forgeFury: [SPARK.ember, 0xffa040],
  jointBreaker: [SPARK.star, 0xffc890],
  staff: [SPARK.cross, 0xd8b0ff],
  lyraStar: [SPARK.cross, 0xfff0c0],
};
const HIT_PLAIN: readonly [SparkKind, number] = [SPARK.star, 0xffffff];

export class Sparks {
  private readonly items: Spark[] = [];
  private n = 0;
  private made = 0;
  private seed = 0x9e3779b9;
  /** The cap in use (halved with the calm screen). */
  cap = CAP;

  constructor() {
    for (let i = 0; i < CAP; i++)
      this.items.push({ x: 0, y: 0, vx: 0, vy: 0, age: 0, ttl: 1, size: 1, color: 0, kind: 0, spin: 0 });
  }

  /** A cheap render-only random in [0, 1) (never the run's Rng). */
  rand(): number {
    let s = this.seed;
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    this.seed = s >>> 0;
    return this.seed / 4294967296;
  }

  /** Call once per frame before spawning: resets the per-frame budget and applies the calm cap. */
  frame(calm: boolean): void {
    this.made = 0;
    this.cap = calm ? CAP / 2 : CAP;
  }

  get room(): boolean {
    return this.made < BUDGET && this.n < this.cap;
  }

  /** Room for ambient sparks (drips, embers off a status): only while the pool is half empty, so hits keep theirs. */
  get idle(): boolean {
    return this.made < BUDGET / 2 && this.n < this.cap / 2;
  }

  /** Adds a spark; `force` skips the per-frame budget (never the cap). */
  add(
    x: number,
    y: number,
    vx: number,
    vy: number,
    ttl: number,
    size: number,
    color: number,
    kind: SparkKind,
    force = false,
  ): void {
    if (this.n >= this.cap || (!force && this.made >= BUDGET)) return;
    this.made++;
    const s = this.items[this.n++] as Spark;
    s.x = x;
    s.y = y;
    s.vx = vx;
    s.vy = vy;
    s.age = 0;
    s.ttl = ttl;
    s.size = size;
    s.color = color;
    s.kind = kind;
    s.spin = (this.rand() - 0.5) * 12;
  }

  /** A hit by `weapon` on something at (x, y): its spark, popping up and out. */
  hit(x: number, y: number, weapon: WeaponId | null, size: number): void {
    if (!this.room) return;
    const st = (weapon && HIT_SPARK[weapon]) || HIT_PLAIN;
    const a = this.rand() * Math.PI * 2;
    const ox = Math.cos(a) * size * 0.4;
    const oy = Math.sin(a) * size * 0.4 - size * 0.3;
    this.add(x + ox, y + oy, ox * 3, oy * 3 - 20, 0.22, 4 + size * 0.15, st[1], st[0]);
  }

  /** Some sparks flying out of (x, y) in every direction. */
  burst(
    x: number,
    y: number,
    count: number,
    speed: number,
    size: number,
    color: number,
    kind: SparkKind,
    ttl = 0.4,
    force = true,
  ): void {
    for (let i = 0; i < count; i++) {
      const a = ((i + this.rand() * 0.6) / count) * Math.PI * 2;
      const v = speed * (0.6 + 0.4 * this.rand());
      this.add(
        x,
        y,
        Math.cos(a) * v,
        Math.sin(a) * v,
        ttl * (0.8 + 0.4 * this.rand()),
        size,
        color,
        kind,
        force,
      );
    }
  }

  update(dt: number): void {
    for (let i = this.n - 1; i >= 0; i--) {
      const s = this.items[i] as Spark;
      s.age += dt;
      if (s.age >= s.ttl) {
        // Swap-remove: the last live spark takes this slot.
        const last = this.items[--this.n] as Spark;
        this.items[i] = last;
        this.items[this.n] = s;
        continue;
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      const drag = 1 - 4 * dt;
      s.vx *= drag;
      s.vy *= drag;
      if (s.kind === SPARK.ember) s.vy -= 60 * dt;
      else if (s.kind === SPARK.confetti) s.vy += 140 * dt;
      else if (s.kind === SPARK.drop) s.vy += 260 * dt;
    }
  }

  draw(g: Phaser.GameObjects.Graphics): void {
    for (let i = 0; i < this.n; i++) {
      const s = this.items[i] as Spark;
      const k = s.age / s.ttl; // 0 -> 1
      const a = 1 - k * k;
      switch (s.kind) {
        case SPARK.star:
          star(g, s.x, s.y, s.size * (1 - 0.5 * k), s.color, a);
          break;
        case SPARK.cross: {
          const r = s.size * (1 - 0.4 * k);
          const w = r * 0.32;
          g.fillStyle(s.color, a)
            .fillRect(s.x - r, s.y - w, r * 2, w * 2)
            .fillRect(s.x - w, s.y - r, w * 2, r * 2);
          g.fillStyle(0xffffff, a);
          disc(g, s.x, s.y, w * 1.2);
          break;
        }
        case SPARK.flake: {
          const r = s.size * (1 - 0.3 * k);
          const t = s.spin * s.age;
          g.lineStyle(1.5, s.color, a);
          for (let j = 0; j < 3; j++) {
            const ang = t + (j * Math.PI) / 3;
            const cx = Math.cos(ang) * r;
            const cy = Math.sin(ang) * r;
            g.lineBetween(s.x - cx, s.y - cy, s.x + cx, s.y + cy);
          }
          break;
        }
        case SPARK.ember: {
          const r = s.size * 0.45 * (1 - 0.6 * k);
          g.fillStyle(s.color, a);
          disc(g, s.x, s.y, r);
          g.fillStyle(0xfff0a0, a);
          disc(g, s.x, s.y - r * 0.2, r * 0.5);
          break;
        }
        case SPARK.confetti: {
          const t = s.spin * s.age;
          const ux = Math.cos(t) * s.size * 0.6;
          const uy = Math.sin(t) * s.size * 0.6;
          g.fillStyle(s.color, a).fillTriangle(
            s.x - ux,
            s.y - uy,
            s.x + uy * 0.6,
            s.y - ux * 0.6,
            s.x + ux,
            s.y + uy,
          );
          break;
        }
        case SPARK.drop: {
          // A round drop with a point on top, falling.
          const r = s.size * 0.4;
          g.fillStyle(s.color, a);
          disc(g, s.x, s.y, r);
          g.fillTriangle(s.x - r * 0.9, s.y - r * 0.3, s.x + r * 0.9, s.y - r * 0.3, s.x, s.y - r * 2.4);
          g.fillStyle(0xffffff, 0.7 * a);
          disc(g, s.x - r * 0.35, s.y - r * 0.2, r * 0.3);
          break;
        }
        case SPARK.ring: {
          const e = 1 - (1 - k) ** 3;
          g.lineStyle(Math.max(1, 6 * (1 - k)), s.color, a);
          ring(g, s.x, s.y, s.size * e);
          break;
        }
      }
    }
  }
}

/** A cartoon four-point star of radius `r` (a twinkle). */
export function star(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  r: number,
  color: number,
  alpha: number,
): void {
  const w = r * 0.28;
  g.fillStyle(color, alpha);
  g.fillTriangle(x - w, y, x + w, y, x, y - r).fillTriangle(x - w, y, x + w, y, x, y + r);
  g.fillTriangle(x, y - w, x, y + w, x - r, y).fillTriangle(x, y - w, x, y + w, x + r, y);
}
