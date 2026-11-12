import type Phaser from 'phaser';
import type { WeaponId } from '../data/weapons';
import { ring } from './shapes';
import { ELEMENT_COLOR } from './ui';

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
  /** A square chunk of the weapon's colour with a white pixel: what a blow breaks off (pixel standard, DD-13). */
  chunk: 7,
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
  // The Elos' sparks in their element's colour.
  jointBreaker: [SPARK.star, ELEMENT_COLOR.earth],
  fury: [SPARK.star, ELEMENT_COLOR.fury],
  staff: [SPARK.cross, 0xd8b0ff],
  lyraStar: [SPARK.cross, 0xfff0c0],
};
const HIT_PLAIN: readonly [SparkKind, number] = [SPARK.star, 0xffffff];
/** A critical hit's double star takes its weapon's colour (only thrown weapons crit). */
const CRIT_COLOR: Partial<Record<WeaponId, number>> = { daggers: 0xffe070, fan: 0xff5a6a };
const CRIT_PLAIN = 0xffe070;

/** How hard a hit was, for its spark (NF-06). */
export const HitWeight = {
  Plain: 0,
  /** At least `config.effects.strongHit`: a bigger star and a small ring. */
  Strong: 1,
  /** A critical hit: a double star in the weapon's colour. */
  Crit: 2,
} as const;
type HitWeight = (typeof HitWeight)[keyof typeof HitWeight];

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
  hit(
    x: number,
    y: number,
    weapon: WeaponId | null,
    size: number,
    weight: HitWeight = HitWeight.Plain,
  ): void {
    if (!this.room) return;
    const st = (weapon && HIT_SPARK[weapon]) || HIT_PLAIN;
    const a = this.rand() * Math.PI * 2;
    const ox = Math.cos(a) * size * 0.4;
    const oy = Math.sin(a) * size * 0.4 - size * 0.3;
    const r = 4 + size * 0.15;
    if (weight === HitWeight.Crit) {
      // Two crossed stars, big, in the weapon's colour: the crit reads without the damage numbers.
      const c = (weapon && CRIT_COLOR[weapon]) ?? CRIT_PLAIN;
      this.add(x + ox, y + oy, ox * 2, oy * 2 - 20, 0.3, r * 1.9, c, SPARK.star);
      this.add(x - ox * 0.5, y + oy - 4, -ox * 2, oy * 2 - 30, 0.26, r * 1.3, 0xffffff, SPARK.star);
      return;
    }
    this.add(
      x + ox,
      y + oy,
      ox * 3,
      oy * 3 - 20,
      0.22,
      weight === HitWeight.Strong ? r * 1.5 : r,
      st[1],
      st[0],
    );
    if (weight === HitWeight.Strong) this.add(x, y, 0, 0, 0.18, size * 0.9, st[1], SPARK.ring, false);
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
      else if (s.kind === SPARK.chunk) s.vy += 180 * dt;
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
        case SPARK.chunk: {
          // Whole-pixel squares that shrink one step at a time, with a bright pixel on the top-left corner.
          const n = Math.max(1, Math.round((s.size * (1 - 0.6 * k)) / PX));
          g.fillStyle(s.color, a);
          block(g, s.x, s.y, n);
          g.fillStyle(0xffffff, a);
          block(g, s.x - ((n - 1) * PX) / 2, s.y - ((n - 1) * PX) / 2, 1);
          break;
        }
        case SPARK.cross: {
          const arm = Math.max(1, Math.round((s.size * (1 - 0.4 * k)) / PX));
          plus(g, s.x, s.y, arm, s.color, a);
          g.fillStyle(0xffffff, a);
          block(g, s.x, s.y, 1);
          break;
        }
        case SPARK.flake: {
          // A little plus that turns into an x half way through each spin: two frames, no rotation.
          const arm = Math.max(1, Math.round((s.size * (1 - 0.3 * k)) / PX));
          g.fillStyle(s.color, a);
          if (Math.floor(s.spin * s.age * 2) % 2 === 0) plus(g, s.x, s.y, arm, s.color, a);
          else {
            block(g, s.x, s.y, 1);
            for (let j = 1; j <= arm; j++) {
              block(g, s.x - j * PX, s.y - j * PX, 1);
              block(g, s.x + j * PX, s.y - j * PX, 1);
              block(g, s.x - j * PX, s.y + j * PX, 1);
              block(g, s.x + j * PX, s.y + j * PX, 1);
            }
          }
          break;
        }
        case SPARK.ember: {
          const n = Math.max(1, Math.round((s.size * 0.9 * (1 - 0.6 * k)) / PX));
          g.fillStyle(s.color, a);
          block(g, s.x, s.y, n);
          if (n > 1) {
            g.fillStyle(0xfff0a0, a);
            block(g, s.x, s.y, n - 1);
          }
          break;
        }
        case SPARK.confetti: {
          // A flat chip that flips: wide, then tall, then wide.
          const long = Math.max(2, Math.round((s.size * 0.8) / PX));
          g.fillStyle(s.color, a);
          if (Math.floor(s.spin * s.age) % 2 === 0) g.fillRect(snap(s.x), snap(s.y), long * PX, PX);
          else g.fillRect(snap(s.x), snap(s.y), PX, long * PX);
          break;
        }
        case SPARK.drop: {
          // A drop: a block with a point on top, falling.
          const n = Math.max(1, Math.round((s.size * 0.8) / PX));
          g.fillStyle(s.color, a);
          block(g, s.x, s.y, n);
          block(g, s.x, s.y - n * PX, Math.max(1, n - 1));
          g.fillStyle(0xffffff, 0.7 * a);
          block(g, s.x - PX, s.y, 1);
          break;
        }
        case SPARK.ring: {
          const e = 1 - (1 - k) ** 3;
          g.lineStyle(Math.max(2, 2 * Math.round(3 * (1 - k))), s.color, a);
          ring(g, s.x, s.y, s.size * e);
          break;
        }
      }
    }
  }
}

/** Art pixel of the effects, in world px: sparks are drawn as blocks snapped to this grid. */
const PX = 2;
const snap = (v: number): number => Math.round(v / PX) * PX;

/** A square of `n` x `n` art pixels centred on (x, y), snapped to the grid (current fill style). */
function block(g: Phaser.GameObjects.Graphics, x: number, y: number, n: number): void {
  const side = n * PX;
  g.fillRect(snap(x - side / 2), snap(y - side / 2), side, side);
}

/** A plus of blocks with arms of `arm` pixels. */
function plus(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  arm: number,
  color: number,
  alpha: number,
): void {
  g.fillStyle(color, alpha);
  block(g, x, y, 1);
  for (let j = 1; j <= arm; j++) {
    block(g, x - j * PX, y, 1);
    block(g, x + j * PX, y, 1);
    block(g, x, y - j * PX, 1);
    block(g, x, y + j * PX, 1);
  }
}

/** A four-point twinkle of radius `r`, made of pixel blocks. */
export function star(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  r: number,
  color: number,
  alpha: number,
): void {
  plus(g, x, y, Math.max(1, Math.round(r / PX)), color, alpha);
}
