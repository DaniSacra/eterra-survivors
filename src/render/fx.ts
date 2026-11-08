import type Phaser from 'phaser';
import type { World } from '../core/world';
import { WEAPONS, type AuraLevel, type OrbitLevel } from '../data/weapons';
import { orbitAngle, weaponStats } from '../core/weapons';
import { config } from '../data/config';

const SLASH_COLOR = 0xe8f0ff;
const AURA_COLOR = 0xffc040;
const ORBIT_COLOR = 0xd8e4ff;
const FROST_COLOR = 0x9ad8ff;
const BOLT_COLOR = 0xfff6a0;

/** Redraws the transient shapes (slashes, auras, orbiting swords, frost, bolts) into one Graphics each frame. */
export function drawFx(g: Phaser.GameObjects.Graphics, world: World): void {
  g.clear();
  const p = world.player;
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
      g.fillStyle(ORBIT_COLOR, 0.9).lineStyle(2, 0x4a5268, 1);
      for (let i = 0; i < count; i++) {
        const a = orbitAngle(world.time, s.spin, i, count);
        const x = p.x + Math.cos(a) * orbitR;
        const y = p.y + Math.sin(a) * orbitR;
        g.fillCircle(x, y, r * 0.6).strokeCircle(x, y, r * 0.6);
        g.lineBetween(x, y, x + Math.cos(a + Math.PI / 2) * r * 1.4, y + Math.sin(a + Math.PI / 2) * r * 1.4);
      }
    }
  }
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
