import { PASSIVE_IDS, type PassiveId } from '../data/upgrades';
import type { WeaponId } from '../data/weapons';
import type { World } from './world';

export interface WeaponReport {
  id: WeaponId;
  level: number;
  damage: number;
  /** Seconds the weapon was owned. */
  time: number;
  dps: number;
}

/** Per-weapon results of a run, in the order they were picked up (evolved weapons under their new id). */
export function weaponReport(world: World): WeaponReport[] {
  return world.weapons.map((w) => {
    const time = Math.max(0, world.time - w.since);
    return { id: w.id, level: w.level, damage: w.damage, time, dps: time > 0 ? w.damage / time : 0 };
  });
}

/** Passives taken this run with their levels, in data order. */
export function passiveReport(world: World): { id: PassiveId; level: number }[] {
  return PASSIVE_IDS.filter((id) => (world.passives[id] ?? 0) > 0).map((id) => ({
    id,
    level: world.passives[id] as number,
  }));
}
