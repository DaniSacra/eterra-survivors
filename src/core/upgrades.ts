import { SIGNATURE_OWNER } from '../data/characters';
import { config, type StatKey } from '../data/config';
import { EVOLUTIONS, EVOLVED_IDS, evolutionOf } from '../data/evolutions';
import { PASSIVES, PASSIVE_IDS, type PassiveId } from '../data/upgrades';
import { REWARDS, REWARD_IDS, type RewardDef, type RewardId } from '../data/rewards';
import { addGold } from './pickups';
import { WEAPONS, WEAPON_IDS, type WeaponId } from '../data/weapons';
import { isElo, markLevel, maxLevel } from './weapons';
import type { World } from './world';

/** `level` is the level the thing will have after picking (1 = new weapon). */
export type UpgradeOption =
  | { kind: 'weapon'; id: WeaponId; level: number }
  | { kind: 'passive'; id: PassiveId; level: number }
  /** Only from chests: `from` turns into `id`. */
  | { kind: 'evolution'; id: WeaponId; from: WeaponId }
  /** Fills the choice when weapons and passives run short (data/rewards.ts). */
  | { kind: 'reward'; id: RewardId }
  /** The last resort, never banished: only if even the rewards were all banished. */
  | { kind: 'heal' };

/** Identifies a weapon or passive for banishing (null for things that can't be banished). */
export function banishKey(opt: UpgradeOption): string | null {
  return opt.kind === 'weapon' || opt.kind === 'passive' || opt.kind === 'reward'
    ? `${opt.kind}:${opt.id}`
    : null;
}

/** Reward cards not banished this run. */
function rewards(world: World): UpgradeOption[] {
  const out: UpgradeOption[] = [];
  for (const id of REWARD_IDS) {
    const opt: UpgradeOption = { kind: 'reward', id };
    if (!world.banished.has(banishKey(opt) as string)) out.push(opt);
  }
  return out;
}

/** Every option currently available. Evolved weapons never appear, nor bases already evolved. */
export function candidates(world: World, newThings = true): UpgradeOption[] {
  const out: UpgradeOption[] = [];
  const canAddWeapon = newThings && world.weapons.length < config.weapons.maxOwned;
  for (const id of WEAPON_IDS) {
    if (isElo(id)) continue;
    const owner = SIGNATURE_OWNER[id];
    if (owner && owner !== world.character) continue; // another hero's signature weapon
    const owned = world.weapons.find((w) => w.id === id);
    const evolved = evolutionOf(id);
    if (owned && owned.level < maxLevel(id)) out.push({ kind: 'weapon', id, level: owned.level + 1 });
    else if (!owned && canAddWeapon && !(evolved && world.hasWeapon(evolved.id)))
      out.push({ kind: 'weapon', id, level: 1 });
  }
  const canAddPassive = newThings && Object.keys(world.passives).length < config.weapons.maxPassives;
  for (const id of PASSIVE_IDS) {
    const level = world.passives[id] ?? 0;
    if (level < PASSIVES[id].maxLevel && (canAddPassive || level > 0))
      out.push({ kind: 'passive', id, level: level + 1 });
  }
  return world.banished.size > 0 ? out.filter((o) => !world.banished.has(banishKey(o) as string)) : out;
}

/**
 * `n` distinct random options. When weapons and passives run short, reward cards fill the rest; a plain heal only
 * if nothing at all is left (Banir keeps that from happening, see `canBanish`).
 */
export function rollUpgrades(world: World, n = config.xp.choices): UpgradeOption[] {
  const pool = world.rng.shuffle(candidates(world)).slice(0, n);
  if (pool.length < n) pool.push(...world.rng.shuffle(rewards(world)).slice(0, n - pool.length));
  return pool.length > 0 ? pool : [{ kind: 'heal' }];
}

/** How many different options are left (weapons, passives and reward cards). */
export function optionsLeft(world: World): number {
  return candidates(world).length + rewards(world).length;
}

/** Banir is allowed on a card only while, without it, there would still be `n` different cards to offer. */
export function canBanish(world: World, opt: UpgradeOption, n = config.xp.choices): boolean {
  return banishKey(opt) !== null && optionsLeft(world) - 1 >= n;
}

/** An owned base weapon's Elo recipe is complete (max level + its passive owned): the next chest forms it. */
export function eloReady(world: World, weaponId: WeaponId): boolean {
  const evolved = evolutionOf(weaponId);
  if (!evolved || world.hasWeapon(evolved.id)) return false;
  const base = world.weapons.find((w) => w.id === weaponId);
  return !!base && base.level >= maxLevel(weaponId) && (world.passives[evolved.evo.passive] ?? 0) > 0;
}

