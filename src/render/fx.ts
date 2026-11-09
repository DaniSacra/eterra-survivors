import type Phaser from 'phaser';
import type { World } from '../core/world';
import { WEAPONS, type AuraLevel, type OrbitLevel, type WeaponId } from '../data/weapons';
import { isElo, orbitAngle, weaponStats } from '../core/weapons';
import { config } from '../data/config';
import { BossAct, CLEAVE_SHOW } from '../core/bosses';
import type { Enemy } from '../core/enemies';
import type { Bolt } from '../core/effects';
import { INK } from './art/pen';
import { UI } from './ui';
import { star } from './sparks';
import type { CharacterId } from '../data/characters';

/** Identity color of each hero, for the light under their feet (so the eye finds them in a crowd). */
export const HERO_COLOR: Record<CharacterId, number> = {
  aldo: 0xe8b840,
  lyra: 0xa84ad8,
  teo: 0x4ad08a,
  andilla: 0xe86a7a,
};
/**
 * How each swing looks: blade color, edge color, the inner radius of its crescent (a fraction of the reach: the
 * middle stays clear so enemies near the hero show), and its ground mark after the hit.
 */
interface SwingStyle {
  fill: number;
  edge: number;
  band: number;
  fillAlpha: number;
  mark: 'none' | 'shock' | 'crack';
}
const SWING_PLAIN: SwingStyle = { fill: 0xe8f0ff, edge: 0x9ad8ff, band: 0.5, fillAlpha: 0.4, mark: 'none' };
const SWING_STYLE: Partial<Record<WeaponId, SwingStyle>> = {
  blade: { fill: 0xf0f4ff, edge: HERO_COLOR.aldo, band: 0.5, fillAlpha: 0.4, mark: 'none' },
  fury: { fill: 0xfff0b0, edge: 0xffa040, band: 0.62, fillAlpha: 0.45, mark: 'none' },
  mace: { fill: 0xd8d0c4, edge: 0x8a8478, band: 0.78, fillAlpha: 0.15, mark: 'shock' },
  jointBreaker: { fill: 0xf0c8a0, edge: 0xc86a3a, band: 0.74, fillAlpha: 0.15, mark: 'crack' },
};
/** The Black Knight's Corte Brutal landing: a white blade with a coral edge. */
const CLEAVE_STYLE: SwingStyle = {
  fill: 0xffffff,
  edge: UI.dangerHex,
  band: 0.35,
  fillAlpha: 0.4,
  mark: 'shock',
};
/** Fraction of a swing's life spent sweeping; the rest the trail catches up and fades. */
const SWEEP = 0.55;
/** Elos get warmer, brighter versions of their base colors. */
const AURA_COLOR = 0xffc040;
const FLAME_COLOR = 0xff9a30;
/** How each orbit weapon's pieces look: cartoon swords pointing the way they spin, or hanging bells. */
interface OrbitStyle {
  color: number;
  dark: number;
  blade: boolean;
}
const ORBIT_STYLE: Partial<Record<WeaponId, OrbitStyle>> = {
  bells: { color: 0xc89040, dark: 0x8a5a24, blade: false },
  funeralToll: { color: 0xe8b860, dark: 0xa87a30, blade: false },
  vigil: { color: 0xf0f6ff, dark: 0xe8b840, blade: true },
};
const SWORDS: OrbitStyle = { color: 0xcbd8ec, dark: 0x9a6232, blade: true };
const FROST_COLOR = 0x9ad8ff;
const BLIZZARD_COLOR = 0xe8f6ff;
const BLIZZARD_EDGE = 0x4a8ad8;
/**
 * How each strike weapon falls from the sky. Lightning (default, Lyra's): bolt color and its outline width, and
 * `branches` for Tempestade. Fire: a fireball, or a burning sword (`sword`) that plants itself.
 */
interface BoltStyle {
  color: number;
  core: number;
  width: number;
  fire: boolean;
  sword: boolean;
  branches: number;
}
const BOLT_PLAIN: BoltStyle = {
  color: 0xc890ff,
  core: 0xffffff,
  width: 5,
  fire: false,
  sword: false,
  branches: 0,
};
const BOLT_STYLE: Partial<Record<WeaponId, BoltStyle>> = {
  storm: { color: 0xd8b8ff, core: 0xffffff, width: 7, fire: false, sword: false, branches: 2 },
  fire: { color: 0xffa83a, core: 0xffe070, width: 5, fire: true, sword: false, branches: 0 },
  fireSword: { color: 0xff8a20, core: 0xfff0a0, width: 7, fire: true, sword: true, branches: 0 },
};
/** The burning sword of Espada de Fogo, drawn with the orbit swords' shape. */
const FIRE_SWORD: OrbitStyle = { color: 0xffd890, dark: 0xff6a20, blade: true };
/** Part of a strike's life spent falling, before the burst on the ground. */
const FALL = 0.25;
const PUFF_COLOR = 0xf4f6fb;
const PUFF_SHADE = 0xb8c0d8;
/** Death puffs this big are bosses (radius 30 and up; elites are 18 to 26). */
export const BOSS_PUFF = 30;
export const ELITE_PUFF = 18;
const GEM_GLINT = 0x8adcff;
const ITEM_GLINT = 0xffd870;
const HP_OK = 0x7cd860;
const HP_LOW = 0xd83a4a;
/** Tints of enemies: hit (a white fill), frozen by Sopro de Geada, slowed by frost. And the hero's hurt wash. */
export const TINT = {
  hit: 0xffffff,
  frozen: 0x80c8ff,
  /** Top of a frozen enemy (the frost on it): the bottom gets `frozen`. */
  frost: 0xf4f6ff,
  slowed: 0xb8e0ff,
  heroHurt: 0xff9090,
  /** The hero's outline while invulnerable, and the snow under the menu's party. */
  blink: 0xffffff,
  snow: 0xe8eff8,
};
/** Damage numbers: normal and strong hits. */
export const DAMAGE_TEXT = { color: '#ffffff', strong: '#ffd870', stroke: '#1a1424' };
/** Lightning layers: width factor, color (-1 = the bolt's color), alpha. Preallocated. */
const BOLT_LAYERS: readonly [number, number, number][] = [
  [1.6, INK, 0.9],
  [1, -1, 1],
  [0.35, 0xffffff, 1],
];
/**
 * Enemy danger (boss attacks): coral pink with stripes and a marching white dashed edge, so it never reads as the
 * player's own fire (orange-gold). Same hue as the UI's danger color.
 */
