import { evolutionOf } from '../data/evolutions';
import { PASSIVE_IDS, type PassiveId } from '../data/upgrades';
import type { WeaponId } from '../data/weapons';
import { HURT_SOURCES, type HurtSource } from './enemyShots';
import { eloStatus } from './upgrades';
import { levelDps } from './weapons';
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

/**
 * What each weapon's damage bar is drawn against (the end screen and the pause use the same numbers): the best DPS
 * (that weapon is gold) and the most damage (a bar's full length).
 */
export function reportExtent(rows: readonly WeaponReport[]): { best: number; most: number } {
  return { best: Math.max(0, ...rows.map((r) => r.dps)), most: Math.max(1, ...rows.map((r) => r.damage)) };
}

/** Passives taken this run with their levels, in data order. */
export function passiveReport(world: World): { id: PassiveId; level: number }[] {
  return PASSIVE_IDS.filter((id) => (world.passives[id] ?? 0) > 0).map((id) => ({
    id,
    level: world.passives[id] as number,
  }));
}

/**
 * The Elo the run came closest to, for the end screen's "faltou pouco": a recipe one level short, of the weapon or
 * of its passive. Null otherwise.
 */
export function almostElo(
  world: World,
): { weapon: WeaponId; elo: WeaponId; missing: 'weapon' | 'passive'; passive: PassiveId } | null {
  for (const o of world.weapons) {
    const st = eloStatus(world, o.id);
    if (st.kind !== 'missing') continue;
    const short = st.weaponMax - st.weapon + (st.passiveMax - st.passiveLevel);
    if (short !== 1) continue;
    const evo = evolutionOf(o.id) as { id: WeaponId; evo: { passive: PassiveId } };
    const missing = st.weapon < st.weaponMax ? 'weapon' : 'passive';
    return { weapon: o.id, elo: evo.id, missing, passive: evo.evo.passive };
  }
  return null;
}

/**
 * Where the damage the hero took came from, largest first, as whole percentages (sources that did nothing are left
 * out). `max` keeps the top few; the shown shares may then add to less than 100. Empty when nothing hurt the hero.
 */
export function hurtShare(
  hurtBy: Record<HurtSource, number>,
  max = 3,
): { source: HurtSource; percent: number }[] {
  const total = HURT_SOURCES.reduce((n, k) => n + hurtBy[k], 0);
  if (total <= 0) return [];
  return HURT_SOURCES.filter((k) => hurtBy[k] > 0)
    .sort((a, b) => hurtBy[b] - hurtBy[a])
    .slice(0, max)
    .map((source) => ({ source, percent: Math.max(1, Math.round((hurtBy[source] / total) * 100)) }));
}