/** Where an owned weapon stands on its Elo recipe (the pause screen shows it). */
export type EloStatus =
  { kind: 'formed' | 'ready' | 'none' } | { kind: 'missing'; levels: number; passive: PassiveId | null };

export function eloStatus(world: World, weaponId: WeaponId): EloStatus {
  if (isElo(weaponId)) return { kind: 'formed' };
  const evolved = evolutionOf(weaponId);
  if (!evolved || world.hasWeapon(evolved.id)) return { kind: 'none' };
  if (eloReady(world, weaponId)) return { kind: 'ready' };
  const level = world.weapons.find((w) => w.id === weaponId)?.level ?? 0;
  const passive = evolved.evo.passive;
  return {
    kind: 'missing',
    levels: Math.max(0, maxLevel(weaponId) - level),
    passive: (world.passives[passive] ?? 0) > 0 ? null : passive,
  };
}

/** The first evolution whose recipe is complete: base weapon at max level + its passive owned. */
export function readyEvolution(world: World): UpgradeOption | null {
  for (const id of EVOLVED_IDS) {
    const evo = EVOLUTIONS[id];
    if (evo && eloReady(world, evo.from)) return { kind: 'evolution', id, from: evo.from };
  }
  return null;
}

/** The owned base weapons whose Elo uses `passive` (a passive card lists them all). */
export function weaponsCompletedBy(owned: readonly WeaponId[], passive: PassiveId): WeaponId[] {
  return owned.filter((id) => evolutionOf(id)?.evo.passive === passive);
}

/** What a passive choice would do to its stat (the level-up stat sheet shows `from → to`); null otherwise. */
export function statPreview(
  world: World,
  opt: UpgradeOption,
): { stat: StatKey; from: number; to: number } | null {
  if (opt.kind !== 'passive') return null;
  const def = PASSIVES[opt.id];
  const from = world.player.stats[def.stat];
  return { stat: def.stat, from, to: from + def.perLevel };
}

/** What a chest gives: an evolution if one is ready, else a level of something already owned, else a heal. */
export function chestReward(world: World): UpgradeOption {
  return (
    readyEvolution(world) ??
    world.rng.pick(candidates(world, false)) ??
    world.rng.pick(rewards(world)) ?? { kind: 'heal' }
  );
}

/** Applies a choice or a chest reward. Anything that changes the build bumps `world.buildRev` (the HUD redraws). */
export function applyUpgrade(world: World, opt: UpgradeOption): void {
  const p = world.player;
  if (opt.kind !== 'heal' && opt.kind !== 'reward') world.buildRev++;
  switch (opt.kind) {
    case 'weapon': {
      const owned = world.weapons.find((w) => w.id === opt.id);
      if (owned) {
        markLevel(owned, world.time);
        owned.level = opt.level;
      } else world.addWeapon(opt.id);
      break;
    }
    case 'evolution': {
      const owned = world.weapons.find((w) => w.id === opt.from);
      if (owned) {
        markLevel(owned, world.time);
        owned.id = opt.id;
        owned.level = 1;
        owned.timer = 0;
        owned.combo = 0;
      }
      break;
    }
    case 'passive': {
      const def = PASSIVES[opt.id];
      world.passives[opt.id] = opt.level;
      p.stats[def.stat] += def.perLevel;
      if (def.stat === 'maxHp') p.hp += def.perLevel;
      break;
    }
    case 'reward': {
      const r: RewardDef = REWARDS[opt.id];
      if (r.gold) addGold(world, r.gold);
      if (r.heal) p.hp = Math.min(p.stats.maxHp, p.hp + p.stats.maxHp * r.heal);
      if (r.might) {
        p.stats.might += r.might;
        world.blessings++;
      }
      break;
    }
    case 'heal':
      p.hp = Math.min(p.stats.maxHp, p.hp + config.xp.healAmount);
      break;
  }
  if (opt.kind === 'weapon' || opt.kind === 'passive') announceReadyElos(world);
}

/** Tells the renderer (once per weapon) that an Elo recipe has just become complete. */
function announceReadyElos(world: World): void {
  for (const w of world.weapons) {
    if (world.eloAnnounced.includes(w.id) || !eloReady(world, w.id)) continue;
    world.eloAnnounced.push(w.id);
    world.events.push({ type: 'eloReady', weapon: w.id });
  }
}

/** Stats that change between a weapon's previous level and `level` (for the level-up card). */
export function weaponLevelDiff(id: WeaponId, level: number): { stat: string; from: number; to: number }[] {
  const levels = WEAPONS[id].levels as unknown as Record<string, number>[];
  const prev = levels[level - 2];
  const next = levels[level - 1];
  if (!prev || !next) return [];
  return Object.keys(next)
    .filter((k) => next[k] !== prev[k])
    .map((k) => ({ stat: k, from: prev[k] as number, to: next[k] as number }));
}