const WARN_COLOR = UI.dangerHex;
const WARN_EDGE = 0xffffff;
/** Length of a dash and of the gap after it on danger edges, world px. */
const DASH = 9;

/** The ice family (white and white-lilac, never the gems' cyan): Sopro de Geada's wave and frosted screen edges. */
const ICE = 0xe8e2f4;
/** Big moments the render keeps track of: match time when they happened (-Infinity = never). */
export interface Moments {
  /** A chest was opened; `elo` if it formed an Elo. */
  chest: number;
  elo: boolean;
  /** Badalada (bomb) and Sopro de Geada (freeze) were picked up. */
  bomb: number;
  frost: number;
}
export const newMoments = (): Moments => ({
  chest: -Infinity,
  elo: false,
  bomb: -Infinity,
  frost: -Infinity,
});
/** How long the chest moment lasts (rays, ring and the reward's icon rising), seconds. */
export const CHEST_SHOW = 1.3;

/**
 * Redraws the transient shapes each frame: on the ground (under everyone) the hero light, frost and auras;
 * on top (over the enemies) orbiting pieces, slashes and bolts, so they never vanish in a crowd.
 */
export function drawFx(
  ground: Phaser.GameObjects.Graphics,
  top: Phaser.GameObjects.Graphics,
  world: World,
  m: Moments,
): void {
  let g = ground;
  g.clear();
  top.clear();
  const p = world.player;
  const hero = HERO_COLOR[world.character];
  // The hero's light: a solid ring with a slow pulse around it, so the eye finds them in any crowd.
  const pulse = 1 + 0.12 * Math.sin(world.time * 4);
  g.fillStyle(hero, 0.35).fillEllipse(p.x, p.y + 15, 44, 16);
  g.lineStyle(3, hero, 1).strokeEllipse(p.x, p.y + 15, 44, 16);
  g.lineStyle(2, 0xffffff, 0.35).strokeEllipse(p.x, p.y + 15, 52 * pulse, 20 * pulse);
  drawMoments(g, top, world, m, hero);
  if (world.boss) drawBossWarning(g, top, world.boss, world.time);
  for (const z of world.zones.active) {
    const a = Math.min(1, z.ttl / 0.4);
    const elo = !!z.source && isElo(z.source.id);
    g.fillStyle(elo ? BLIZZARD_COLOR : FROST_COLOR, (elo ? 0.34 : 0.28) * a).fillCircle(z.x, z.y, z.radius);
    g.lineStyle(elo ? 4 : 2.5, elo ? BLIZZARD_EDGE : 0xffffff, 0.8 * a).strokeCircle(z.x, z.y, z.radius);
    // Ice crystals inside (snowflakes for Nevasca), turning slowly.
    const n = elo ? 6 : 3;
    for (let i = 0; i < n; i++) {
      const ang = (i * Math.PI * 2) / n + world.time * (elo ? 0.8 : 0.4) + z.x * 0.01;
      const cx = z.x + Math.cos(ang) * z.radius * 0.55;
      const cy = z.y + Math.sin(ang) * z.radius * 0.55;
      const r = elo ? 6 : 4;
      g.lineStyle(elo ? 2 : 1.5, 0xffffff, 0.75 * a);
      g.lineBetween(cx - r, cy, cx + r, cy);
      g.lineBetween(cx - r * 0.5, cy - r * 0.87, cx + r * 0.5, cy + r * 0.87);
      g.lineBetween(cx - r * 0.5, cy + r * 0.87, cx + r * 0.5, cy - r * 0.87);
    }
  }
  for (const w of world.weapons) {
    const kind = WEAPONS[w.id].kind;
    if (kind === 'aura') {
      const st = weaponStats(w) as AuraLevel;
      drawAura(
        g,
        top,
        world,
        st.radius * p.stats.area,
        1 - w.timer / (st.cooldown * p.stats.cooldown),
        w.level,
        isElo(w.id),
      );
    } else if (kind === 'orbit') {
      const s = weaponStats(w) as OrbitLevel;
      const count = s.count + p.stats.amount;
      const orbitR = s.orbitRadius * p.stats.area;
      const r = s.radius * p.stats.area;
      const style = ORBIT_STYLE[w.id] ?? SWORDS;
      const elo = isElo(w.id);
      if (elo) top.lineStyle(2, style.dark, 0.35).strokeCircle(p.x, p.y, orbitR); // the guarded circle
      for (let i = 0; i < count; i++) {
        const a = orbitAngle(world.time, s.spin, i, count);
        const x = p.x + Math.cos(a) * orbitR;
        const y = p.y + Math.sin(a) * orbitR;
        if (elo) top.fillStyle(style.dark, 0.35).fillCircle(x, y, r * 1.5); // Elo glow
        if (style.blade) drawSword(top, x, y, a + Math.PI / 2, r, style);
        else drawBell(top, x, y, r, style);
      }
    }
  }
  g = top;
  // Life under the hero's feet, so it can be read without looking at the corner.
  const hpK = Math.max(0, p.hp / p.stats.maxHp);
  g.fillStyle(INK, 0.8).fillRoundedRect(p.x - 17, p.y + 25, 34, 6, 3);
  g.fillStyle(hpK > 0.35 ? HP_OK : HP_LOW).fillRoundedRect(p.x - 16, p.y + 26, 32 * hpK, 4, 2);
  // A chest on the ground twinkles: a soft gold ring around it and a star that blinks on its lid.
  for (const it of world.pickups.active) {
    if (it.type !== 'chest') continue;
    const tw = Math.sin(world.time * 5 + it.x) * 0.5 + 0.5;
    ground
      .lineStyle(2, ITEM_GLINT, 0.35 + 0.3 * tw)
      .strokeEllipse(it.x, it.y + 9, 34 + 4 * tw, 11 + 1.5 * tw);
    const k = Math.max(0, Math.sin(world.time * 3 + it.y)) ** 4; // mostly off, then a quick twinkle
    if (k > 0.05) star(g, it.x + 6, it.y - 9, 3 + 6 * k, 0xffffff, k);
  }
  for (const f of world.puffs.active) {
    const k = f.ttl / config.effects.puffTtl; // 1 -> 0
    if (f.kind === 'death') {
      // A cartoon poof: a white pop, then three little clouds puffing out and shrinking. (Bosses get their
      // own send-off from the sparks.)
      if (f.r >= BOSS_PUFF) continue;
      const r = f.r;
      if (k > 0.7) g.fillStyle(0xffffff, (k - 0.7) * 2).fillCircle(f.x, f.y, r * (1.1 - k * 0.4));
      const out = 1 - k;
      for (let i = 0; i < 3; i++) {
        const a = i * 2.1 + f.x * 0.37;
        const cx = f.x + Math.cos(a) * r * (0.2 + 0.8 * out);
        const cy = f.y + Math.sin(a) * r * (0.2 + 0.6 * out) - r * 0.4 * out;
        const cr = r * (0.5 - 0.15 * i) * (0.5 + k * 0.7);
        g.fillStyle(PUFF_SHADE, 0.75 * k).fillCircle(cx + cr * 0.15, cy + cr * 0.2, cr);
        g.fillStyle(PUFF_COLOR, 0.9 * k).fillCircle(cx, cy, cr);
      }
    } else {
      const r = f.r * (1.6 - k * 0.8);
      const c = f.kind === 'gem' ? GEM_GLINT : ITEM_GLINT;
      g.lineStyle(2, c, k).strokeCircle(f.x, f.y, r);
    }
  }
  // Once the run is over the world stops: swings and bolts frozen mid-air would only look stuck.
  if (world.state === 'won' || world.state === 'lost') return;
  for (const s of world.slashes.active) {
    const t = 1 - s.ttl / config.effects.slashTtl;
    drawSwing(
      g,
      ground,
      p.x,
      p.y,
      s.range,
      s.angle - s.arc / 2,
      s.angle + s.arc / 2,
      t,
      SWING_STYLE[s.weapon] ?? SWING_PLAIN,
    );
  }
  for (const b of world.bolts.active) drawBolt(ground, top, b, 1 - b.ttl / config.effects.boltTtl);
}

