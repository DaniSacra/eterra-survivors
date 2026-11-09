import type Phaser from 'phaser';
import type { World } from '../core/world';
import {
  WEAPONS,
  type AuraLevel,
  type OrbitLevel,
  type SlamLevel,
  type WeaponDef,
  type WeaponId,
} from '../data/weapons';
import { bladeRadius, isElo, orbitAngle, weaponStats } from '../core/weapons';
import { wardReady } from '../core/elos';
import { config } from '../data/config';
import { BossAct, CLEAVE_SHOW } from '../core/bosses';
import { CHARGE } from '../core/behaviours';
import type { Enemy } from '../core/enemies';
import type { Bolt, Slash } from '../core/effects';
import type { Projectile } from '../core/projectiles';
import type { Zone } from '../core/zones';
import { INK } from './art/pen';
import { ELEMENT_COLOR, UI } from './ui';
import { star } from './sparks';
import { arcLine, band, disc, ring } from './shapes';
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
  fury: { fill: 0xffe4dc, edge: ELEMENT_COLOR.fury, band: 0.62, fillAlpha: 0.45, mark: 'none' },
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
const FLAME_COLOR = ELEMENT_COLOR.holy;
/** Espada de Fogo's burning ground: the flames' light orange. */
const EMBER = 0xffb040;
/** How each orbit weapon's pieces look: cartoon swords pointing the way they spin, or round shields. */
interface OrbitStyle {
  color: number;
  dark: number;
  blade: boolean;
}
const ORBIT_STYLE: Partial<Record<WeaponId, OrbitStyle>> = {
  shields: { color: 0x8aa8c8, dark: 0x8a5a24, blade: false },
  valmorWall: { color: ELEMENT_COLOR.steel, dark: 0x5a6478, blade: false },
  vigil: { color: 0xfff6e0, dark: ELEMENT_COLOR.holy, blade: true },
};
const SWORDS: OrbitStyle = { color: 0xcbd8ec, dark: 0x9a6232, blade: true };
/** Frost patches in the ice family (white-lilac), never the gems' cyan; Nevasca keeps a strong blue edge. */
const FROST_COLOR = 0xd8d2f0;
const BLIZZARD_COLOR = ELEMENT_COLOR.ice;
const BLIZZARD_EDGE = 0x4a8ad8;
/** How long a frost patch takes to land (ring opening, shards flying), and to break up at the end, seconds. */
const ZONE_LAND = 0.15;
const ZONE_BREAK = 0.4;
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
  /** Not from the sky: an orb bursting where it struck (Cajado de Lyra). */
  burst?: boolean;
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
  storm: { color: ELEMENT_COLOR.storm, core: 0xffffff, width: 7, fire: false, sword: false, branches: 2 },
  fire: { color: 0xffa83a, core: 0xffe070, width: 5, fire: true, sword: false, branches: 0 },
  fireSword: { color: ELEMENT_COLOR.fire, core: 0xfff0a0, width: 7, fire: true, sword: true, branches: 0 },
  staff: { color: 0xb070f0, core: 0xf4e8ff, width: 3, fire: false, sword: false, branches: 0, burst: true },
  /** Nevasca's shatter: an enemy bursting into ice. */
  blizzard: {
    color: ELEMENT_COLOR.ice,
    core: 0xffffff,
    width: 3,
    fire: false,
    sword: false,
    branches: 0,
    burst: true,
  },
  lyraStar: {
    color: ELEMENT_COLOR.arcane,
    core: 0xfff6c0,
    width: 4,
    fire: false,
    sword: false,
    branches: 0,
    burst: true,
  },
};
/** Slam fissures: the crack's dark, the dust thrown along it, and the Elo's glow inside the crack. */
const CRACK = 0x2a1e1a;
const DUST_LIGHT = 0xe8dcc8;
const CRACK_GLOW: Partial<Record<WeaponId, number>> = { jointBreaker: ELEMENT_COLOR.earth };
/** Reused corners of a fissure's strip (no allocation per frame). */
const QUAD = [
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
  { x: 0, y: 0 },
];
function setCorner(i: number, x: number, y: number): void {
  const c = QUAD[i] as { x: number; y: number };
  c.x = x;
  c.y = y;
}
/** The burning sword of Espada de Fogo, drawn with the orbit swords' shape. */
const FIRE_SWORD: OrbitStyle = { color: 0xffd890, dark: 0xff6a20, blade: true };
/** Part of a strike's life spent falling, before the burst on the ground. */
const FALL = 0.25;
const PUFF_COLOR = 0xf4f6fb;
const PUFF_SHADE = 0xb8c0d8;
/** Death puffs this big are bosses (radius 30 and up; elites are 18 to 26). */
export const BOSS_PUFF = 30;
export const ELITE_PUFF = 18;
const GEM_GLINT = UI.xp;
const ITEM_GLINT = 0xffd870;
/**
 * Tints of enemies: hit (a white fill), frozen by Sopro de Geada, slowed by frost (white-lilac frost on top, never
 * the gems' cyan). And the hero's hurt wash.
 */
