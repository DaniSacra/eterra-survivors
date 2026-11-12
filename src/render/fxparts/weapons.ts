import type Phaser from 'phaser';
import type { World } from '../../core/world';
import { WEAPONS, type AuraLevel, type OrbitLevel, type WeaponDef, type WeaponId } from '../../data/weapons';
import { bladeRadius, isElo, orbitAngle, weaponStats } from '../../core/weapons';
import { wardReady } from '../../core/elos';
import { config } from '../../data/config';
import type { Bolt, Slash } from '../../core/effects';
import type { Projectile } from '../../core/projectiles';
import type { Zone } from '../../core/zones';
import { INK } from '../art/pen';
import { ELEMENT_COLOR, UI } from '../ui';
import { fxSprites } from '../fxSprites';
import { VFX, vfxKey } from '../vfx';
import { AREA_HIT, HIT_SPARK, star } from '../sparks';
import { arcLine, band, disc, oval, ovalRing, ring } from '../shapes';
import {
  HEAL_COLOR,
  HERO_COLOR,
  ICE,
  type Moments,
  type OrbitStyle,
  WARN_COLOR,
  WARN_EDGE,
  ZONE_FILL_MAX,
  glowArc,
  drawSword,
  hash,
  shard,
} from './common';

/**
 * How each swing looks: blade color, edge color, the inner radius of its crescent (a fraction of the reach: the
 * middle stays clear so enemies near the hero show), and its ground mark after the hit.
 */
export interface SwingStyle {
  fill: number;
  edge: number;
  band: number;
  fillAlpha: number;
  mark: 'none' | 'shock' | 'crack';
  /** Drawn as this pixel sprite (render/vfx.ts) instead of code: the crescent cut, or Fúria's full spin. */
  sprite?: 'slash' | 'furySpin';
}

export const SWING_PLAIN: SwingStyle = {
  fill: 0xe8f0ff,
  edge: 0x9ad8ff,
  band: 0.5,
  fillAlpha: 0.4,
  mark: 'none',
};

export const SWING_STYLE: Partial<Record<WeaponId, SwingStyle>> = {
  blade: { fill: 0xf0f4ff, edge: HERO_COLOR.aldo, band: 0.5, fillAlpha: 0.4, mark: 'none', sprite: 'slash' },
  fury: {
    fill: 0xffe4dc,
    edge: ELEMENT_COLOR.fury,
    band: 0.62,
    fillAlpha: 0.45,
    mark: 'none',
    sprite: 'furySpin',
  },
};

/** The Black Knight's Corte Brutal landing: a white blade with a coral edge. */
export const CLEAVE_STYLE: SwingStyle = {
  fill: 0xffffff,
  edge: UI.dangerHex,
  band: 0.35,
  fillAlpha: 0.4,
  mark: 'shock',
};

/** Fraction of a swing's life spent sweeping; the rest the trail catches up and fades. */
export const SWEEP = 0.55;

/** Elos get warmer, brighter versions of their base colors. */
export const AURA_COLOR = 0xffc040;

export const FLAME_COLOR = ELEMENT_COLOR.holy;

/** The ring of the bolt sprite, in art px: the sprite is scaled so the ring is the hit radius. */
export const BOLT_RING = 40;

/** The same for the fire burst sprite. */
export const BLAST_RING = 44;

/** Frost patch radius that one crystal sprite (about 66 art px wide) suits. */
export const ICE_SPAN = 80;

/** Burning patch radius that a flame at its own size suits. */
export const EMBER_SPAN = 70;

/** The aura ring sprite's outer ring, art px from the centre. */
export const AURA_RING = 57;

/** The shock wave sprite's outer ring, art px from the centre. */
export const SHOCK_RING = 50;

/** The pulse sprite's outer ring, art px from the centre. */
export const PULSE_RING = 90;

/** The slash sprite's edge, art px from the centre. */
export const SLASH_REACH = 92;

/** Espada de Fogo's burning ground: the flames' light orange. */
export const EMBER = 0xffb040;

export const ORBIT_STYLE: Partial<Record<WeaponId, OrbitStyle>> = {
  vigil: { color: 0xfff6e0, dark: ELEMENT_COLOR.holy, blade: true },
};

export const SWORDS: OrbitStyle = { color: 0xcbd8ec, dark: 0x9a6232, blade: true };

/** Frost patches in the ice family (white-lilac), never the gems' cyan; Nevasca keeps a strong blue edge. */
export const FROST_COLOR = 0xd8d2f0;

export const BLIZZARD_COLOR = ELEMENT_COLOR.ice;

export const BLIZZARD_EDGE = 0x4a8ad8;

/** How long a frost patch takes to land (ring opening, shards flying), and to break up at the end, seconds. */
export const ZONE_LAND = 0.15;

export const ZONE_BREAK = 0.4;

/**
 * How each strike weapon falls from the sky. Lightning (default, Lyra's): bolt color and its outline width, and
 * `branches` for Tempestade. Fire: a fireball, or a burning sword (`sword`) that plants itself.
 */
export interface BoltStyle {
  color: number;
  core: number;
  width: number;
  fire: boolean;
  sword: boolean;
  branches: number;
  /** Not from the sky: an orb bursting where it struck (Cajado de Lyra). */
  burst?: boolean;
  /** The burst throws ice shards out to its edge (Nevasca's shatter). */
  shards?: boolean;
}

export const BOLT_PLAIN: BoltStyle = {
  color: 0xc890ff,
  core: 0xffffff,
  width: 5,
  fire: false,
  sword: false,
  branches: 0,
};

