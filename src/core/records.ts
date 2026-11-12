import type { CharacterId } from '../data/characters';
import { ENEMY_IDS, type EnemyId } from '../data/enemies';
import { EVOLUTIONS } from '../data/evolutions';
import type { StageId } from '../data/stages';
import { WEAPON_IDS, type WeaponId } from '../data/weapons';
import { isElo, maxLevel } from './weapons';
import type { HeroRecord } from './meta';
import type { World } from './world';

/** Everything the save needs from one finished (or live) run. Built from World, no per-frame cost. */
export interface RunSummary {
  hero: CharacterId;
  stage: StageId;
  won: boolean;
  /** The hero fell (quitting from the Pausa is not a defeat, CU-08). */
  lost: boolean;
  time: number;
  level: number;
  kills: number;
  gold: number;
  /** Sum of every weapon's damage. */
  damage: number;
  /** Biggest single weapon hit. */
  bestHit: number;
  /** Seconds before the first hit taken (the run time if never hit). */
  untouched: number;
  /** Hero HP fraction at the end. */
  hpLeft: number;
  /** Base weapons owned (an Elo counts as its base), for favourite weapon and "Conhece o Ofício". */
  weapons: WeaponId[];
  elos: WeaponId[];
  /** Seconds survived in the Noite Sem Fim (0 if the run never went on after the boss). */
  vigil: number;
  /** Weapons at max level at the end (an Elo counts). */
  maxed: number;
  killsBy: Partial<Record<EnemyId, number>>;
  seen: EnemyId[];
}

export const newRunSummary = (): RunSummary => ({
  hero: 'aldo',
  stage: 'valmor',
  won: false,
  lost: false,
  time: 0,
  level: 1,
  kills: 0,
  gold: 0,
  damage: 0,
  bestHit: 0,
  untouched: 0,
  hpLeft: 1,
  weapons: [],
  elos: [],
  vigil: 0,
  maxed: 0,
  killsBy: {},
  seen: [],
});

/**
 * Summarises a run. Pass `out` to refill the same object (the live check once a second); its lists are reused.
 * `killsBy` is a copy, so the summary stays valid after the world goes on (a reused one may hold zeros).
 */
export function summarizeRun(world: World, out: RunSummary = newRunSummary()): RunSummary {
  const p = world.player;
  out.hero = world.character;
  out.stage = world.stageId;
  // The Noite Sem Fim comes after a victory: it ends with the hero falling, but the run was won.
  out.won = world.state === 'won' || world.endless;
  out.lost = world.state === 'lost' && !world.abandoned;
  out.vigil = world.vigilTime;
  out.time = world.time;
  out.level = world.level;
  out.kills = world.kills;
  out.gold = world.gold;
  out.bestHit = world.bestHit;
  out.untouched = world.firstHitAt < 0 ? world.time : world.firstHitAt;
  out.hpLeft = p.stats.maxHp > 0 ? Math.max(0, Math.min(1, p.hp / p.stats.maxHp)) : 0;
  out.damage = 0;
  out.maxed = 0;
  out.weapons.length = 0;
  out.elos.length = 0;
  for (const w of world.weapons) {
    out.damage += w.damage;
    if (w.level >= maxLevel(w.id)) out.maxed++;
    if (isElo(w.id)) out.elos.push(w.id);
    out.weapons.push(EVOLUTIONS[w.id]?.from ?? w.id);
  }
  out.seen.length = 0;
  for (const id of ENEMY_IDS) {
    if (world.seen[id]) out.seen.push(id);
    // A reused summary keeps its keys (0 when the new run has none of that type).
    const k = world.killsBy[id] ?? 0;
    if (k > 0 || id in out.killsBy) out.killsBy[id] = k;
  }
  return out;
}

/** A hero's favourite weapon: the one held in most runs (ties by `WEAPON_IDS` order); null before any run. */
export function favoriteWeapon(rec: HeroRecord): WeaponId | null {
  let best: WeaponId | null = null;
  let most = 0;
  for (const id of WEAPON_IDS) {
    const n = rec.weaponRuns[id] ?? 0;
    if (n > most) {
      most = n;
      best = id;
    }
  }
  return best;
}

/**
 * What a run still has to record when it ends (death, victory or quitting): a Noite Sem Fim records what the vigil
 * brought on top of the victory already banked; a plain run records itself. Each once (`null` once done).
 */
export function bankOnEnd(endless: boolean, banked: boolean, vigilBanked: boolean): 'run' | 'vigil' | null {
  if (endless) return vigilBanked ? null : 'vigil';
  return banked ? null : 'run';
}