/** A cheap hash of a point in [0, 1): the same bolt keeps the same zigzag, and every bolt gets its own. */
const hash = (x: number, y: number, k: number): number => {
  const v = Math.sin(x * 12.9898 + y * 78.233 + k * 37.719) * 43758.5453;
  return v - Math.floor(v);
};

/**
 * Something falling from the sky (`u` 0 -> 1 over its life). The damage area is marked on the ground (`g`), never
 * as a disc over the enemies. Lightning: a zigzag of its own (outline, Lyra's purple, white core) and a scorch
 * mark; Tempestade adds branches and a cloud shadow. Fire: a fireball dropping, then a flower of flame petals out to
 * the exact radius; Espada de Fogo plants a burning sword in the middle.
 */
function drawBolt(
  g: Phaser.GameObjects.Graphics,
  top: Phaser.GameObjects.Graphics,
  b: Bolt,
  u: number,
): void {
  const st = BOLT_STYLE[b.weapon] ?? BOLT_PLAIN;
  const fade = 1 - u;
  const r = b.radius;
  if (st.fire) {
    if (u < FALL) {
      // The fall: a fireball (or the sword, point first) coming down from up and to the left.
      const fk = u / FALL;
      const x = b.x - 50 * (1 - fk);
      const y = b.y - 150 * (1 - fk);
      if (st.sword) drawSword(top, x, y - 24, Math.PI / 2 - 0.3 * (1 - fk), 16, FIRE_SWORD);
      else {
        top.fillStyle(st.color, 0.9).fillTriangle(x - 7, y - 3, x + 3, y - 7, x - 30, y - 70);
        top.fillStyle(st.color).fillCircle(x, y, 9);
        top.fillStyle(st.core).fillCircle(x - 1, y - 1, 6);
        top.fillStyle(0xffffff).fillCircle(x - 2, y - 2, 3);
      }
      return;
    }
    const bk = (u - FALL) / (1 - FALL); // 0 -> 1 over the burst
    const grow = 1 - (1 - bk) * (1 - bk);
    g.fillStyle(st.color, 0.2 * fade).fillCircle(b.x, b.y, r);
    // Flame petals opening out to the edge.
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = (i * Math.PI * 2) / n + b.x * 0.05;
      const d = r * (0.3 + 0.4 * grow);
      const pr = r * 0.32 * (0.6 + 0.4 * grow);
      g.fillStyle(i % 2 ? st.color : FLAME_COLOR, 0.55 * fade).fillCircle(
        b.x + Math.cos(a) * d,
        b.y + Math.sin(a) * d,
        pr,
      );
    }
    g.fillStyle(st.core, 0.6 * fade).fillCircle(b.x, b.y, r * 0.35 * (1 - 0.5 * bk));
    g.lineStyle(2, 0xfff0c0, 0.8 * fade).strokeCircle(b.x, b.y, r);
    // A ring of light smoke rolling just past the edge.
    g.lineStyle(4 * fade + 1, 0xf0e8d8, 0.3 * fade).strokeCircle(b.x, b.y, r * (1 + 0.2 * bk));
    if (st.sword) drawSword(top, b.x, b.y - 24, Math.PI / 2, 16, FIRE_SWORD);
    return;
  }
  // Lightning: the scorch and the cloud shadow on the ground, then the bolt and its flash on top.
  if (st.branches) g.fillStyle(INK, 0.18 * fade).fillEllipse(b.x + 10, b.y - 4, r * 2.6, r * 1.1);
  g.fillStyle(0x1a1424, 0.3 * fade).fillCircle(b.x, b.y, r);
  g.lineStyle(2, st.color, 0.9 * fade).strokeCircle(b.x, b.y, r);
  const x1 = b.x + (hash(b.x, b.y, 1) - 0.5) * 30;
  const x2 = b.x + (hash(b.x, b.y, 2) - 0.5) * 34;
  const x3 = b.x + (hash(b.x, b.y, 3) - 0.5) * 22;
  for (let i = 0; i < BOLT_LAYERS.length; i++) {
    const L = BOLT_LAYERS[i] as readonly [number, number, number];
    top.lineStyle(st.width * L[0], L[1] === -1 ? st.color : L[1], L[2] * fade);
    top.lineBetween(b.x + 10, b.y - 270, x1, b.y - 180);
    top.lineBetween(x1, b.y - 180, x2, b.y - 95);
    top.lineBetween(x2, b.y - 95, x3, b.y - 40);
    top.lineBetween(x3, b.y - 40, b.x, b.y);
    for (let k = 0; k < st.branches; k++) {
      // Tempestade: forks off the main bolt.
      const fx = k ? x2 : x1;
      const fy = k ? b.y - 95 : b.y - 180;
      const side = hash(b.x, b.y, 5 + k) > 0.5 ? 1 : -1;
      top.lineBetween(fx, fy, fx + side * 28, fy + 38);
      top.lineBetween(fx + side * 28, fy + 38, fx + side * 34, fy + 70);
    }
  }
  if (u < 0.25) {
    // The flash where it lands: small, white, quick.
    const fk = u / 0.25;
    top.fillStyle(0xffffff, 0.9 * (1 - fk)).fillCircle(b.x, b.y, 6 + r * 0.5 * fk);
  }
}

