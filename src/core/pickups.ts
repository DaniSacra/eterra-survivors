import { config } from '../data/config';
import { RANDOM_DROPS, type PickupId } from '../data/pickups';
import { damageEnemy, type Enemy } from './enemies';
import type { Poolable } from './pool';
import { applyUpgrade, chestReward } from './upgrades';
import type { World } from './world';
import { pullAllGems } from './xp';

export interface Pickup extends Poolable {
  type: PickupId;
  x: number;
  y: number;
}

export const createPickup = (): Pickup => ({ poolIndex: -1, type: 'chest', x: 0, y: 0 });

export function dropPickup(world: World, type: PickupId, x: number, y: number): void {
  // Chests always drop; other items only while there is room.
  if (type !== 'chest' && world.pickups.size >= config.pickups.maxActive) return;
  const it = world.pickups.acquire();
  it.type = type;
  it.x = x;
  it.y = y;
}

/** A normal enemy's death may leave a random floor item. */
export function maybeDropRandom(world: World, x: number, y: number): void {
  if (world.rng.next() < config.pickups.dropChance)
    dropPickup(world, world.rng.weighted(RANDOM_DROPS).id, x, y);
}

/** What each pickup does when collected. */
const COLLECT: Record<PickupId, (world: World) => void> = {
  chest(world) {
    const reward = chestReward(world);
    applyUpgrade(world, reward);
    world.events.push({ type: 'chest', reward });
  },
  food(world) {
    const p = world.player;
    p.hp = Math.min(p.stats.maxHp, p.hp + config.pickups.foodHeal);
  },
  magnet: pullAllGems,
  bomb(world) {
    const p = world.player;
    const hw = world.view.w / 2;
    const hh = world.view.h / 2;
    for (const e of world.enemies.active as Enemy[]) {
      if (Math.abs(e.x - p.x) <= hw && Math.abs(e.y - p.y) <= hh)
        damageEnemy(world, e, config.pickups.bombDamage);
    }
  },
  freeze(world) {
    world.freeze = config.pickups.freezeTime;
  },
};

/** One preallocated event per pickup type, so collecting never allocates. */
const PICKED = Object.fromEntries(
  (Object.keys(COLLECT) as PickupId[]).map((id) => [id, { type: 'pickup', id } as const]),
) as Record<PickupId, { type: 'pickup'; id: PickupId }>;

export function updatePickups(world: World): void {
  const p = world.player;
  const reachSq = (config.player.radius + config.pickups.radius) ** 2;
  const list = world.pickups.active;
  for (let i = list.length - 1; i >= 0; i--) {
    const it = list[i] as Pickup;
    if ((it.x - p.x) ** 2 + (it.y - p.y) ** 2 > reachSq) continue;
    COLLECT[it.type](world);
    world.events.push(PICKED[it.type]);
    world.pickups.release(it);
  }
}
