import { applyUpgrade } from '../../src/core/upgrades';
import { maxLevel } from '../../src/core/weapons';
import { PASSIVES } from '../../src/data/upgrades';
import { World } from '../../src/core/world';
import { config } from '../../src/data/config';

/** A world whose spawner never fires, so tests control every enemy. Stats are the plain defaults (no hero bonus). */
export function quietWorld(seed = 1): World {
  const w = new World(seed);
  w.spawner.update = () => {};
  Object.assign(w.player.stats, config.player.stats);
  w.player.hp = w.player.stats.maxHp;
  return w;
}

/** A quiet world without the starting weapon. */
export function bareWorld(seed = 1): World {
  const w = quietWorld(seed);
  w.weapons.length = 0;
  return w;
}

export const still = { x: 0, y: 0 };

/** Forms Aldo's Fúria the way a run does: the last blade level taken with Força already at max. */
export function forgeFury(w: World): void {
  const blade = w.weapons.find((o) => o.id === 'blade');
  if (!blade) throw new Error('aldo starts with the blade');
  blade.level = maxLevel('blade') - 1;
  w.passives.might = PASSIVES.might.maxLevel;
  applyUpgrade(w, { kind: 'weapon', id: 'blade', level: maxLevel('blade') });
}