/**
 * A swing that sweeps from `a0` to `a1` around (cx, cy): a crescent band trailing behind a bright edge, so the
 * direction reads in a single frame. `t` goes 0 -> 1 over the swing's life. Heavy swings leave a mark on the
 * ground (`under`): a shock ring opening out along the arc, or cracks at its ends.
 */
function drawSwing(
  g: Phaser.GameObjects.Graphics,
  under: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  range: number,
  a0: number,
  a1: number,
  t: number,
  st: SwingStyle,
): void {
  const span = a1 - a0;
  const sk = Math.min(1, t / SWEEP);
  const lead = a0 + span * (1 - (1 - sk) * (1 - sk));
  const tail = Math.max(a0, lead - span * 0.7, a0 + span * Math.max(0, (t - SWEEP) / (1 - SWEEP)));
  const fade = t < SWEEP ? 1 : 1 - (t - SWEEP) / (1 - SWEEP);
  const inner = range * st.band;
  const mid = (range + inner) / 2;
  if (lead > tail + 0.01) {
    // The trail: a soft wide band, then a brighter one close behind the edge.
    g.fillStyle(st.fill, st.fillAlpha * fade);
    band(g, cx, cy, inner, range, tail, lead);
    g.fillStyle(st.edge, 0.3 * fade);
    band(g, cx, cy, mid, range, lead - (lead - tail) * 0.35, lead);
    g.lineStyle(3, 0xffffff, 0.95 * fade)
      .beginPath()
      .arc(cx, cy, range, tail, lead)
      .strokePath();
    g.lineStyle(2.5, st.edge, 0.9 * fade)
      .beginPath()
      .arc(cx, cy, range + 2.5, tail, lead)
      .strokePath();
  }
  if (t < SWEEP) {
    // The blade itself, leading the sweep.
    const ux = Math.cos(lead);
    const uy = Math.sin(lead);
    g.lineStyle(5, st.edge, 0.8).lineBetween(
      cx + ux * inner,
      cy + uy * inner,
      cx + ux * (range + 2),
      cy + uy * (range + 2),
    );
    g.lineStyle(2.5, 0xffffff, 1).lineBetween(
      cx + ux * inner,
      cy + uy * inner,
      cx + ux * range,
      cy + uy * range,
    );
  }
  if (st.mark === 'none' || t < SWEEP * 0.8) return;
  const mk = (t - SWEEP * 0.8) / (1 - SWEEP * 0.8);
  // A shock ring opening out along the arc: "it shoves".
  under
    .lineStyle(5 * (1 - mk) + 1, 0xf0e8d8, 0.55 * (1 - mk))
    .beginPath()
    .arc(cx, cy, range * (0.95 + 0.25 * mk), a0, a1)
    .strokePath();
  if (st.mark !== 'crack') return;
  // Cracks in the ground at both ends of the swing.
  under.lineStyle(2.5, 0x3a2a24, 0.7 * (1 - mk * mk));
  for (let e = 0; e < 2; e++) {
    const a = e ? a1 : a0;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    let x = cx + ux * range * 0.75;
    let y = cy + uy * range * 0.75;
    for (let i = 1; i <= 3; i++) {
      const side = (i % 2 ? 1 : -1) * 6;
      const nx = cx + ux * range * (0.75 + i * 0.12) - uy * side;
      const ny = cy + uy * range * (0.75 + i * 0.12) + ux * side;
      under.lineBetween(x, y, nx, ny);
      x = nx;
      y = ny;
    }
  }
}