export const TINT = {
  hit: 0xffffff,
  frozen: 0xd0cae8,
  /** Top of a frozen enemy (the frost on it): the bottom gets `frozen`. */
  frost: 0xf4f6ff,
  slowed: 0xe2def2,
  /** Bleeding (Leque de Facas): the shadow element's emerald; burning (Espada de Fogo): ember orange. */
  bleed: 0x8ef0b4,
  burn: 0xffa070,
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
  drawCharges(g, world);
  if (world.boss) drawBossWarning(g, top, world.boss, world.time);
  for (const z of world.zones.active) drawZone(g, z, world.time);
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
    } else if (kind === 'slam' && w.combo > 0) {
      // Where the tremor will burst: a ring tightening on the impact point while it waits.
      const s = weaponStats(w) as SlamLevel;
      const r = s.tremorRadius * p.stats.area;
      const k = 1 - w.combo / ((WEAPONS[w.id] as WeaponDef).combo ?? 1);
      g.lineStyle(2, DUST_LIGHT, 0.25 + 0.45 * k);
      ring(g, w.comboX, w.comboY, r * (1.15 - 0.15 * k));
      g.fillStyle(CRACK, 0.12 + 0.18 * k);
      disc(g, w.comboX, w.comboY, r * 0.3 * k);
    } else if (kind === 'orbit') {
      const s = weaponStats(w) as OrbitLevel;
      const count = s.count + p.stats.amount;
      const orbitR = s.orbitRadius * p.stats.area;
      const r = s.radius * p.stats.area;
      const style = ORBIT_STYLE[w.id] ?? SWORDS;
      const elo = isElo(w.id);
      if (elo) {
        // The guarded circle (Vigília: a gold ring with the four paladins' marks turning on it).
        top.lineStyle(2, style.dark, style.blade ? 0.6 : 0.35);
        ring(top, p.x, p.y, orbitR);
        if (style.blade)
          for (let i = 0; i < 4; i++) {
            const a = world.time * 0.5 + (i * Math.PI) / 2;
            const mx = p.x + Math.cos(a) * orbitR;
            const my = p.y + Math.sin(a) * orbitR;
            top.fillStyle(style.dark, 0.9).fillTriangle(mx - 4, my, mx, my - 6, mx + 4, my);
            top.fillTriangle(mx - 4, my, mx, my + 6, mx + 4, my);
          }
      }
      // Swords leave a trail along their circle, so the turn reads even in a still frame.
      const trail = elo ? 1 : 0.6;
      const dir = s.spin >= 0 ? 1 : -1;
      for (let i = 0; i < count; i++) {
        const a = orbitAngle(world.time, s.spin, i, count);
        // Vigília's swords dart out toward the nearest enemy and back.
        const br = bladeRadius(w, a, orbitR);
        const x = p.x + Math.cos(a) * br;
        const y = p.y + Math.sin(a) * br;
        if (br > orbitR + 1) {
          top.lineStyle(r * 0.9, ITEM_GLINT, 0.35);
          top.lineBetween(p.x + Math.cos(a) * orbitR, p.y + Math.sin(a) * orbitR, x, y);
        }
        if (style.blade) {
          const tc = elo ? ITEM_GLINT : style.color;
          top.fillStyle(tc, 0.16);
          band(
            top,
            p.x,
            p.y,
            orbitR - r * 0.6,
            orbitR + r * 0.6,
            dir > 0 ? a - trail : a,
            dir > 0 ? a : a + trail,
          );
          top.fillStyle(tc, 0.28);
          band(
            top,
            p.x,
            p.y,
            orbitR - r * 0.4,
            orbitR + r * 0.4,
            dir > 0 ? a - trail * 0.4 : a,
            dir > 0 ? a : a + trail * 0.4,
          );
          // Vigília: a white-gold glow exactly the size of the hit.
          if (elo) {
            top.fillStyle(0xfff6d0, 0.3);
            disc(top, x, y, r);
            top.lineStyle(1.5, ITEM_GLINT, 0.7);
            ring(top, x, y, r);
          }
          drawSword(top, x, y, a + (dir * Math.PI) / 2, r, style);
        } else drawShield(top, x, y, r, style);
      }
    }
  }
  // Muralha de Valmor's guard, while it is up: a steel ring of plates around the hero.
  if (wardReady(world)) {
    const wr = 30 + Math.sin(world.time * 3) * 1.5;
    top.lineStyle(3, INK, 0.5);
    ring(top, p.x, p.y, wr + 1);
    top.lineStyle(2, ELEMENT_COLOR.steel, 0.9);
    for (let i = 0; i < 6; i++) {
      const a = world.time * 0.8 + (i * Math.PI) / 3;
      arcLine(top, p.x, p.y, wr, a, a + Math.PI / 3 - 0.25);
    }
  }
  g = top;
  // Life under the hero's feet, so it can be read without looking at the corner.
  const hpK = Math.max(0, p.hp / p.stats.maxHp);
  g.fillStyle(INK, 0.8).fillRoundedRect(p.x - 17, p.y + 25, 34, 6, 3);
  // The HUD's life color; low (under 35%) it blinks in the danger coral.
  const low = hpK <= 0.35 && Math.sin(world.time * 12) > 0;
  g.fillStyle(low ? UI.dangerHex : UI.hp).fillRoundedRect(p.x - 16, p.y + 26, 32 * hpK, 4, 2);
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
  for (const pr of world.projectiles.active) {
    const tr = pr.source ? TRAIL[pr.source.id] : undefined;
    if (tr) drawTrail(g, pr, tr, world.time);
  }
  for (const f of world.puffs.active) {
    const k = f.ttl / config.effects.puffTtl; // 1 -> 0
    if (f.kind === 'death') {
      // A cartoon poof: a white pop, then three little clouds puffing out and shrinking. (Bosses get their
      // own send-off from the sparks.)
      if (f.r >= BOSS_PUFF) continue;
      const r = f.r;
      if (k > 0.7) {
        g.fillStyle(0xffffff, (k - 0.7) * 2);
        disc(g, f.x, f.y, r * (1.1 - k * 0.4));
      }
      const out = 1 - k;
      for (let i = 0; i < 3; i++) {
        const a = i * 2.1 + f.x * 0.37;
        const cx = f.x + Math.cos(a) * r * (0.2 + 0.8 * out);
        const cy = f.y + Math.sin(a) * r * (0.2 + 0.6 * out) - r * 0.4 * out;
        const cr = r * (0.5 - 0.15 * i) * (0.5 + k * 0.7);
        g.fillStyle(PUFF_SHADE, 0.75 * k);
        disc(g, cx + cr * 0.15, cy + cr * 0.2, cr);
        g.fillStyle(PUFF_COLOR, 0.9 * k);
        disc(g, cx, cy, cr);
      }
    } else {
      const r = f.r * (1.6 - k * 0.8);
      const c = f.kind === 'gem' ? GEM_GLINT : ITEM_GLINT;
      g.lineStyle(2, c, k);
      ring(g, f.x, f.y, r);
    }
  }
  // Once the run is over the world stops: swings and bolts frozen mid-air would only look stuck.
  if (world.state === 'won' || world.state === 'lost') return;
  for (const s of world.slashes.active) {
    if (s.form === 'fissure') {
      drawFissure(ground, top, s, 1 - s.ttl / config.effects.fissureTtl);
      continue;
    }
    if (s.form === 'pulse') {
      // Chama de Yah's wave: a ring of holy fire running out to its edge, leaving a glow behind.
      const k = 1 - s.ttl / config.effects.pulseTtl;
      const grow = 1 - (1 - k) * (1 - k);
      ground.fillStyle(ELEMENT_COLOR.holy, 0.18 * (1 - k));
      disc(ground, p.x, p.y, s.shock * grow);
      top.lineStyle(8 * (1 - k) + 2, ELEMENT_COLOR.holy, 0.85 * (1 - k));
      ring(top, p.x, p.y, s.shock * grow);
      top.lineStyle(2, 0xffffff, 0.9 * (1 - k));
      ring(top, p.x, p.y, s.shock * grow * 0.96);
      continue;
    }
    if (s.form === 'tremor') {
      // The impact's crater and ring, from the moment it bursts.
      const k = 1 - s.ttl / config.effects.tremorTtl;
      drawImpact(ground, s.x, s.y, s.shock, s.angle, SWEEP * 0.7 + k * (1 - SWEEP * 0.7));
      continue;
    }
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

/**
 * A projectile's trail (drawn under its sprite): a speed streak (`line`: wide color, then a thin bright core), or
 * a wavy row of fading lights (`dots`). `len` is seconds of flight it covers; `star` adds a twinkle at the head.
 */
interface Trail {
  color: number;
  core: number;
  width: number;
  len: number;
  dots: boolean;
  star: boolean;
}
const TRAIL: Partial<Record<WeaponId, Trail>> = {
  elunLight: { color: 0xb8e070, core: 0xfff6c0, width: 5, len: 0.06, dots: false, star: false },
  holyLight: { color: ELEMENT_COLOR.holy, core: 0xffffff, width: 6, len: 0.07, dots: false, star: true },
  daggers: { color: HERO_COLOR.andilla, core: 0xffffff, width: 3, len: 0.05, dots: false, star: false },
  fan: { color: ELEMENT_COLOR.shadow, core: 0xe0ffe8, width: 3, len: 0.05, dots: false, star: false },
  hammer: { color: 0xcbd8ec, core: 0xffffff, width: 10, len: 0.12, dots: false, star: false },
  forgeFury: { color: ELEMENT_COLOR.forge, core: 0xfff0a0, width: 12, len: 0.14, dots: false, star: false },
  wisps: { color: 0x40e0d8, core: 0xe8ffff, width: 4, len: 0.12, dots: true, star: false },
  soulProcession: { color: ELEMENT_COLOR.soul, core: 0xffffff, width: 5, len: 0.2, dots: true, star: false },
};

function drawTrail(g: Phaser.GameObjects.Graphics, pr: Projectile, tr: Trail, time: number): void {
  const len = pr.speed * tr.len;
  const ux = Math.cos(pr.angle);
  const uy = Math.sin(pr.angle);
  if (tr.dots) {
    for (let i = 1; i <= 3; i++) {
      const d = (len * i) / 3;
      const wob = Math.sin(time * 8 + i * 1.3 + pr.poolIndex) * 3;
      const x = pr.x - ux * d - uy * wob;
      const y = pr.y - uy * d + ux * wob;
      g.fillStyle(tr.color, 0.5 - i * 0.12);
      disc(g, x, y, tr.width * (1 - i * 0.2));
    }
    return;
  }
  g.lineStyle(tr.width, tr.color, 0.35).lineBetween(pr.x, pr.y, pr.x - ux * len, pr.y - uy * len);
  g.lineStyle(tr.width * 0.4, tr.core, 0.8).lineBetween(
    pr.x,
    pr.y,
    pr.x - ux * len * 0.55,
    pr.y - uy * len * 0.55,
  );
  if (tr.star) star(g, pr.x, pr.y, 9 + 2 * Math.sin(time * 10 + pr.poolIndex), 0xffffff, 0.8);
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
  if (b.link) {
    // Tempestade's jump: a zigzag from enemy to enemy (outline, colour, white core) and a spark where it lands.
    const mx = (b.fromX + b.x) / 2 + (hash(b.x, b.y, 7) - 0.5) * 30;
    const my = (b.fromY + b.y) / 2 + (hash(b.x, b.y, 8) - 0.5) * 30;
    for (let i = 0; i < BOLT_LAYERS.length; i++) {
      const L = BOLT_LAYERS[i] as readonly [number, number, number];
      top.lineStyle(st.width * 0.6 * L[0], L[1] === -1 ? st.color : L[1], L[2] * fade);
      top.lineBetween(b.fromX, b.fromY, mx, my);
      top.lineBetween(mx, my, b.x, b.y);
    }
    top.fillStyle(0xffffff, 0.9 * fade);
    disc(top, b.x, b.y, 4 + 4 * fade);
    return;
  }
  if (st.burst) {
    // An orb bursting: a flash, a soft disc filling the blast, and a bright ring running out to its edge.
    const grow = 1 - (1 - u) * (1 - u);
    g.fillStyle(st.color, 0.3 * fade);
    disc(g, b.x, b.y, r * grow);
    top.lineStyle(st.width * fade + 1, st.core, 0.9 * fade);
    ring(top, b.x, b.y, r * grow);
    top.lineStyle(2, st.color, 0.8 * fade);
    ring(top, b.x, b.y, r * grow * 0.75);
    if (u < 0.3) {
      top.fillStyle(0xffffff, 0.9 * (1 - u / 0.3));
      disc(top, b.x, b.y, 5 + r * 0.35 * (u / 0.3));
    }
    return;
  }
  if (st.fire) {
    if (u < FALL) {
      // The fall: a fireball (or the sword, point first) coming down from up and to the left.
      const fk = u / FALL;
      const x = b.x - 50 * (1 - fk);
      const y = b.y - 150 * (1 - fk);
      if (st.sword) drawSword(top, x, y - 24, Math.PI / 2 - 0.3 * (1 - fk), 16, FIRE_SWORD);
      else {
        top.fillStyle(st.color, 0.9).fillTriangle(x - 7, y - 3, x + 3, y - 7, x - 30, y - 70);
        top.fillStyle(st.color);
        disc(top, x, y, 9);
        top.fillStyle(st.core);
        disc(top, x - 1, y - 1, 6);
        top.fillStyle(0xffffff);
        disc(top, x - 2, y - 2, 3);
      }
      return;
    }
    const bk = (u - FALL) / (1 - FALL); // 0 -> 1 over the burst
    const grow = 1 - (1 - bk) * (1 - bk);
    g.fillStyle(st.color, 0.2 * fade);
    disc(g, b.x, b.y, r);
    // Flame petals opening out to the edge.
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = (i * Math.PI * 2) / n + b.x * 0.05;
      const d = r * (0.3 + 0.4 * grow);
      const pr = r * 0.32 * (0.6 + 0.4 * grow);
      g.fillStyle(i % 2 ? st.color : FLAME_COLOR, 0.55 * fade);
      disc(g, b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, pr);
    }
    g.fillStyle(st.core, 0.6 * fade);
    disc(g, b.x, b.y, r * 0.35 * (1 - 0.5 * bk));
    g.lineStyle(2, 0xfff0c0, 0.8 * fade);
    ring(g, b.x, b.y, r);
    // A ring of light smoke rolling just past the edge.
    g.lineStyle(4 * fade + 1, 0xf0e8d8, 0.3 * fade);
    ring(g, b.x, b.y, r * (1 + 0.2 * bk));
    if (st.sword) drawSword(top, b.x, b.y - 24, Math.PI / 2, 16, FIRE_SWORD);
    return;
  }
  // Lightning: the scorch and the cloud shadow on the ground, then the bolt and its flash on top.
  if (st.branches) g.fillStyle(INK, 0.18 * fade).fillEllipse(b.x + 10, b.y - 4, r * 2.6, r * 1.1);
  g.fillStyle(0x1a1424, 0.3 * fade);
  disc(g, b.x, b.y, r);
  g.lineStyle(2, st.color, 0.9 * fade);
  ring(g, b.x, b.y, r);
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
    top.fillStyle(0xffffff, 0.9 * (1 - fk));
    disc(top, b.x, b.y, 6 + r * 0.5 * fk);
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
    g.lineStyle(3, 0xffffff, 0.95 * fade);
    arcLine(g, cx, cy, range, tail, lead);
    g.lineStyle(2.5, st.edge, 0.9 * fade);
    arcLine(g, cx, cy, range + 2.5, tail, lead);
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
  under.lineStyle(5 * (1 - mk) + 1, 0xf0e8d8, 0.55 * (1 - mk));
  arcLine(under, cx, cy, range * (0.95 + 0.25 * mk), a0, a1);
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

/**
 * A slam's fissure, from (x, y) along `angle`: it tears open from the hero outward in the first quarter, a jagged
 * dark crack down the middle of a dusty strip exactly as long and wide as what it hits; chips jump along its
 * edges, and it closes as it fades. The Elo's crack glows from inside.
 */
function drawFissure(
  under: Phaser.GameObjects.Graphics,
  top: Phaser.GameObjects.Graphics,
  s: Slash,
  t: number,
): void {
  const ux = Math.cos(s.angle);
  const uy = Math.sin(s.angle);
  const open = Math.min(1, t / 0.25);
  const len = s.range * (1 - (1 - open) * (1 - open));
  const fade = t < 0.5 ? 1 : 1 - (t - 0.5) / 0.5;
  const half = s.width / 2;
  // The strip it hits: a dusty band.
  under.fillStyle(DUST_LIGHT, 0.28 * fade);
  setCorner(0, s.x - uy * half, s.y + ux * half);
  setCorner(1, s.x + ux * len - uy * half, s.y + uy * len + ux * half);
  setCorner(2, s.x + ux * len + uy * half, s.y + uy * len - ux * half);
  setCorner(3, s.x + uy * half, s.y - ux * half);
  under.fillPoints(QUAD, true);
  // The crack: a zig-zag down the middle, thick near the hero, thinning out.
  const glow = CRACK_GLOW[s.weapon];
  const n = 7;
  let px = s.x;
  let py = s.y;
  for (let i = 1; i <= n; i++) {
    const f = i / n;
    if (f * s.range > len) break;
    const side = (hash(s.x, s.y, i) - 0.5) * half * 0.9;
    const x = s.x + ux * s.range * f - uy * side;
    const y = s.y + uy * s.range * f + ux * side;
    const w = (1 - f * 0.6) * Math.max(3, half * 0.35);
    if (glow) {
      under.lineStyle(w + 4, glow, 0.5 * fade);
      under.lineBetween(px, py, x, y);
    }
    under.lineStyle(w, CRACK, 0.85 * fade);
    under.lineBetween(px, py, x, y);
    // A side crack every other joint.
    if (i % 2 === 0) {
      const sx = (hash(s.x, s.y, i + 9) > 0.5 ? 1 : -1) * half * 0.8;
      under.lineStyle(w * 0.5, CRACK, 0.7 * fade);
      under.lineBetween(x, y, x + ux * 10 - uy * sx, y + uy * 10 + ux * sx);
    }
    px = x;
    py = y;
  }
  // Chips thrown up along the edges while it opens.
  if (t < 0.35) {
    const k = t / 0.35;
    top.fillStyle(DUST_LIGHT, 0.9 * (1 - k));
    for (let i = 0; i < 6; i++) {
      const f = (i + 0.5) / 6;
      if (f * s.range > len) break;
      const side = (i % 2 ? 1 : -1) * (half + 6 * k);
      disc(top, s.x + ux * s.range * f - uy * side, s.y + uy * s.range * f + ux * side - 14 * k, 2.5);
    }
  }
}

/**
 * Where a heavy blow lands: a dark crater with cracks running out, and a dusty ring opening to exactly the shock
 * wave's radius (what it reaches). Drawn on the ground layer; `t` is the swing's 0 -> 1.
 */
function drawImpact(
  under: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  r: number,
  angle: number,
  t: number,
): void {
  if (t < SWEEP * 0.7) return;
  const k = (t - SWEEP * 0.7) / (1 - SWEEP * 0.7);
  const fade = 1 - k * k;
  under.fillStyle(0x3a2a24, 0.35 * fade);
  disc(under, x, y, r * 0.35);
  under.lineStyle(6 * (1 - k) + 1.5, 0xf0e8d8, 0.8 * (1 - k));
  ring(under, x, y, r * (0.4 + 0.6 * k));
  // Cracks fanning out from the crater, longest straight ahead.
  under.lineStyle(3, 0x2a1e1a, 0.85 * fade);
  for (let i = -2; i <= 2; i++) {
    const a = angle + i * 0.9;
    const len = r * (i === 0 ? 1 : 0.75);
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const mx = x + ux * len * 0.5 - uy * (i % 2 ? 4 : -4);
    const my = y + uy * len * 0.5 + ux * (i % 2 ? 4 : -4);
    under.lineBetween(x + ux * r * 0.2, y + uy * r * 0.2, mx, my);
    under.lineBetween(mx, my, x + ux * len, y + uy * len);
  }
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
  if (elo) {
    g.fillStyle(c, 0.06);
    disc(g, p.x, p.y, r);
  }
  for (let i = elo ? 1 : 0; i < AURA_CORE.length; i++) {
    const L = AURA_CORE[i] as readonly [number, number];
    g.fillStyle(elo && i === 2 ? 0xfff0c0 : c, L[1]);
    disc(g, p.x, p.y, r * L[0]);
  }
  // The rim flares on the tick and rests between ticks.
  const flare = Math.max(0, 1 - k * 3);
  g.lineStyle(2 + 2 * flare, c, 0.35 + 0.55 * flare);
  ring(g, p.x, p.y, r);
  // The beat: a wave from the core out to the exact edge (over the crowd, thin, so it is seen but hides nothing).
  if (k < 0.45) {
    const wk = k / 0.45;
    const wr = r * (0.3 + 0.7 * (1 - (1 - wk) ** 2));
    top.lineStyle(4 - 3 * wk, elo ? 0xffc060 : 0xfff0a0, 0.7 * (1 - wk));
    ring(top, p.x, p.y, wr);
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
    top.fillStyle(elo ? (i % 2 ? FLAME_COLOR : 0xffd060) : 0xfff0a0, 0.75 * ma);
    disc(top, mx, my, elo ? 2 : 2.2);
    if (!elo) {
      top.fillStyle(0xffffff, 0.8 * ma);
      disc(top, mx, my, 1);
    }
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
    disc(g, bx, by, w);
    g.fillTriangle(bx - w, by, bx + w, by, bx + Math.sin(t * 5 + i) * 2, by - h - w);
    g.fillStyle(0xfff0c0, 0.5);
    disc(g, bx, by + 1, w * 0.45);
  }
}

/**
 * A patch of frost (Geada; Nevasca when it comes from the Elo). It lands with a ring opening out and shards flying;
 * every damage tick a ring of frost runs from the middle to the edge and the crystals pulse; at the end its rim
 * breaks into pieces. Nevasca adds falling snowflakes.
 */
function drawZone(g: Phaser.GameObjects.Graphics, z: Zone, time: number): void {
  if (!z.slows) return drawEmbers(g, z, time);
  const elo = !!z.source && isElo(z.source.id);
  const age = z.duration - z.ttl;
  const fade = Math.min(1, z.ttl / ZONE_BREAK);
  const land = Math.min(1, age / ZONE_LAND);
  const r = z.radius * (1 - (1 - land) * (1 - land));
  const tk = 1 - z.tick / config.zones.tick; // 0 right at a tick
  g.fillStyle(elo ? BLIZZARD_COLOR : FROST_COLOR, 0.22 * fade);
  disc(g, z.x, z.y, r);
  // The rim: whole while it lasts, broken into pieces as it melts away.
  g.lineStyle(elo ? 4 : 2.5, elo ? BLIZZARD_EDGE : 0xffffff, 0.8 * fade);
  if (z.ttl > ZONE_BREAK) ring(g, z.x, z.y, r);
  else {
    const gap = 0.5 * (1 - fade);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + z.x * 0.01;
      arcLine(g, z.x, z.y, r, a + gap, a + Math.PI / 4 - gap);
    }
  }
  if (age < ZONE_LAND * 2) {
    // Landing: shards of ice flying out of the rim.
    const sk = age / (ZONE_LAND * 2);
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 + z.y * 0.01;
      const d = z.radius * (0.9 + 0.4 * sk);
      shard(g, z.x + Math.cos(a) * d, z.y + Math.sin(a) * d, a, 6, 1 - sk);
    }
  }
  if (tk < 0.5) {
    // The tick: a ring of frost from the middle to the edge.
    const wk = tk / 0.5;
    g.lineStyle(3 - 2 * wk, 0xffffff, 0.7 * (1 - wk) * fade);
    ring(g, z.x, z.y, r * (0.25 + 0.75 * wk));
  }
  // Ice crystals inside (snowflakes for Nevasca), turning slowly and pulsing on each tick.
  const n = elo ? 6 : 3;
  const pulse = 1 + 0.4 * Math.max(0, 1 - tk * 4);
  for (let i = 0; i < n; i++) {
    const ang = (i * Math.PI * 2) / n + time * (elo ? 0.8 : 0.4) + z.x * 0.01;
    const cx = z.x + Math.cos(ang) * r * 0.55;
    const cy = z.y + Math.sin(ang) * r * 0.55;
    const cr = (elo ? 6 : 4) * pulse;
    g.lineStyle(elo ? 2 : 1.5, 0xffffff, 0.75 * fade);
    g.lineBetween(cx - cr, cy, cx + cr, cy);
    g.lineBetween(cx - cr * 0.5, cy - cr * 0.87, cx + cr * 0.5, cy + cr * 0.87);
    g.lineBetween(cx - cr * 0.5, cy + cr * 0.87, cx + cr * 0.5, cy - cr * 0.87);
  }
  if (!elo) return;
  // Nevasca: snowflakes falling through the patch, each on its own column.
  for (let i = 0; i < 6; i++) {
    const ph = (time * 0.6 + i * 0.29) % 1;
    const fx = z.x + (((i * 0.618 + z.x * 0.001) % 1) - 0.5) * r * 1.4;
    const fy = z.y - r * 0.7 + ph * r * 1.4;
    g.fillStyle(0xffffff, 0.8 * Math.sin(ph * Math.PI) * fade);
    disc(g, fx + Math.sin(time * 3 + i) * 3, fy, 2);
  }
}