export const BOLT_STYLE: Partial<Record<WeaponId, BoltStyle>> = {
  storm: { color: ELEMENT_COLOR.storm, core: 0xffffff, width: 7, fire: false, sword: false, branches: 2 },
  fire: { color: 0xffa83a, core: 0xffe070, width: 5, fire: true, sword: false, branches: 0 },
  fireSword: { color: ELEMENT_COLOR.fire, core: 0xfff0a0, width: 7, fire: true, sword: true, branches: 0 },
  staff: { color: 0xff8a28, core: 0xfff0b0, width: 3, fire: false, sword: false, branches: 0, burst: true },
  /** Nevasca's shatter: an enemy bursting into ice. */
  blizzard: {
    color: ELEMENT_COLOR.ice,
    core: 0xffffff,
    width: 3,
    fire: false,
    sword: false,
    branches: 0,
    burst: true,
    shards: true,
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

/** Mace blows: the dust, the dent where the head lands, pebbles, and the Elo's glow. */
export const DUST_LIGHT = 0xe8dcc8;

export const DENT = 0x3a2a24;

export const SLAM_GLOW: Partial<Record<WeaponId, number>> = { jointBreaker: ELEMENT_COLOR.earth };

/** The burning sword of Espada de Fogo, drawn with the orbit swords' shape. */
export const FIRE_SWORD: OrbitStyle = { color: 0xffd890, dark: 0xff6a20, blade: true };

/** Part of a strike's life spent falling, before the burst on the ground (short: it lands with the damage, NF-09). */
export const FALL = 0.12;

/** Segments of Tempestade's jump line. */
export const CHAIN_SEGS = 5;

/** Lightning layers: width factor, color (-1 = the bolt's color), alpha. Preallocated. */
export const BOLT_LAYERS: readonly [number, number, number][] = [
  [1.6, INK, 0.9],
  [1, -1, 1],
  [0.35, 0xffffff, 1],
];

/**
 * A projectile's trail (drawn under its sprite): a speed streak (`line`: wide color, then a thin bright core), or
 * a wavy row of fading lights (`dots`). `len` is seconds of flight it covers; `star` adds a twinkle at the head.
 */
export interface Trail {
  color: number;
  core: number;
  width: number;
  len: number;
  dots: boolean;
  star: boolean;
}

export const TRAIL: Partial<Record<WeaponId, Trail>> = {
  elunLight: { color: 0xf0d070, core: 0xfff6d0, width: 5, len: 0.06, dots: false, star: false },
  holyLight: { color: ELEMENT_COLOR.holy, core: 0xffffff, width: 6, len: 0.07, dots: false, star: true },
  fan: { color: ELEMENT_COLOR.shadow, core: 0xe0ffe8, width: 3, len: 0.05, dots: false, star: false },
  hammer: { color: 0xcbd8ec, core: 0xffffff, width: 10, len: 0.12, dots: false, star: false },
  shields: { color: 0x8aa8c8, core: 0xffffff, width: 9, len: 0.2, dots: false, star: false },
  valmorWall: { color: ELEMENT_COLOR.steel, core: 0xffffff, width: 11, len: 0.2, dots: false, star: false },
  forgeFury: { color: ELEMENT_COLOR.forge, core: 0xfff0a0, width: 12, len: 0.14, dots: false, star: false },
  wisps: { color: 0x3ecf6a, core: 0xe0ffd8, width: 4, len: 0.08, dots: false, star: false },
  soulProcession: { color: ELEMENT_COLOR.soul, core: 0xffffff, width: 5, len: 0.2, dots: true, star: false },
};

/** How long the mark of a turn (ricochet, return, far side of a loop) shows, seconds. */
export const TURN_SHOW = 0.3;

/**
 * The Elo verbs of thrown shots that turn (PF-03): a ricochet leaves an emerald streak from the bounce to the new
 * target and a star where it bounced; the boomerang leaves a faint ghost of its way out and flares when it turns
 * home; a shield's loop shows the steel arc it still has to fly before it comes back, and flares at its far side.
 * All of it reads from the shot's own turn marks (`turnAt`, `turnX`, `turnY`, `fromX`, `fromY`): no state here.
 */
export function drawVerb(g: Phaser.GameObjects.Graphics, pr: Projectile, def: WeaponDef, time: number): void {
  const since = time - pr.turnAt;
  const flare = since >= 0 && since < TURN_SHOW ? 1 - since / TURN_SHOW : 0;
  if (def.ricochet && flare > 0) {
    const c = ELEMENT_COLOR.shadow;
    g.lineStyle(4, c, 0.7 * flare).lineBetween(pr.turnX, pr.turnY, pr.x, pr.y);
    g.lineStyle(1.5, 0xe0ffe8, 0.9 * flare).lineBetween(pr.turnX, pr.turnY, pr.x, pr.y);
    star(g, pr.turnX, pr.turnY, 5 + 9 * flare, 0xe0ffe8, flare);
  } else if (def.boomerang && pr.home) {
    // The way out stays as a faint ghost until the hammer is caught.
    g.lineStyle(5, ELEMENT_COLOR.forge, 0.16).lineBetween(pr.fromX, pr.fromY, pr.turnX, pr.turnY);
    if (flare > 0) {
      g.lineStyle(3 * flare + 1, 0xfff0a0, flare);
      ring(g, pr.turnX, pr.turnY, 10 + 26 * (1 - flare));
      star(g, pr.turnX, pr.turnY, 6 + 10 * flare, 0xffffff, flare);
    }
  } else if (def.loop) {
    if (flare > 0) {
      g.lineStyle(3 * flare + 1, 0xffffff, 0.9 * flare);
      ring(g, pr.turnX, pr.turnY, 8 + 24 * (1 - flare));
      star(g, pr.turnX, pr.turnY, 5 + 8 * flare, ELEMENT_COLOR.steel, flare);
    }
    if (pr.back > 0 && pr.curve !== 0) {
      // The circle it flies: centre to the side it turns toward; the arc ahead, up to the far side.
      const rs = pr.speed / pr.curve;
      const cx = pr.x - Math.sin(pr.angle) * rs;
      const cy = pr.y + Math.cos(pr.angle) * rs;
      const t0 = Math.atan2(pr.y - cy, pr.x - cx);
      const sweep = pr.curve * (pr.ttl - pr.back);
      g.lineStyle(2, ELEMENT_COLOR.steel, 0.38);
      if (sweep > 0) arcLine(g, cx, cy, Math.abs(rs), t0, t0 + sweep);
      else arcLine(g, cx, cy, Math.abs(rs), t0 + sweep, t0);
    }
  }
}

export function drawTrail(g: Phaser.GameObjects.Graphics, pr: Projectile, tr: Trail, time: number): void {
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

/**
 * Something falling from the sky (`u` 0 -> 1 over its life). The damage area is marked on the ground (`g`), never
 * as a disc over the enemies. Lightning: a zigzag of its own (outline, Lyra's purple, white core) and a scorch
 * mark; Tempestade adds branches and a cloud shadow. Fire: a fireball dropping, then a flower of flame petals out to
 * the exact radius; Espada de Fogo plants a burning sword in the middle.
 */
export function drawBolt(
  g: Phaser.GameObjects.Graphics,
  top: Phaser.GameObjects.Graphics,
  b: Bolt,
  u: number,
): void {
  const st = BOLT_STYLE[b.weapon] ?? BOLT_PLAIN;
  const fade = 1 - u;
  const r = b.radius;
  if (b.link) {
    // Tempestade's jump: a violet zigzag from enemy to enemy in whole 2 px steps (cold halo, outline, colour, white
    // core), its shape re-rolled a few times over its life like a live arc, and a star of lightning where it lands.
    const dx = b.x - b.fromX;
    const dy = b.y - b.fromY;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const roll = Math.floor(u * 6);
    let px = b.fromX;
    let py = b.fromY;
    for (let seg = 1; seg <= CHAIN_SEGS; seg++) {
      const f = seg / CHAIN_SEGS;
      const off = seg === CHAIN_SEGS ? 0 : (hash(b.x + seg, b.y, 7 + roll) - 0.5) * Math.min(26, len * 0.35);
      const qx = Math.round((b.fromX + dx * f + nx * off) / 2) * 2;
      const qy = Math.round((b.fromY + dy * f + ny * off) / 2) * 2;
      top.lineStyle(st.width * 1.5, st.color, 0.18 * fade);
      top.lineBetween(px, py, qx, qy);
      for (let i = 0; i < BOLT_LAYERS.length; i++) {
        const L = BOLT_LAYERS[i] as readonly [number, number, number];
        top.lineStyle(st.width * 0.85 * L[0], L[1] === -1 ? st.color : L[1], L[2] * fade);
        top.lineBetween(px, py, qx, qy);
      }
      px = qx;
      py = qy;
    }
    const hit = VFX.chainHit;
    fxSprites.putFrame(
      vfxKey('chainHit'),
      Math.min(hit.frames - 1, Math.floor(u * hit.frames)),
      hit.anchor[0],
      hit.anchor[1],
      b.x,
      b.y,
      0.8,
    );
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
    if (st.shards)
      // The frozen enemy breaking: ice shards flung out to the edge of what the shatter hits.
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 + hash(b.x, b.y, 4) * 2;
        const d = r * (0.25 + 0.75 * grow);
        shard(top, b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, a, 7 * fade + 2, fade);
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
        // A small flame falling, flickering as it comes.
        const fl = VFX.flame;
        fxSprites.putFrame(
          vfxKey('flame'),
          Math.floor(u * 40) % fl.frames,
          fl.anchor[0],
          fl.anchor[1],
          x,
          y + 18,
          0.8,
        );
      }
      return;
    }
    const bk = (u - FALL) / (1 - FALL); // 0 -> 1 over the burst
    // The burst: the pixel fireball, its ring running out to exactly the blast radius.
    const blast = VFX.blast;
    fxSprites.putFrame(
      vfxKey('blast'),
      Math.min(blast.frames - 1, Math.floor(bk * blast.frames)),
      blast.anchor[0],
      blast.anchor[1],
      b.x,
      b.y,
      r / BLAST_RING,
    );
    if (st.sword) drawSword(top, b.x, b.y - 24, Math.PI / 2, 16, FIRE_SWORD);
    return;
  }
  // Lightning: the pixel bolt strikes from above and leaves a ring of force exactly as wide as the hit.
  const bolt = VFX.bolt;
  const f = Math.min(bolt.frames - 1, Math.floor(u * bolt.frames));
  fxSprites.putFrame(vfxKey('bolt'), f, bolt.anchor[0], bolt.anchor[1], b.x, b.y, r / BOLT_RING);
}

/**
 * A swing that sweeps from `a0` to `a1` around (cx, cy): a crescent band trailing behind a bright edge, so the
 * direction reads in a single frame. `t` goes 0 -> 1 over the swing's life. Heavy swings leave a mark on the
 * ground (`under`): a shock ring opening out along the arc, or cracks at its ends.
 */
export function drawSwing(
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
  if (st.sprite) {
    // The pixel crescent: centred on the swing, scaled so its edge is the weapon's reach.
    const cut = VFX[st.sprite];
    fxSprites.putFrame(
      vfxKey(st.sprite),
      Math.max(0, Math.min(cut.frames - 1, Math.floor(t * cut.frames))),
      cut.anchor[0],
      cut.anchor[1],
      cx,
      cy,
      range / SLASH_REACH,
      1,
      // The spin is a whole ring: nothing to turn.
      st.sprite === 'furySpin' ? 0 : (a0 + a1) / 2,
    );
    return;
  }
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
    // A bright square glint on the tip, in whole pixels like the rest of the art.
    g.fillStyle(0xffffff, 1).fillRect(
      Math.round((cx + ux * range) / 2) * 2 - 3,
      Math.round((cy + uy * range) / 2) * 2 - 3,
      6,
      6,
    );
    g.fillStyle(st.edge, 0.9).fillRect(
      Math.round((cx + ux * range) / 2) * 2 - 1,
      Math.round((cy + uy * range) / 2) * 2 - 1,
      2,
      2,
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
 * A mace blow landing at (s.x, s.y), facing `s.angle`, `t` 0 -> 1: the iron head's shadow drops in for a moment,
 * then a dusty half-moon of impact opens to exactly the radius it hits, its front rim bright, and fades. The Elo's
 * rim glows in its element's colour.
 */
export function drawSmash(
  under: Phaser.GameObjects.Graphics,
  top: Phaser.GameObjects.Graphics,
  s: Slash,
  t: number,
): void {
  const r = s.shock;
  const glow = SLAM_GLOW[s.weapon];
  // The impact starts on the frame of the damage (NF-03): no drop before it.
  const k = t;
  const open = 1 - (1 - k) * (1 - k) * (1 - k);
  const fade = 1 - k * k;
  const a0 = s.angle - Math.PI * 0.6;
  const a1 = s.angle + Math.PI * 0.6;
  under.fillStyle(DUST_LIGHT, ZONE_FILL_MAX * fade);
  disc(under, s.x, s.y, r * open);
  under.fillStyle(DENT, 0.35 * fade);
  disc(under, s.x, s.y, r * 0.28);
  // A dark ring on the ground at the exact reach of the blow.
  under.lineStyle(3, INK, 0.45 * fade);
  ring(under, s.x, s.y, r);
  // Quebra-Junta's rim is its element's amber, with the dust only as a thread inside; the mace's is dust.
  top.lineStyle(7 * fade + 2, glow ?? DUST_LIGHT, 0.95 * fade);
  arcLine(top, s.x, s.y, r * open, a0, a1);
  top.lineStyle(2, glow ? DUST_LIGHT : 0xffffff, 0.9 * fade);
  arcLine(top, s.x, s.y, r * open * 0.93, a0 + 0.15, a1 - 0.15);
  if (k < HEAD_SHOWN) drawMaceHead(s, k / HEAD_SHOWN);
  // Pebbles thrown out from the front half, falling back.
  top.fillStyle(DUST_LIGHT, 0.9 * fade);
  for (let i = 0; i < 5; i++) {
    const a = a0 + ((a1 - a0) * (i + 0.5)) / 5;
    const d = r * (0.6 + 0.5 * open);
    disc(top, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d - Math.sin(k * Math.PI) * 14, 2.5);
  }
}

/** Part of a blow's life the mace head stays on the ground (~0.15 s). */
export const HEAD_SHOWN = 0.375;

/**
 * The mace head driven into the ground where it struck, on the frame of the damage: it squashes and fades (`q` 0 -> 1).
 * The blow that brings the shock wave has a white-hot head ("pá, pá, BUM").
 */
export function drawMaceHead(s: Slash, q: number): void {
  // The pixel head with its haft, turned the way the blow goes; it swells a little as it lands, then fades.
  fxSprites.put('fx.maceHead', s.x, s.y - 6, s.angle, 1 + 0.25 * q, 1 - q * q);
}

/**
 * A mace's shock wave running out from (s.x, s.y) to `s.shock`: a thick dusty ring with a bright inner edge and
 * pebbles riding it, over a faint dust disc. Quebra-Junta's glows in its element's colour.
 */
export function drawShock(
  under: Phaser.GameObjects.Graphics,
  top: Phaser.GameObjects.Graphics,
  s: Slash,
  t: number,
): void {
  const grow = 1 - (1 - t) * (1 - t);
  const r = s.shock * (0.2 + 0.8 * grow);
  const fade = (1 - t) * (s.echo ? 0.5 : 1);
  const glow = SLAM_GLOW[s.weapon];
  under.fillStyle(DUST_LIGHT, 0.12 * fade);
  disc(under, s.x, s.y, r);
  // Quebra-Junta's element shows as one thin amber thread on the wave front (no wide halo: the skeletons inside
  // keep their outline, PF-02).
  if (glow) {
    top.lineStyle(2, glow, 0.7 * fade);
    ring(top, s.x, s.y, r);
  }
  // The pixel rings of force: the outer one runs out to exactly the wave's radius. The aftershock is fainter.
  const wave = VFX.shock;
  fxSprites.putFrame(
    vfxKey('shock'),
    Math.min(wave.frames - 1, Math.floor(t * wave.frames)),
    wave.anchor[0],
    wave.anchor[1],
    s.x,
    s.y,
    s.shock / SHOCK_RING,
    s.echo ? 0.45 : 0.85,
  );
}

/** `lit` of `n` amber pips under the hero: the blows already struck towards the mace's next shock wave. */
export function drawWaveCount(g: Phaser.GameObjects.Graphics, world: World, lit: number, n: number): void {
  const p = world.player;
  for (let i = 0; i < n; i++) {
    const x = p.x + (i - (n - 1) / 2) * 12;
    const y = p.y + 44;
    g.fillStyle(INK, 0.6);
    disc(g, x, y, 4.5);
    g.fillStyle(i < lit ? ELEMENT_COLOR.earth : 0x4a3a28, i < lit ? 1 : 0.8);
    disc(g, x, y, 3);
  }
}

/**
 * Procissão: the souls it has gathered (one per kill, up to its cap; each adds a wisp to the next volley) circle the
 * hero as small lights, blinking in their last second before they go (NF-08).
 */
export function drawSouls(g: Phaser.GameObjects.Graphics, world: World, n: number, left: number): void {
  const p = world.player;
  const t = world.time;
  const a = left < 1 ? 0.45 + 0.45 * Math.sin(t * 24) : 0.9;
  // A pale halo round the hero that grows and brightens with every soul gathered: the swell, readable at a glance.
  const swell = Math.min(1, n / ((WEAPONS.soulProcession as WeaponDef).swell?.cap ?? 4));
  g.fillStyle(ELEMENT_COLOR.soul, (0.05 + 0.1 * swell) * a);
  disc(g, p.x, p.y - 6, 24 + 16 * swell);
  g.lineStyle(2, ELEMENT_COLOR.soul, (0.2 + 0.4 * swell) * a);
  ring(g, p.x, p.y - 6, 24 + 16 * swell);
  for (let i = 0; i < n; i++) {
    const ang = t * 2.2 + (i * Math.PI * 2) / n;
    const x = p.x + Math.cos(ang) * 30;
    const y = p.y - 6 + Math.sin(ang) * 12 + Math.sin(t * 5 + i) * 2;
    g.fillStyle(ELEMENT_COLOR.soul, 0.35 * a);
    disc(g, x, y, 6);
    g.fillStyle(0xffffff, a);
    disc(g, x, y, 2.5);
  }
}

/** The most burning bodies drawn with flames in a frame. */
export const BURNING_SHOWN = 14;

/** Rims of area hits drawn per frame, and the colour of a weapon with no spark colour of its own. */
export const HIT_RIMS = 48;

export const HIT_RIM_PLAIN = 0xffe6b0;

export const FLAME_OUTER = 0xff5a14;

export const FLAME_MID = 0xffa030;

export const FLAME_CORE = 0xfff2c0;

export const HEAL_FLASH = 3;

/** A soft pool of light: nested ovals on the additive layer, brighter in the middle. */
export function softPool(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: number,
  alpha: number,
): void {
  for (let i = 0; i < 4; i++) {
    const f = 1 - i * 0.24;
    g.fillStyle(color, alpha * 0.28);
    oval(g, x, y, rx * f, ry * f);
  }
}

/** One tongue of fire: a teardrop of three nested layers whose tip sways and flickers. */
export function tongue(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number,
  seed: number,
  a: number,
): void {
  const sway = Math.sin(t * 9 + seed * 1.7) * w * 0.5;
  const flick = 0.82 + 0.18 * Math.sin(t * 17 + seed * 2.3);
  const hh = h * flick;
  g.fillStyle(FLAME_OUTER, 0.5 * a);
  disc(g, x, y, w);
  g.fillTriangle(x - w, y, x + w, y, x + sway, y - hh);
  g.fillStyle(FLAME_MID, 0.6 * a);
  disc(g, x, y, w * 0.65);
  g.fillTriangle(x - w * 0.65, y, x + w * 0.65, y, x + sway * 0.8, y - hh * 0.72);
  g.fillStyle(FLAME_CORE, 0.8 * a);
  g.fillTriangle(x - w * 0.3, y, x + w * 0.3, y, x + sway * 0.5, y - hh * 0.42);
}

/**
 * The additive layer: light that adds to what is below. A burning body (the Ossada em Brasa, anything with a burn)
 * wears real flames, several tongues climbing from the shoulders and trembling, over a pool of orange light on the
 * ground that also washes its neighbours. The aura breathes light; orbiting blades carry a glint; a heal glows green.
 * The calm screen holds flames steady and dims the pools.
 */
export function drawGlow(g: Phaser.GameObjects.Graphics, world: World, m: Moments, calm: boolean): void {
  const t = calm ? 0 : world.time;
  const dim = calm ? 0.6 : 1;
  const p = world.player;
  const foes = world.enemies.active;
  let shown = 0;
  for (let i = 0; i < foes.length && shown < BURNING_SHOWN; i++) {
    const e = foes[i] as (typeof foes)[number];
    const ember = !!e.def.burst && e.pile <= 0;
    if (e.dead || !(ember || (e.dot > 0 && e.dotKind !== 'bleed'))) continue;
    shown++;
    const r = e.def.radius;
    const pulse = 0.85 + 0.15 * Math.sin(t * 7 + e.uid);
    softPool(g, e.x, e.y + r * 0.6, r * 3.4 * pulse, r * 2.2 * pulse, FLAME_OUTER, 0.5 * dim);
    softPool(g, e.x, e.y + r * 0.5, r * 1.6, r * 1.0, FLAME_MID, 0.4 * dim);
    const n = ember ? (calm ? 3 : 5) : 3;
    const big = ember ? 1 : 0.6;
    for (let k = 0; k < n; k++) {
      const u = k / (n - 1) - 0.5; // -0.5 .. 0.5 across the shoulders
      const hk = 1 - Math.abs(u) * 0.9;
      tongue(
        g,
        e.x + u * r * 1.5,
        e.y + r * (0.15 - 0.2 * hk),
        (4.2 + 2.6 * hk) * big,
        (20 + 16 * hk) * big,
        t,
        e.uid + k * 1.9,
        dim > 0.9 ? 1 : 0.8,
      );
    }
  }
  // Who was hit by an area weapon (no white flash for those): a thin rim of the weapon's own light that fades with
  // the hit, added over the body (PF-01). The calm screen keeps it, only dimmer.
  let rims = 0;
  for (let i = 0; i < foes.length && rims < HIT_RIMS; i++) {
    const e = foes[i] as (typeof foes)[number];
    if (e.dead || e.flash <= 0 || !e.hitBy || !AREA_HIT[e.hitBy]) continue;
    rims++;
    const f = Math.min(1, e.flash / config.enemies.hitFlash);
    const c = HIT_SPARK[e.hitBy]?.[1] ?? HIT_RIM_PLAIN;
    const r = e.def.radius;
    g.fillStyle(c, 0.16 * f * dim);
    oval(g, e.x, e.y - r * 0.2, r * 1.1, r * 1.25);
    g.lineStyle(2, c, 0.7 * f * dim);
    ovalRing(g, e.x, e.y - r * 0.2, r * 1.15, r * 1.3);
  }
  for (let iW = 0; iW < world.weapons.length; iW++) {
    const w = world.weapons[iW] as (typeof world.weapons)[number];
    const def = WEAPONS[w.id] as WeaponDef;
    if (def.kind === 'aura') {
      const st = weaponStats(w) as AuraLevel;
      const r = st.radius * p.stats.area;
      const k = 1 - w.timer / (st.cooldown * p.stats.cooldown);
      const flare = Math.max(0, 1 - k * 3);
      const c = isElo(w.id) ? 0xff9a30 : 0xffd060;
      softPool(g, p.x, p.y, r * 0.9, r * 0.8, c, (0.22 + 0.4 * flare) * dim);
      g.lineStyle(3, 0xfff0c0, (0.15 + 0.5 * flare) * dim);
      ring(g, p.x, p.y, r);
    } else if (def.kind === 'orbit') {
      const s = weaponStats(w) as OrbitLevel;
      const count = s.count + p.stats.amount;
      const orbitR = s.orbitRadius * p.stats.area;
      const r = s.radius * p.stats.area;
      const elo = isElo(w.id);
      for (let i = 0; i < count; i++) {
        const a = orbitAngle(world.time, s.spin, i, count);
        const br = bladeRadius(w, a, orbitR);
        const bx = p.x + Math.cos(a) * br;
        const by = p.y + Math.sin(a) * br;
        g.fillStyle(elo ? 0xfff0b0 : 0xcfe4ff, 0.14 * dim);
        disc(g, bx, by, r * 1.3);
        g.fillStyle(0xffffff, 0.3 * dim);
        disc(g, bx, by, r * 0.4);
      }
    }
  }
  // Healing: a soft green glow around the hero's body for a few seconds after the last heal, fading out
  // (regeneration keeps renewing it). The life bar itself stays as it is.
  const healed = world.time - m.heal;
  if (healed < HEAL_FLASH) {
    const hk = Math.min(1, (HEAL_FLASH - healed) / 1.2);
    const beat = 0.75 + 0.25 * Math.sin(world.time * 5);
    softPool(g, p.x, p.y - 12, 36, 44, HEAL_COLOR, 0.34 * hk * beat * dim);
  }
}

/** An aura with at least this cooldown (s) is a burst: it charges visibly and goes off, instead of ticking. */
export const BURST_COOLDOWN = 2;
/** How long (s) the burst's flash and wave last, and how many runes mark the rim. */
const BURST_FLARE = 0.5;
const RUNES = 6;

/**
 * Aura de Yah: warm light around the hero that beats with its damage. `k` is the tick phase (0 right at a tick,
 * 1 just before the next): each tick a wave runs out to exactly the damage radius and the rim lights up. Motes of
 * light drift up inside. Chama de Yah: a white-hot core, round flame tongues on the rim and rising embers, over a
 * very faint disc (its 150 px would cover the crowd).
 */
export function drawAura(
  g: Phaser.GameObjects.Graphics,
  top: Phaser.GameObjects.Graphics,
  world: World,
  r: number,
  k: number,
  elo: boolean,
  heat = 0,
  pulseR = 0,
  cooldown = 0,
): void {
  const p = world.player;
  const t = world.time;
  const c = elo ? FLAME_COLOR : AURA_COLOR;
  // Aura de Yah is a burst (a long cooldown): its light fills up until the runes on the rim are all lit, then it goes
  // off. Chama de Yah keeps its quick ticks.
  const burst = !elo && cooldown >= BURST_COOLDOWN;
  const since = k * cooldown;
  // Chama de Yah, the tick before its wave: a thin ring where the wave will reach, fading in (NF-08).
  if (pulseR > 0 && heat >= 1) {
    top.lineStyle(2, 0xffd080, 0.25 + 0.5 * k);
    ring(top, p.x, p.y, r * pulseR);
  }
  if (elo) {
    g.fillStyle(c, 0.06);
    disc(g, p.x, p.y, r);
  }
  // One soft glow at the heart (the wide pools it used to have cluttered the field).
  g.fillStyle(elo ? 0xfff0c0 : c, 0.12);
  disc(g, p.x, p.y, r * 0.3);
  // The rim flares on the tick and rests between ticks.
  const flare = burst ? Math.max(0, 1 - since / BURST_FLARE) : Math.max(0, 1 - k * 3);
  if (burst) {
    // The charge: a disc of light growing from the heart to the edge, and one rune per tip lighting up in turn.
    g.fillStyle(c, 0.04 + 0.14 * k);
    disc(g, p.x, p.y, r * k);
    g.lineStyle(2, 0xfff0c0, 0.12 + 0.4 * k);
    ring(g, p.x, p.y, r * k);
    for (let i = 0; i < RUNES; i++) {
      const lit = Math.min(1, Math.max(0, (k - 0.5 - i * 0.07) / 0.07));
      if (lit <= 0) continue;
      const a = (i * Math.PI * 2) / RUNES - Math.PI / 2;
      const rx = p.x + Math.cos(a) * r;
      const ry = p.y + Math.sin(a) * r;
      top.fillStyle(0xfff0c0, 0.25 * lit);
      disc(top, rx, ry, 9 * lit);
      star(top, rx, ry, 5 + 6 * lit, 0xfff0a0, Math.min(1, 0.5 + 0.5 * lit));
    }
  }
  // The pixel ring of light, turning, out at the exact edge of the aura.
  const halo = VFX.aura;
  fxSprites.putFrame(
    vfxKey('aura'),
    Math.floor(t * halo.fps) % halo.frames,
    halo.anchor[0],
    halo.anchor[1],
    p.x,
    p.y,
    r / AURA_RING,
    // It charges with the tick: dim right after a hit, slowly brighter, flaring on the next one.
    burst
      ? Math.min(1, 0.04 + 0.55 * k ** 2 + 0.45 * flare)
      : Math.min(1, 0.05 + 0.65 * k ** 2.5 + 0.35 * flare + 0.25 * heat),
  );
  if (elo) {
    g.lineStyle(2 + 2 * flare + 3 * heat, heat > 0.5 ? 0xffd080 : c, 0.35 + 0.55 * flare + 0.3 * heat);
    ring(g, p.x, p.y, r);
  }
  // The beat: a wave from the core out to the exact edge (over the crowd, thin, so it is seen but hides nothing).
  const beat = burst ? BURST_FLARE : 0.45;
  const beatAt = burst ? since / beat : k / beat;
  if (beatAt < 1) {
    const wk = beatAt;
    const wr = r * (0.3 + 0.7 * (1 - (1 - wk) ** 2));
    if (burst) {
      // The burst itself: the whole radius flashes and a thick wave runs out to the rim.
      g.fillStyle(0xfff0c0, 0.3 * (1 - wk));
      disc(g, p.x, p.y, wr);
    }
    top.lineStyle((burst ? 7 : 4) - (burst ? 6 : 3) * wk, elo ? 0xffc060 : 0xfff0a0, 0.8 * (1 - wk));
    ring(top, p.x, p.y, wr);
  }
  // Motes of light (embers for the Chama) drifting up inside the radius, more with each level.
  const motes = elo ? 5 : 2;
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
  // Ten real flames standing on the rim, taller as the wave comes near.
  const n = 10;
  const fl = VFX.flame;
  for (let i = 0; i < n; i++) {
    const a = (i * Math.PI * 2) / n + t * 0.4;
    fxSprites.putFrame(
      vfxKey('flame'),
      Math.floor(t * fl.fps + i * 3) % fl.frames,
      fl.anchor[0],
      fl.anchor[1],
      p.x + Math.cos(a) * r,
      p.y + Math.sin(a) * r + 6,
      0.7 + 0.15 * flare + 0.25 * heat,
    );
  }
}

/**
 * A patch of frost (Geada; Nevasca when it comes from the Elo). It lands with a ring opening out and shards flying;
 * every damage tick a ring of frost runs from the middle to the edge and the crystals pulse; at the end its rim
 * breaks into pieces. Nevasca adds falling snowflakes.
 */
export function drawZone(
  g: Phaser.GameObjects.Graphics,
  z: Zone,
  time: number,
  fillK: number,
  crowded: boolean,
): void {
  const elo = !!z.source && isElo(z.source.id);
  const age = z.duration - z.ttl;
  const fade = Math.min(1, z.ttl / ZONE_BREAK);
  const land = Math.min(1, age / ZONE_LAND);
  const r = z.radius * (1 - (1 - land) * (1 - land));
  const tk = 1 - z.tick / config.zones.tick; // 0 right at a tick
  g.fillStyle(elo ? BLIZZARD_COLOR : FROST_COLOR, 0.22 * fade * fillK);
  disc(g, z.x, z.y, r);
  // The rim: a ring of pixel blocks, thinning out as the patch melts away (thinner still when many overlap).
  const blocks = Math.max(10, Math.round(r / 3));
  g.fillStyle(elo ? BLIZZARD_EDGE : 0xffffff, (crowded ? 0.55 : 0.85) * fade);
  for (let i = 0; i < blocks; i++) {
    if (z.ttl <= ZONE_BREAK && hash(z.x, z.y, i) > fade) continue;
    const a = (i / blocks) * Math.PI * 2;
    g.fillRect(
      Math.round((z.x + Math.cos(a) * r) / 2) * 2 - 1,
      Math.round((z.y + Math.sin(a) * r) / 2) * 2 - 1,
      3,
      3,
    );
  }
  if (tk < 0.5) {
    // The tick: a ring of frost from the middle to the edge.
    const wk = tk / 0.5;
    g.lineStyle(3 - 2 * wk, 0xffffff, 0.7 * (1 - wk) * fade);
    ring(g, z.x, z.y, r * (0.25 + 0.75 * wk));
  }
  // Ice crystals standing in the patch: they rise, shimmer and melt over its whole life.
  const ice = VFX.ice;
  const n = elo ? 5 : 3;
  const life = age / z.duration;
  for (let i = 0; i < n; i++) {
    const ang = (i * Math.PI * 2) / n + z.x * 0.01;
    const f = Math.min(ice.frames - 1, Math.floor(Math.max(0, life - i * 0.03) * ice.frames));
    fxSprites.putFrame(
      vfxKey('ice'),
      f,
      ice.anchor[0],
      ice.anchor[1],
      z.x + Math.cos(ang) * r * 0.55,
      z.y + Math.sin(ang) * r * 0.4 + 8,
      (r / ICE_SPAN) * (elo ? 1.1 : 1),
      1,
      0,
      true,
    );
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
export function drawEmbers(
  g: Phaser.GameObjects.Graphics,
  z: Zone,
  time: number,
  fillK: number,
  fewFlames: boolean,
): void {
  const fade = Math.min(1, z.ttl / ZONE_BREAK);
  const r = z.radius;
  // Light fills: patches overlap a lot under a crowd, and stacked they must never hide who walks in them.
  g.fillStyle(0x3a1408, 0.18 * fade * fillK);
  disc(g, z.x, z.y, r);
  g.fillStyle(ELEMENT_COLOR.fire, 0.14 * fade * fillK);
  disc(g, z.x, z.y, r * 0.8);
  g.lineStyle(2, EMBER, 0.6 * fade);
  ring(g, z.x, z.y, r);
  // Real flames standing on the patch, each at its own point of the loop.
  const flame = VFX.flame;
  const n = Math.min(fewFlames ? 3 : 6, flames.left);
  flames.left -= n;
  for (let i = 0; i < n; i++) {
    const a = (i * Math.PI * 2) / n + z.y * 0.01;
    const d = r * (0.2 + 0.55 * ((i * 0.618) % 1));
    fxSprites.putFrame(
      vfxKey('flame'),
      Math.floor(time * flame.fps + i * 3) % flame.frames,
      flame.anchor[0],
      flame.anchor[1],
      z.x + Math.cos(a) * d,
      z.y + Math.sin(a) * d * 0.7,
      (r / EMBER_SPAN) * fade,
      1,
      0,
      true,
    );
  }
}

/** Flame sprites all burning patches may place in one frame (PB-01). */
export const FLAME_BUDGET = 36;

export const flames = { left: FLAME_BUDGET };

/** How many stacked patches' worth of fill the screen takes: past it, each patch's fill fades (NF-02). */
export const FROST_FILLS = 5;

export const EMBER_FILLS = 6;

/** Radius of Muralha de Valmor's guard around the hero (just outside the sprite and its light). */
export const WARD_R = 32;

/**
 * Muralha de Valmor's guard. Up: a silver bubble of six steel plates (ink outline, white glint running round) that
 * will take the next hit. Down: a thin arc filling back around the hero as it recharges, so the player sees when the
 * next block comes.
 */
export function drawWard(g: Phaser.GameObjects.Graphics, world: World): void {
  const p = world.player;
  const up = wardReady(world);
  if (!up) {
    for (let iW = 0; iW < world.weapons.length; iW++) {
      const w = world.weapons[iW] as (typeof world.weapons)[number];
      const ward = (WEAPONS[w.id] as WeaponDef).ward;
      if (!ward) continue;
      const k = 1 - Math.max(0, w.stackTime - world.time) / ward.every;
      const a0 = -Math.PI / 2;
      g.lineStyle(4, INK, 0.35);
      arcLine(g, p.x, p.y, WARD_R, a0, a0 + Math.PI * 2 * k);
      g.lineStyle(2, ELEMENT_COLOR.steel, 0.6);
      arcLine(g, p.x, p.y, WARD_R, a0, a0 + Math.PI * 2 * k);
      return;
    }
    return;
  }
  const t = world.time;
  const wr = WARD_R + Math.sin(t * 3) * 1.5;
  g.fillStyle(ELEMENT_COLOR.steel, 0.1);
  disc(g, p.x, p.y, wr);
  for (let i = 0; i < 6; i++) {
    const a = t * 0.8 + (i * Math.PI) / 3;
    g.lineStyle(6, INK, 0.7);
    arcLine(g, p.x, p.y, wr, a, a + Math.PI / 3 - 0.22);
    g.lineStyle(3.5, ELEMENT_COLOR.steel, 1);
    arcLine(g, p.x, p.y, wr, a, a + Math.PI / 3 - 0.22);
  }
  // A glint sliding round the plates, and a twinkle on top now and then: "polished, ready".
  const ga = -t * 2.2;
  g.lineStyle(2, 0xffffff, 0.9);
  arcLine(g, p.x, p.y, wr, ga, ga + 0.35);
  const tw = Math.max(0, Math.sin(t * 2.5)) ** 6;
  if (tw > 0.05) star(g, p.x + wr * 0.6, p.y - wr * 0.8, 3 + 5 * tw, 0xffffff, tw);
}

/**
 * The Lobo Velho's ice (FT-08), on the ground: while it forms, the danger colour filling from the centre with a
 * marching edge; formed, a frosted white-lilac patch with cracks and a faint cold rim, the exact size of the slow.
 */
export function drawIce(g: Phaser.GameObjects.Graphics, world: World): void {
  const list = world.marks.active;
  for (let i = 0; i < list.length; i++) {
    const m = list[i] as (typeof list)[number];
    if (m.kind !== 'ice') continue;
    const r = m.radius;
    if (m.ttl > 0) {
      const k = 1 - m.ttl / m.total; // 0 -> 1
      g.fillStyle(WARN_COLOR, 0.12);
      disc(g, m.x, m.y, r);
      g.fillStyle(ICE, 0.18 + 0.3 * k);
      disc(g, m.x, m.y, r * k);
      g.lineStyle(2.5, WARN_EDGE, 0.6 + 0.4 * k);
      glowArc(g, m.x, m.y, r, 0, Math.PI * 2, WARN_EDGE, 0.6 + 0.4 * k);
      continue;
    }
    g.fillStyle(ICE, 0.3);
    disc(g, m.x, m.y, r);
    g.fillStyle(0xffffff, 0.12);
    disc(g, m.x - r * 0.25, m.y - r * 0.25, r * 0.45);
    // Cracks: fixed by the patch's place, so they never crawl.
    g.lineStyle(1.5, 0x8a84a8, 0.6);
    for (let c = 0; c < 5; c++) {
      const a = c * 1.26 + (m.x + m.y) * 0.01;
      const l = r * (0.55 + 0.35 * (((c * 37 + Math.abs(m.y | 0)) % 7) / 7));
      const mx = m.x + Math.cos(a) * l * 0.5;
      const my = m.y + Math.sin(a) * l * 0.5;
      g.lineBetween(m.x, m.y, mx + Math.sin(a) * 4, my - Math.cos(a) * 4);
      g.lineBetween(mx + Math.sin(a) * 4, my - Math.cos(a) * 4, m.x + Math.cos(a) * l, m.y + Math.sin(a) * l);
    }
    const glow = 0.45 + 0.15 * Math.sin(world.time * 2 + m.x);
    g.lineStyle(2, ICE, glow);
    ring(g, m.x, m.y, r);
  }
}