/** Fills the ring sector between radii `r0` and `r1`, angles `a0` to `a1` (current fill style). */
function band(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  r0: number,
  r1: number,
  a0: number,
  a1: number,
): void {
  g.beginPath();
  g.arc(cx, cy, r1, a0, a1);
  g.arc(cx, cy, r0, a1, a0, true);
  g.closePath();
  g.fillPath();
}

/** Soft-light layers of an aura's core: [radius factor, alpha]. Preallocated. */
const AURA_CORE: readonly [number, number][] = [
  [1, 0.05],
  [0.6, 0.1],
  [0.35, 0.18],
];

/**
 * Aura de Yah: warm light around the hero that beats with its damage. `k` is the tick phase (0 right at a tick,
 * 1 just before the next): each tick a wave runs out to exactly the damage radius and the rim lights up. Motes of
 * light drift up inside. Chama de Yah: a white-hot core, round flame tongues on the rim and rising embers, over a
 * very faint disc (its 150 px would cover the crowd).
 */
function drawAura(
  g: Phaser.GameObjects.Graphics,
  top: Phaser.GameObjects.Graphics,
  world: World,
  r: number,
  k: number,
  level: number,
  elo: boolean,
): void {
  const p = world.player;
  const t = world.time;
  const c = elo ? FLAME_COLOR : AURA_COLOR;
  if (elo) g.fillStyle(c, 0.06).fillCircle(p.x, p.y, r);
  for (let i = elo ? 1 : 0; i < AURA_CORE.length; i++) {
    const L = AURA_CORE[i] as readonly [number, number];
    g.fillStyle(elo && i === 2 ? 0xfff0c0 : c, L[1]).fillCircle(p.x, p.y, r * L[0]);
  }
  // The rim flares on the tick and rests between ticks.
  const flare = Math.max(0, 1 - k * 3);
  g.lineStyle(2 + 2 * flare, c, 0.35 + 0.55 * flare).strokeCircle(p.x, p.y, r);
  // The beat: a wave from the core out to the exact edge (over the crowd, thin, so it is seen but hides nothing).
  if (k < 0.45) {
    const wk = k / 0.45;
    const wr = r * (0.3 + 0.7 * (1 - (1 - wk) ** 2));
    top.lineStyle(4 - 3 * wk, elo ? 0xffc060 : 0xfff0a0, 0.7 * (1 - wk)).strokeCircle(p.x, p.y, wr);
  }
  // Motes of light (embers for the Chama) drifting up inside the radius, more with each level.
  const motes = elo ? 10 : 4 + Math.ceil(level / 2);
  for (let i = 0; i < motes; i++) {
    const ph = (t * (elo ? 0.9 : 0.5) + i * 0.37) % 1;
    const a = i * 2.4 + Math.floor(t * (elo ? 0.9 : 0.5) + i * 0.37) * 1.3;
    const d = r * (0.2 + 0.7 * ((i * 0.618) % 1));
    const mx = p.x + Math.cos(a) * d;
    const my = p.y + Math.sin(a) * d - ph * (elo ? 30 : 18);
    const ma = Math.sin(ph * Math.PI);
    top
      .fillStyle(elo ? (i % 2 ? FLAME_COLOR : 0xffd060) : 0xfff0a0, 0.75 * ma)
      .fillCircle(mx, my, elo ? 2 : 2.2);
    if (!elo) top.fillStyle(0xffffff, 0.8 * ma).fillCircle(mx, my, 1);
  }
  if (!elo) return;
  // Round flame tongues licking up from the rim (they rise in screen space, like real flames), taller on a tick.
  const n = 16;
  for (let i = 0; i < n; i++) {
    const a = (i * Math.PI * 2) / n + t * 0.4;
    const bx = p.x + Math.cos(a) * r;
    const by = p.y + Math.sin(a) * r;
    const h = 9 + 5 * Math.sin(t * 9 + i * 1.7) + 6 * flare;
    const w = 5;
    g.fillStyle(i % 2 ? AURA_COLOR : FLAME_COLOR, 0.55);
    g.fillCircle(bx, by, w);
    g.fillTriangle(bx - w, by, bx + w, by, bx + Math.sin(t * 5 + i) * 2, by - h - w);
    g.fillStyle(0xfff0c0, 0.5).fillCircle(bx, by + 1, w * 0.45);
  }
}

