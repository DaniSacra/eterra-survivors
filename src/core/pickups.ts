import { config } from '../data/config';
import type { PickupId } from '../data/pickups';
import type { Poolable } from './pool';
import { applyUpgrade, chestReward } from './upgrades';
import type { World } from './world';

export interface Pickup extends Poolable {
  type: PickupId;
  x: number;
  y: number;
}

export const createPickup = (): Pickup => ({ poolIndex: -1, type: 'chest', x: 0, y: 0 });

export function dropPickup(world: World, type: PickupId, x: number, y: number): void {
  const it = world.pickups.acquire();
  it.type = type;
  it.x = x;
  it.y = y;
}

/** What each pickup does when collected. */
const COLLECT: Record<PickupId, (world: World) => void> = {
  chest(world) {
    const reward = chestReward(world);
    applyUpgrade(world, reward);
    world.events.push({ type: 'chest', reward });
  },
};

export function updatePickups(world: World): void {
  const p = world.player;
  const reachSq = (config.player.radius + config.pickups.radius) ** 2;
  const list = world.pickups.active;
  for (let i = list.length - 1; i >= 0; i--) {
    const it = list[i] as Pickup;
    if ((it.x - p.x) ** 2 + (it.y - p.y) ** 2 > reachSq) continue;
    COLLECT[it.type](world);
    world.pickups.release(it);
  }
}
