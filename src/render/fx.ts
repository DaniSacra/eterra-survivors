import type Phaser from 'phaser';
import type { World } from '../core/world';
import { WEAPONS, type AuraLevel, type OrbitLevel, type WeaponId } from '../data/weapons';
import { orbitAngle, weaponStats } from '../core/weapons';
import { config } from '../data/config';
import { INK } from './art/pen';
import type { CharacterId } from '../data/characters';

/** Identity color of each hero, for the light under their feet (so the eye finds them in a crowd). */
const HERO_COLOR: Record<CharacterId, number> = {
  aldo: 0xe8b840,
  lyra: 0xa84ad8,
  teo: 0x4ad08a,
  andilla: 0xe86a7a,
};
const SLASH_COLOR = 0xe8f0ff;
const AURA_COLOR = 0xffc040;
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
const BOLT_COLOR = 0xfff6a0;

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
  g.fillStyle(hero, 0.22).fillEllipse(p.x, p.y + 15, 40, 14);
  g.lineStyle(2, hero, 0.7).strokeEllipse(p.x, p.y + 15, 40, 14);
  for (const z of world.zones.active) {
    const a = Math.min(1, z.ttl / 0.4) * 0.3;
    g.fillStyle(FROST_COLOR, a).fillCircle(z.x, z.y, z.radius);
    g.lineStyle(2, 0xffffff, a * 1.5).strokeCircle(z.x, z.y, z.radius);
  }
  for (const w of world.weapons) {
    const kind = WEAPONS[w.id].kind;
    if (kind === 'aura') {
      const r = (weaponStats(w) as AuraLevel).radius * p.stats.area;
      const pulse = 0.12 + 0.05 * Math.sin(world.time * 6);
      g.fillStyle(AURA_COLOR, pulse).fillCircle(p.x, p.y, r);
      g.lineStyle(2, AURA_COLOR, 0.5).strokeCircle(p.x, p.y, r);
    } else if (kind === 'orbit') {
      const s = weaponStats(w) as OrbitLevel;
      const count = s.count + p.stats.amount;
      const orbitR = s.orbitRadius * p.stats.area;
      const r = s.radius * p.stats.area;
      const style = ORBIT_STYLE[w.id] ?? SWORDS;
      for (let i = 0; i < count; i++) {
        const a = orbitAngle(world.time, s.spin, i, count);
        const x = p.x + Math.cos(a) * orbitR;
        const y = p.y + Math.sin(a) * orbitR;
        if (style.blade) drawSword(top, x, y, a + Math.PI / 2, r, style);
        else drawBell(top, x, y, r, style);
      }
    }
  }
  g = top;
  for (const s of world.slashes.active) {
    const t = s.ttl / config.effects.slashTtl;
    g.fillStyle(SLASH_COLOR, 0.55 * t);
    g.slice(p.x, p.y, s.range, s.angle - s.arc / 2, s.angle + s.arc / 2, false);
    g.fillPath();
  }
  for (const b of world.bolts.active) {
    const t = b.ttl / config.effects.boltTtl;
    g.lineStyle(4, BOLT_COLOR, t).lineBetween(b.x, b.y - 260, b.x + 8, b.y - 120);
    g.lineBetween(b.x + 8, b.y - 120, b.x - 6, b.y);
    g.fillStyle(BOLT_COLOR, 0.4 * t).fillCircle(b.x, b.y, b.radius);
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