/** Chest, Badalada and Sopro de Geada: shapes that say what happened, instead of a full-screen flash. */
function drawMoments(
  g: Phaser.GameObjects.Graphics,
  top: Phaser.GameObjects.Graphics,
  world: World,
  m: Moments,
  hero: number,
): void {
  const p = world.player;
  const t = world.time;
  // Half the view's diagonal: a ring this big has reached every edge of the screen.
  const edge = Math.hypot(world.view.w, world.view.h) / 2;
  const chest = t - m.chest;
  if (chest < CHEST_SHOW) {
    // Rays of light turning behind the hero (two crossed sets for an Elo), a ring in the hero's color and,
    // for an Elo, stars flying out.
    const k = chest / CHEST_SHOW;
    const fade = Math.min(1, chest * 8) * (1 - k);
    const sets = m.elo ? 2 : 1;
    for (let s = 0; s < sets; s++) {
      const n = 6;
      const len = (m.elo ? 120 : 95) * (0.6 + 0.4 * Math.min(1, chest * 3));
      const spin = (s ? -0.9 : 1.2) * t + s * 0.5;
      const half = 0.13;
      g.fillStyle(s ? hero : ITEM_GLINT, 0.22 * fade);
      for (let i = 0; i < n; i++) {
        const a = spin + (i * Math.PI * 2) / n;
        g.fillTriangle(
          p.x,
          p.y,
          p.x + Math.cos(a - half) * len,
          p.y + Math.sin(a - half) * len,
          p.x + Math.cos(a + half) * len,
          p.y + Math.sin(a + half) * len,
        );
      }
    }
    g.fillStyle(0xffffff, 0.25 * fade).fillCircle(p.x, p.y, 26);
    const rk = Math.min(1, chest / 0.5);
    if (rk < 1) {
      top.lineStyle(5 * (1 - rk) + 1, hero, 1 - rk).strokeCircle(p.x, p.y, 18 + 80 * (1 - (1 - rk) ** 3));
      top.lineStyle(2, 0xffffff, 0.8 * (1 - rk)).strokeCircle(p.x, p.y, 14 + 70 * (1 - (1 - rk) ** 3));
    }
    if (m.elo && chest < 0.8) {
      const sk = chest / 0.8;
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 + 0.4;
        const d = 20 + 90 * (1 - (1 - sk) ** 2);
        star(
          top,
          p.x + Math.cos(a) * d,
          p.y + Math.sin(a) * d,
          7 * (1 - sk) + 2,
          i % 2 ? hero : 0xffffff,
          1 - sk,
        );
      }
    }
  }
  const bomb = t - m.bomb;
  if (bomb < 0.45) {
    // Badalada: a golden ring of sound from the hero to the edges of the screen (it hits everything on it).
    for (let i = 0; i < 2; i++) {
      const bk = Math.min(1, Math.max(0, (bomb - i * 0.07) / 0.32));
      if (bk <= 0) continue;
      const r = 20 + (edge - 20) * (1 - (1 - bk) ** 2);
      const a = bomb < 0.32 ? 1 : 1 - (bomb - 0.32) / 0.13;
      top.lineStyle(i ? 3 : 7, i ? 0xffffff : ITEM_GLINT, (i ? 0.6 : 0.85) * a).strokeCircle(p.x, p.y, r);
      if (!i) g.lineStyle(26, ITEM_GLINT, 0.12 * a).strokeCircle(p.x, p.y, r - 10);
    }
  }
  const frost = t - m.frost;
  if (frost < 0.5) {
    // Sopro de Geada: a wave of frost rolling out to the edges, with ice shards riding on it.
    const fk = Math.min(1, frost / 0.4);
    const r = 20 + (edge - 20) * (1 - (1 - fk) ** 2);
    const a = frost < 0.4 ? 1 : 1 - (frost - 0.4) / 0.1;
    g.lineStyle(30, ICE, 0.18 * a).strokeCircle(p.x, p.y, r - 14);
    top.lineStyle(4, 0xffffff, 0.85 * a).strokeCircle(p.x, p.y, r);
    for (let i = 0; i < 12; i++) {
      const sa = (i * Math.PI) / 6 + 0.2;
      shard(top, p.x + Math.cos(sa) * r, p.y + Math.sin(sa) * r, sa, 7, a);
    }
  }
  if (world.freeze > 0) {
    // Frost creeping on the edges of the screen while the world is frozen (blinking out in the last second).
    const fa = world.freeze < 1 ? 0.5 + 0.5 * Math.sin(t * 20) : 1;
    const vw = world.view.w / 2;
    const vh = world.view.h / 2;
    const th = 10;
    top.fillStyle(ICE, 0.22 * fa);
    top.fillRect(p.x - vw, p.y - vh, vw * 2, th).fillRect(p.x - vw, p.y + vh - th, vw * 2, th);
    top
      .fillRect(p.x - vw, p.y - vh + th, th, vh * 2 - th * 2)
      .fillRect(p.x + vw - th, p.y - vh + th, th, vh * 2 - th * 2);
    // Icicles along the top edge.
    top.fillStyle(0xffffff, 0.35 * fa);
    for (let x = -vw + 12; x < vw; x += 28) {
      const h = 8 + ((((x * 7919) % 9) + 9) % 9);
      top.fillTriangle(p.x + x - 5, p.y - vh + th, p.x + x + 5, p.y - vh + th, p.x + x, p.y - vh + th + h);
    }
  }
}

