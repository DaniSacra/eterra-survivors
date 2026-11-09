import { config } from '../data/config';
import { addPuff } from './effects';
import type { Poolable } from './pool';
import type { World } from './world';

export interface Gem extends Poolable {
  x: number;
  y: number;
  value: number;
  /** Once caught by the magnet, a gem flies to the player until collected. */
  pulled: boolean;
}

export const createGem = (): Gem => ({ poolIndex: -1, x: 0, y: 0, value: 0, pulled: false });

export const xpToNext = (level: number): number => config.xp.base + config.xp.step * (level - 1);

/** Drops a gem, or merges it into the nearest one when the ground is already full. */
export function dropGem(world: World, x: number, y: number, value: number): void {
  const gems = world.gems;
  if (gems.size >= config.gems.maxActive) {
    let best = gems.active[0] as Gem;
    let bestSq = Infinity;
    for (let i = 0; i < gems.active.length; i++) {
      const g = gems.active[i] as Gem;
      const dSq = (g.x - x) ** 2 + (g.y - y) ** 2;
      if (dSq < bestSq) {
        bestSq = dSq;
        best = g;
      }
    }
    best.value += value;
    return;
  }
  const g = gems.acquire();
  g.x = x;
  g.y = y;
  g.value = value;
  g.pulled = false;
}

export function addXp(world: World, amount: number): void {
  world.xp += amount;
  let need = xpToNext(world.level);
  while (world.xp >= need) {
    world.xp -= need;
    world.level++;
    world.pendingLevelUps++;
    need = xpToNext(world.level);
  }
}

/** Pedra-Ímã: every gem on the ground starts flying to the player. */
export function pullAllGems(world: World): void {
  const list = world.gems.active;
  for (let i = 0; i < list.length; i++) (list[i] as Gem).pulled = true;
}

export function updateGems(world: World, dt: number): void {
  const p = world.player;
  const magnetSq = p.stats.magnet * p.stats.magnet;
  const pickupSq = config.player.pickupRadius ** 2;
  const step = config.gems.pullSpeed * dt;
  const list = world.gems.active;
  for (let i = list.length - 1; i >= 0; i--) {
    const g = list[i] as Gem;
    const dx = p.x - g.x;
    const dy = p.y - g.y;
    const dSq = dx * dx + dy * dy;
    if (dSq <= pickupSq) {
      addPuff(world, p.x, p.y, 6, 'gem');
      world.tally.gems++;
      addXp(world, g.value * p.stats.growth);
      world.gems.release(g);
      continue;
    }
    if (!g.pulled && dSq <= magnetSq) g.pulled = true;
    if (g.pulled) {
      const d = Math.sqrt(dSq);
      const move = Math.min(step, d);
      g.x += (dx / d) * move;
      g.y += (dy / d) * move;
    }
  }
}
