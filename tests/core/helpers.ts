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