/** An ice shard: a small white-lilac diamond pointing along `a`. */
function shard(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  a: number,
  r: number,
  alpha: number,
): void {
  const ux = Math.cos(a) * r;
  const uy = Math.sin(a) * r;
  const vx = -uy * 0.35;
  const vy = ux * 0.35;
  g.fillStyle(ICE, alpha).fillTriangle(x - ux, y - uy, x + vx, y + vy, x + ux, y + uy);
  g.fillStyle(0xffffff, alpha).fillTriangle(x - ux, y - uy, x - vx, y - vy, x + ux, y + uy);
}

/** The telegraph of a boss ability: where it will hit, filling up during the windup. */
function drawBossWarning(
  g: Phaser.GameObjects.Graphics,
  top: Phaser.GameObjects.Graphics,
  e: Enemy,
  time: number,
): void {
  const ab = e.def.ability;
  if (!ab || e.act === BossAct.Idle) return;
  const aim = Math.atan2(e.aimY, e.aimX);
  if (e.act === BossAct.Active) {
    // The cleave landing: the same sweep as the hero's blades, in the danger colors.
    if (ab.kind === 'cleave') {
      const half = (ab.arc ?? 1) / 2;
      const t = 1 - Math.max(0, e.actT) / CLEAVE_SHOW;
      drawSwing(top, g, e.x, e.y, ab.range, aim - half, aim + half, t, CLEAVE_STYLE);
    }
    return;
  }
  const k = 1 - Math.max(0, e.actT) / ab.windup; // 0 -> 1 as the hit comes
  const fill = 0.1 + 0.16 * k;
  // The dashes march along the edge, faster as the hit comes.
  const march = (time * (30 + 50 * k)) % (DASH * 2);
  const edgeA = 0.6 + 0.4 * k;
  switch (ab.kind) {
    case 'cleave': {
      const half = (ab.arc ?? 1) / 2;
      const a0 = aim - half;
      const a1 = aim + half;
      g.fillStyle(WARN_COLOR, fill).slice(e.x, e.y, ab.range, a0, a1, false).fillPath();
      // Stripes: bands rolling out toward the edge.
      g.lineStyle(5, WARN_COLOR, 0.3);
      for (let i = 0; i < 4; i++) {
        const r = ab.range * (((i + time * 1.5) % 4) / 4);
        if (r > 8) g.beginPath().arc(e.x, e.y, r, a0, a1).strokePath();
      }
      // An inner slice grows to the edge: when it touches, the sword falls.
      g.fillStyle(WARN_COLOR, 0.32)
        .slice(e.x, e.y, ab.range * k, a0, a1, false)
        .fillPath();
      g.lineStyle(2.5, WARN_EDGE, edgeA);
      dashedArc(g, e.x, e.y, ab.range, a0, a1, march);
      dashedLine(g, e.x, e.y, e.x + Math.cos(a0) * ab.range, e.y + Math.sin(a0) * ab.range, march);
      dashedLine(g, e.x, e.y, e.x + Math.cos(a1) * ab.range, e.y + Math.sin(a1) * ab.range, march);
      break;
    }
    case 'lunge': {
      const w = e.def.radius * 2;
      const len = ab.range + e.def.radius;
      const ux = e.aimX;
      const uy = e.aimY;
      const vx = (-uy * w) / 2;
      const vy = (ux * w) / 2;
      const ex = e.x + ux * len;
      const ey = e.y + uy * len;
      g.fillStyle(WARN_COLOR, fill);
      g.beginPath();
      g.moveTo(e.x + vx, e.y + vy);
      g.lineTo(ex + vx, ey + vy);
      g.lineTo(ex - vx, ey - vy);
      g.lineTo(e.x - vx, e.y - vy);
      g.closePath();
      g.fillPath();
      // Stripes as chevrons pointing the way it will run, rolling forward.
      g.lineStyle(5, WARN_COLOR, 0.35);
      const step = w * 0.9;
      const n = Math.floor(len / step);
      const roll = ((time * 2) % 1) * step;
      for (let i = 0; i < n; i++) {
        const d = i * step + roll + w * 0.4;
        if (d > len - w * 0.2) continue;
        const cx = e.x + ux * d;
        const cy = e.y + uy * d;
        const bx = cx - ux * w * 0.35;
        const by = cy - uy * w * 0.35;
        g.lineBetween(bx + vx * 0.7, by + vy * 0.7, cx, cy);
        g.lineBetween(bx - vx * 0.7, by - vy * 0.7, cx, cy);
      }
      g.lineStyle(2.5, WARN_EDGE, edgeA);
      dashedLine(g, e.x + vx, e.y + vy, ex + vx, ey + vy, march);
      dashedLine(g, e.x - vx, e.y - vy, ex - vx, ey - vy, march);
      dashedLine(g, ex + vx, ey + vy, ex - vx, ey - vy, march);
      g.fillStyle(WARN_COLOR, 0.45).fillCircle(e.x + ux * len * k, e.y + uy * len * k, w * 0.35);
      break;
    }
    case 'toll': {
      // Rings ripple out from the bell; small marks show where the dead will rise.
      const r = ab.range * (0.4 + 0.6 * k);
      g.fillStyle(WARN_COLOR, fill * 0.6).fillCircle(e.x, e.y, r);
      g.lineStyle(2.5, WARN_EDGE, edgeA);
      dashedArc(g, e.x, e.y, r, 0, Math.PI * 2, march);
      const n = ab.count ?? 6;
      for (let i = 0; i < n; i++) {
        const a = (i * Math.PI * 2) / n;
        const mx = e.x + Math.cos(a) * ab.range;
        const my = e.y + Math.sin(a) * ab.range;
        const mr = 6 + 6 * k;
        g.fillStyle(WARN_COLOR, 0.25 + 0.3 * k).fillCircle(mx, my, mr);
        g.lineStyle(2, WARN_EDGE, edgeA).strokeCircle(mx, my, mr);
      }
      break;
    }
  }
}