/**
 * Espada de Fogo's burning ground: a glowing patch with a rim of embers and flame tongues flickering up from it,
 * fading out as it cools. Whoever walks in catches fire (the orange tint).
 */
function drawEmbers(g: Phaser.GameObjects.Graphics, z: Zone, time: number): void {
  const fade = Math.min(1, z.ttl / ZONE_BREAK);
  const r = z.radius;
  g.fillStyle(0x3a1408, 0.35 * fade);
  disc(g, z.x, z.y, r);
  g.fillStyle(ELEMENT_COLOR.fire, 0.22 * fade);
  disc(g, z.x, z.y, r * 0.8);
  g.lineStyle(2.5, EMBER, 0.7 * fade);
  ring(g, z.x, z.y, r);
  const n = 7;
  for (let i = 0; i < n; i++) {
    const ph = (time * 1.6 + i * 0.37 + z.x * 0.001) % 1;
    const a = (i * Math.PI * 2) / n + z.y * 0.01;
    const d = r * (0.25 + 0.55 * ((i * 0.618) % 1));
    const fx = z.x + Math.cos(a) * d;
    const fy = z.y + Math.sin(a) * d * 0.7 - ph * 14;
    const fr = 5 * (1 - ph) + 1.5;
    g.fillStyle(i % 2 ? EMBER : 0xffe070, 0.8 * (1 - ph) * fade);
    g.fillTriangle(fx - fr, fy, fx + fr, fy, fx, fy - fr * 2.4);
    disc(g, fx, fy, fr);
  }
}

