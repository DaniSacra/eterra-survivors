import type Phaser from 'phaser';
import type { World } from '../core/world';
import { WEAPONS, type AuraLevel, type OrbitLevel, type WeaponId } from '../data/weapons';
import { isElo, orbitAngle, weaponStats } from '../core/weapons';
import { config } from '../data/config';
import { BossAct } from '../core/bosses';
import type { Enemy } from '../core/enemies';
import { INK } from './art/pen';
import type { CharacterId } from '../data/characters';

/** Identity color of each hero, for the light under their feet (so the eye finds them in a crowd). */
export const HERO_COLOR: Record<CharacterId, number> = {
  aldo: 0xe8b840,
  lyra: 0xa84ad8,
  teo: 0x4ad08a,
  andilla: 0xe86a7a,
};
const SLASH_COLOR = 0xe8f0ff;
const SLASH_EDGE = 0x9ad8ff;
/** Elos get warmer, brighter versions of their base colors. */
const FURY_COLOR = 0xffe8a0;
const FURY_EDGE = 0xffa040;
const AURA_COLOR = 0xffc040;
const FLAME_COLOR = 0xff6a3a;
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
const BOLT_COLOR = 0xfff6a0;
const STORM_COLOR = 0xd8b8ff;
const PUFF_COLOR = 0xe8eef8;
const GEM_GLINT = 0x9be35a;
const ITEM_GLINT = 0xffd870;
const HP_OK = 0x7cd860;
const HP_LOW = 0xd83a4a;
/** Tints of enemies: hit, frozen by Sopro de Geada, slowed by frost. And the hero's flash when hurt. */
export const TINT = {
  hit: 0xff7070,
  frozen: 0x80c8ff,
  slowed: 0xb8e0ff,
  heroHurt: 0xff4050,
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
/** Boss attack markers: a warm, friendly warning (not a dark one) that fills up as the hit comes. */
const WARN_COLOR = 0xff8a4a;
const WARN_EDGE = 0xffe0a0;

/**
 * Redraws the transient shapes each frame: on the ground (under everyone) the hero light, frost and auras;
 * on top (over the enemies) orbiting pieces, slashes and bolts, so they never vanish in a crowd.
 */
export function drawFx(
  ground: Phaser.GameObjects.Graphics,
  top: Phaser.GameObjects.Graphics,
  world: World,
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
  if (world.boss) drawBossWarning(g, top, world.boss);
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
      const r = (weaponStats(w) as AuraLevel).radius * p.stats.area;
      const pulse = 0.12 + 0.05 * Math.sin(world.time * 6);
      const elo = isElo(w.id);
      const c = elo ? FLAME_COLOR : AURA_COLOR;
      g.fillStyle(c, pulse + (elo ? 0.05 : 0)).fillCircle(p.x, p.y, r);
      g.lineStyle(elo ? 3 : 2, c, 0.6).strokeCircle(p.x, p.y, r);
      if (elo) {
        // Chama de Yah: flame tongues dancing on the rim.
        for (let i = 0; i < 12; i++) {
          const a = (i * Math.PI) / 6 + world.time * 0.6;
          const h = 10 + 6 * Math.sin(world.time * 9 + i * 1.7);
          const bx = p.x + Math.cos(a) * r;
          const by = p.y + Math.sin(a) * r;
          g.fillStyle(i % 2 ? AURA_COLOR : FLAME_COLOR, 0.7).fillTriangle(
            bx + Math.cos(a + 1.57) * 5,
            by + Math.sin(a + 1.57) * 5,
            bx - Math.cos(a + 1.57) * 5,
            by - Math.sin(a + 1.57) * 5,
            bx + Math.cos(a) * h,
            by + Math.sin(a) * h,
          );
        }
      }
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
  for (const f of world.puffs.active) {
    const k = f.ttl / config.effects.puffTtl; // 1 -> 0
    const r = f.r * (1.6 - k * 0.8);
    if (f.kind === 'death') {
      g.fillStyle(PUFF_COLOR, 0.55 * k).fillCircle(f.x, f.y, r);
      g.fillStyle(0xffffff, 0.5 * k).fillCircle(f.x - r * 0.3, f.y - r * 0.3, r * 0.35);
    } else {
      const c = f.kind === 'gem' ? GEM_GLINT : ITEM_GLINT;
      g.lineStyle(2, c, k).strokeCircle(f.x, f.y, r);
    }
  }
  for (const s of world.slashes.active) {
    // A sweeping blade: a wide soft band, a bright band near the edge and a crisp edge line, trailing off.
    const t = s.ttl / config.effects.slashTtl;
    const a0 = s.angle - s.arc / 2;
    const a1 = s.angle + s.arc / 2;
    const fill = s.elo ? FURY_COLOR : SLASH_COLOR;
    const edge = s.elo ? FURY_EDGE : SLASH_EDGE;
    g.fillStyle(edge, 0.25 * t)
      .slice(p.x, p.y, s.range, a0, a1, false)
      .fillPath();
    g.fillStyle(fill, 0.6 * t)
      .slice(p.x, p.y, s.range, a0, a1, false)
      .fillPath();
    g.fillStyle(edge, 0.3 * t)
      .slice(p.x, p.y, s.range * 0.6, a0, a1, false)
      .fillPath();
    g.lineStyle(3, 0xffffff, 0.9 * t)
      .beginPath()
      .arc(p.x, p.y, s.range, a0, a1)
      .strokePath();
    g.lineStyle(2, edge, 0.8 * t)
      .beginPath()
      .arc(p.x, p.y, s.range + 3, a0, a1)
      .strokePath();
  }
  for (const b of world.bolts.active) {
    const t = b.ttl / config.effects.boltTtl;
    const c = b.elo ? STORM_COLOR : BOLT_COLOR;
    const w = b.elo ? 7 : 5;
    // Ink, then color, then a white core: a cartoon lightning bolt.
    for (let i = 0; i < BOLT_LAYERS.length; i++) {
      const L = BOLT_LAYERS[i] as readonly [number, number, number];
      g.lineStyle(w * L[0], L[1] === -1 ? c : L[1], L[2] * t);
      g.lineBetween(b.x, b.y - 260, b.x + 8, b.y - 120);
      g.lineBetween(b.x + 8, b.y - 120, b.x - 6, b.y);
    }
    g.fillStyle(c, 0.4 * t).fillCircle(b.x, b.y, b.radius);
    g.lineStyle(2, 0xffffff, 0.8 * t).strokeCircle(b.x, b.y, b.radius * (1.2 - t * 0.2));
  }
}

/** The telegraph of a boss ability: where it will hit, filling up during the windup. */
function drawBossWarning(g: Phaser.GameObjects.Graphics, top: Phaser.GameObjects.Graphics, e: Enemy): void {
  const ab = e.def.ability;
  if (!ab || e.act === BossAct.Idle) return;
  const aim = Math.atan2(e.aimY, e.aimX);
  if (e.act === BossAct.Active) {
    // The cleave landing: a quick white slash over everything.
    if (ab.kind === 'cleave') {
      const half = (ab.arc ?? 1) / 2;
      top
        .fillStyle(SLASH_COLOR, 0.6)
        .slice(e.x, e.y, ab.range, aim - half, aim + half, false)
        .fillPath();
    }
    return;
  }
  const k = 1 - Math.max(0, e.actT) / ab.windup; // 0 -> 1 as the hit comes
  const fill = 0.12 + 0.28 * k;
  g.lineStyle(3, WARN_EDGE, 0.5 + 0.5 * k).fillStyle(WARN_COLOR, fill);
  switch (ab.kind) {
    case 'cleave': {
      const half = (ab.arc ?? 1) / 2;
      g.slice(e.x, e.y, ab.range, aim - half, aim + half, false)
        .fillPath()
        .strokePath();
      // An inner slice grows to the edge: when it touches, the sword falls.
      g.fillStyle(WARN_COLOR, 0.35)
        .slice(e.x, e.y, ab.range * k, aim - half, aim + half, false)
        .fillPath();
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
      g.beginPath();
      g.moveTo(e.x + vx, e.y + vy);
      g.lineTo(ex + vx, ey + vy);
      g.lineTo(ex - vx, ey - vy);
      g.lineTo(e.x - vx, e.y - vy);
      g.closePath();
      g.fillPath().strokePath();
      g.fillStyle(WARN_COLOR, 0.35).fillCircle(e.x + ux * len * k, e.y + uy * len * k, w * 0.35);
      break;
    }
    case 'toll': {
      // Rings ripple out from the bell; small marks show where the dead will rise.
      g.strokeCircle(e.x, e.y, ab.range * (0.4 + 0.6 * k));
      const n = ab.count ?? 6;
      for (let i = 0; i < n; i++) {
        const a = (i * Math.PI * 2) / n;
        g.fillCircle(e.x + Math.cos(a) * ab.range, e.y + Math.sin(a) * ab.range, 6 + 6 * k);
      }
      break;
    }
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