/** A dashed arc (current line style), its dashes shifted `offset` px along it. */
function dashedArc(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  r: number,
  a0: number,
  a1: number,
  offset: number,
): void {
  const da = DASH / r;
  for (let a = a0 + offset / r - 2 * da; a < a1; a += 2 * da) {
    const s = Math.max(a0, a);
    const t = Math.min(a1, a + da);
    if (t > s) g.beginPath().arc(x, y, r, s, t).strokePath();
  }
}

/** A dashed line (current line style), its dashes shifted `offset` px along it. */
function dashedLine(
  g: Phaser.GameObjects.Graphics,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  offset: number,
): void {
  const len = Math.hypot(x1 - x0, y1 - y0);
  if (len < 1) return;
  const ux = (x1 - x0) / len;
  const uy = (y1 - y0) / len;
  for (let d = offset - 2 * DASH; d < len; d += 2 * DASH) {
    const s = Math.max(0, d);
    const t = Math.min(len, d + DASH);
    if (t > s) g.lineBetween(x0 + ux * s, y0 + uy * s, x0 + ux * t, y0 + uy * t);
  }
}

/** A cartoon sword centred on (x, y), its tip toward angle `a`, about 2.6 x `r` long. */
function drawSword(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  a: number,
  r: number,
  st: OrbitStyle,
): void {
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  const vx = -uy;
  const vy = ux;
  const bx = x - ux * r * 0.5;
  const by = y - uy * r * 0.5;
  const hw = r * 0.3;
  // Grip, then the blade, then the guard on top, all with the ink outline.
  g.lineStyle(r * 0.5, INK).lineBetween(bx, by, bx - ux * r * 0.7, by - uy * r * 0.7);
  g.lineStyle(r * 0.25, 0x6a3a1a).lineBetween(bx, by, bx - ux * r * 0.6, by - uy * r * 0.6);
  g.fillStyle(st.color).lineStyle(2, INK);
  g.beginPath();
  g.moveTo(x + ux * r * 1.5, y + uy * r * 1.5);
  g.lineTo(bx + vx * hw, by + vy * hw);
  g.lineTo(bx - vx * hw, by - vy * hw);
  g.closePath();
  g.fillPath();
  g.strokePath();
  g.lineStyle(1.5, 0xffffff, 0.7).lineBetween(bx + vx * hw * 0.3, by + vy * hw * 0.3, x + ux * r, y + uy * r);
  const gw = r * 0.7;
  const gt = r * 0.14;
  g.fillStyle(st.dark).lineStyle(2, INK);
  g.beginPath();
  g.moveTo(bx + vx * gw + ux * gt, by + vy * gw + uy * gt);
  g.lineTo(bx - vx * gw + ux * gt, by - vy * gw + uy * gt);
  g.lineTo(bx - vx * gw - ux * gt, by - vy * gw - uy * gt);
  g.lineTo(bx + vx * gw - ux * gt, by + vy * gw - uy * gt);
  g.closePath();
  g.fillPath();
  g.strokePath();
}

/** A hanging bronze bell of hit radius `r`: dome, flared rim, clapper and a shine. */
function drawBell(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, st: OrbitStyle): void {
  const top = y - r * 0.3;
  const rim = y + r * 0.6;
  g.fillStyle(st.color).lineStyle(2.5, INK);
  g.beginPath();
  g.arc(x, top, r * 0.5, Math.PI, 0);
  g.lineTo(x + r * 0.8, rim);
  g.lineTo(x - r * 0.8, rim);
  g.closePath();
  g.fillPath();
  g.strokePath();
  g.fillStyle(st.dark)
    .fillEllipse(x, rim, r * 1.7, r * 0.4)
    .strokeEllipse(x, rim, r * 1.7, r * 0.4);
  g.fillStyle(INK).fillCircle(x, rim + r * 0.25, r * 0.18);
  g.fillStyle(st.dark).fillRect(x - r * 0.12, top - r * 0.75, r * 0.24, r * 0.3);
  g.fillStyle(0xffffff, 0.35).fillEllipse(x - r * 0.25, top, r * 0.25, r * 0.45);
}
