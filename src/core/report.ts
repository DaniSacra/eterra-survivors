import { evolutionOf } from '../data/evolutions';
import { PASSIVE_IDS, type PassiveId } from '../data/upgrades';
import type { WeaponId } from '../data/weapons';
import { eloReady } from './upgrades';
import { levelDps, maxLevel } from './weapons';
import type { World } from './world';

export interface WeaponReport {
  id: WeaponId;
  level: number;
  damage: number;
  /** Seconds the weapon was owned. */
  time: number;
  dps: number;
  /** Damage per second at the current level only, and during the level before it (an Elo: its base at max). */
  levelDps: number;
  prevDps: number;
  /** Seconds at the current level. */
  levelTime: number;
}

/** Per-weapon results of a run, in the order they were picked up (evolved weapons under their new id). */
export function weaponReport(world: World): WeaponReport[] {
  return world.weapons.map((w) => {
    const time = Math.max(0, world.time - w.since);
    return {
      id: w.id,
      level: w.level,
      damage: w.damage,
      time,
      dps: time > 0 ? w.damage / time : 0,
      levelDps: levelDps(w, world.time),
      prevDps: w.prevDps,
      levelTime: world.time - w.levelAt,
    };
  });
}

/** Passives taken this run with their levels, in data order. */
export function passiveReport(world: World): { id: PassiveId; level: number }[] {
  return PASSIVE_IDS.filter((id) => (world.passives[id] ?? 0) > 0).map((id) => ({
    id,
    level: world.passives[id] as number,
  }));
}

/**
 * The Elo the run came closest to, for the end screen's "faltou pouco": a recipe complete and only the chest
 * missing (`chest`), else a weapon one level short of max with its passive owned (`level`). Null otherwise.
 */
export function almostElo(world: World): { kind: 'chest' | 'level'; weapon: WeaponId; elo: WeaponId } | null {
  for (const o of world.weapons) {
    const evo = evolutionOf(o.id);
    if (evo && eloReady(world, o.id)) return { kind: 'chest', weapon: o.id, elo: evo.id };
  }
  for (const o of world.weapons) {
    const evo = evolutionOf(o.id);
    if (evo && o.level === maxLevel(o.id) - 1 && (world.passives[evo.evo.passive] ?? 0) > 0)
      return { kind: 'level', weapon: o.id, elo: evo.id };
  }
  return null;
}
