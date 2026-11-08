import type Phaser from 'phaser';
import type { World } from '../core/world';
import { WEAPONS } from '../data/weapons';
import { weaponStats } from '../core/weapons';
import { config } from '../data/config';

const SLASH_COLOR = 0xe8f0ff;
const AURA_COLOR = 0xffc040;

/** Redraws the transient shapes (sword slashes, auras) into one Graphics object each frame. */
export function drawFx(g: Phaser.GameObjects.Graphics, world: World): void {
  g.clear();
  const p = world.player;
  for (const w of world.weapons) {
    if (WEAPONS[w.id].kind !== 'aura') continue;
    const r = (weaponStats(w) as { radius: number }).radius * p.stats.area;
    const pulse = 0.12 + 0.05 * Math.sin(world.time * 6);
    g.fillStyle(AURA_COLOR, pulse).fillCircle(p.x, p.y, r);
    g.lineStyle(2, AURA_COLOR, 0.5).strokeCircle(p.x, p.y, r);
  }
  for (const s of world.slashes.active) {
    const t = s.ttl / config.effects.slashTtl;
    g.fillStyle(SLASH_COLOR, 0.55 * t);
    g.slice(p.x, p.y, s.range, s.angle - s.arc / 2, s.angle + s.arc / 2, false);
    g.fillPath();
  }
}
