import { World } from '../../src/core/world';

/** A world whose spawner never fires, so tests control every enemy. */
export function quietWorld(seed = 1): World {
  const w = new World(seed);
  w.spawner.update = () => {};
  return w;
}

/** A quiet world without the starting weapon. */
export function bareWorld(seed = 1): World {
  const w = quietWorld(seed);
  w.weapons.length = 0;
  return w;
}

export const still = { x: 0, y: 0 };