/** Common chargers (Encapuzado, Rato, Goblin) winding up: a coral arrow on the ground shows where they will run. */
function drawCharges(g: Phaser.GameObjects.Graphics, world: World): void {
  const list = world.enemies.active;
  for (let i = 0; i < list.length; i++) {
    const e = list[i] as Enemy;
    if (e.act !== BossAct.Windup || e.def.move !== 'charge') continue;
    const k = 1 - Math.max(0, e.actT) / CHARGE.windup; // 0 -> 1 as the dash comes
    const ux = e.aimX;
    const uy = e.aimY;
    const r = e.def.radius;
    const x0 = e.x + ux * (r + 4);
    const y0 = e.y + uy * (r + 4);
    const len = 14 + 16 * k;
    const x1 = x0 + ux * len;
    const y1 = y0 + uy * len;
    g.lineStyle(4, WARN_COLOR, 0.5 + 0.4 * k).lineBetween(x0, y0, x1, y1);
    g.fillStyle(WARN_COLOR, 0.6 + 0.4 * k).fillTriangle(
      x1 + ux * 9,
      y1 + uy * 9,
      x1 - uy * 6,
      y1 + ux * 6,
      x1 + uy * 6,
      y1 - ux * 6,
    );
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
    g.fillStyle(0xffffff, 0.25 * fade);
    disc(g, p.x, p.y, 26);
    const rk = Math.min(1, chest / 0.5);
    if (rk < 1) {
      top.lineStyle(5 * (1 - rk) + 1, hero, 1 - rk);
      ring(top, p.x, p.y, 18 + 80 * (1 - (1 - rk) ** 3));
      top.lineStyle(2, 0xffffff, 0.8 * (1 - rk));
      ring(top, p.x, p.y, 14 + 70 * (1 - (1 - rk) ** 3));
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
      top.lineStyle(i ? 3 : 7, i ? 0xffffff : ITEM_GLINT, (i ? 0.6 : 0.85) * a);
      ring(top, p.x, p.y, r);
      if (!i) {
        g.lineStyle(26, ITEM_GLINT, 0.12 * a);
        ring(g, p.x, p.y, r - 10);
      }
    }
  }
  const frost = t - m.frost;
  if (frost < 0.5) {
    // Sopro de Geada: a wave of frost rolling out to the edges, with ice shards riding on it.
    const fk = Math.min(1, frost / 0.4);
    const r = 20 + (edge - 20) * (1 - (1 - fk) ** 2);
    const a = frost < 0.4 ? 1 : 1 - (frost - 0.4) / 0.1;
    g.lineStyle(30, ICE, 0.18 * a);
    ring(g, p.x, p.y, r - 14);
    top.lineStyle(4, 0xffffff, 0.85 * a);
    ring(top, p.x, p.y, r);
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
    if (ab.kind === 'lunge') {
      // Speed lines streaming behind the running wolf.
      const r = e.def.radius;
      top.lineStyle(3, 0xffffff, 0.6);
      for (let i = -1; i <= 1; i++) {
        const sx = e.x - e.aimX * (r + 4) - e.aimY * i * r * 0.5;
        const sy = e.y - e.aimY * (r + 4) + e.aimX * i * r * 0.5;
        const l = 26 + 14 * (1 - Math.abs(i)) + 8 * Math.sin(time * 30 + i);
        top.lineBetween(sx, sy, sx - e.aimX * l, sy - e.aimY * l);
      }
    }
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
      g.fillStyle(WARN_COLOR, fill);
      band(g, e.x, e.y, 0, ab.range, a0, a1);
      // Stripes: bands rolling out toward the edge.
      g.lineStyle(5, WARN_COLOR, 0.3);
      for (let i = 0; i < 4; i++) {
        const r = ab.range * (((i + time * 1.5) % 4) / 4);
        if (r > 8) arcLine(g, e.x, e.y, r, a0, a1);
      }
      // An inner slice grows to the edge: when it touches, the sword falls.
      g.fillStyle(WARN_COLOR, 0.32);
      band(g, e.x, e.y, 0, ab.range * k, a0, a1);
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
      g.fillStyle(WARN_COLOR, 0.45);
      disc(g, e.x + ux * len * k, e.y + uy * len * k, w * 0.35);
      break;
    }
    case 'toll': {
      // Rings ripple out from the bell; small marks show where the dead will rise.
      const r = ab.range * (0.4 + 0.6 * k);
      g.fillStyle(WARN_COLOR, fill * 0.6);
      disc(g, e.x, e.y, r);
      g.lineStyle(2.5, WARN_EDGE, edgeA);
      dashedArc(g, e.x, e.y, r, 0, Math.PI * 2, march);
      const n = ab.count ?? 6;
      for (let i = 0; i < n; i++) {
        const a = (i * Math.PI * 2) / n;
        const mx = e.x + Math.cos(a) * ab.range;
        const my = e.y + Math.sin(a) * ab.range;
        const mr = 6 + 6 * k;
        g.fillStyle(WARN_COLOR, 0.25 + 0.3 * k);
        disc(g, mx, my, mr);
        g.lineStyle(2, WARN_EDGE, edgeA);
        ring(g, mx, my, mr);
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
    if (t > s) arcLine(g, x, y, r, s, t);
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

/** A round shield of hit radius `r`: a wooden rim, a painted face with a band across and a steel boss. */
function drawShield(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, st: OrbitStyle): void {
  g.fillStyle(st.dark).lineStyle(2.5, INK);
  disc(g, x, y, r);
  g.strokeCircle(x, y, r);
  g.fillStyle(st.color);
  disc(g, x, y, r * 0.78);
  g.fillStyle(0xf0f4ff, 0.85).fillRect(x - r * 0.78, y - r * 0.14, r * 1.56, r * 0.28);
  g.fillStyle(0xcbd8ec).lineStyle(1.5, INK);
  disc(g, x, y, r * 0.3);
  g.strokeCircle(x, y, r * 0.3);
  g.fillStyle(0xffffff, 0.4).fillEllipse(x - r * 0.35, y - r * 0.4, r * 0.5, r * 0.3);
}
