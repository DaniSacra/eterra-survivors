import { heal } from './player';
import { config, type StatKey } from '../data/config';
import { evolutionOf, type Evolution } from '../data/evolutions';
import { CHEST } from '../data/pickups';
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
  const pool = weightedPicks(world, candidates(world), n);
  if (pool.length < n) pool.push(...world.rng.shuffle(rewards(world)).slice(0, n - pool.length));
  return pool.length > 0 ? pool : [{ kind: 'heal' }];
}

/** Whether `opt` moves the Elo recipe of a weapon the hero owns. */
export function movesRecipe(world: World, opt: UpgradeOption): boolean {
  if (opt.kind === 'weapon') return opt.level > 1 && !!evolutionOf(opt.id);
  if (opt.kind !== 'passive') return false;
  return world.weapons.some((w) => evolutionOf(w.id)?.evo.passive === opt.id);
}

/** `n` distinct options, recipe pieces `config.xp.recipeWeight` times likelier. */
function weightedPicks(world: World, list: UpgradeOption[], n: number): UpgradeOption[] {
  const out: UpgradeOption[] = [];
  while (out.length < n && list.length > 0) {
    let total = 0;
    for (const o of list) total += movesRecipe(world, o) ? config.xp.recipeWeight : 1;
    let roll = world.rng.next() * total;
    let i = 0;
    for (; i < list.length - 1; i++) {
      roll -= movesRecipe(world, list[i] as UpgradeOption) ? config.xp.recipeWeight : 1;
      if (roll < 0) break;
    }
    out.push(...list.splice(i, 1));
  }
  return out;
}

/** How many different options are left (weapons, passives and reward cards). */
export function optionsLeft(world: World): number {
  return candidates(world).length + rewards(world).length;
}

/** Banir is allowed on a card only while, without it, there would still be `n` different cards to offer. */
export function canBanish(world: World, opt: UpgradeOption, n = config.xp.choices): boolean {
  return banishKey(opt) !== null && optionsLeft(world) - 1 >= n;
}

/**
 * An owned base weapon's Elo recipe is complete: the weapon and its recipe passive both at max level. The Elo forms
 * on the spot (`forgeElos`).
 */
export function eloReady(world: World, weaponId: WeaponId): boolean {
  const evolved = evolutionOf(weaponId);
  if (!evolved || world.hasWeapon(evolved.id)) return false;
  const base = world.weapons.find((w) => w.id === weaponId);
  const passive = evolved.evo.passive;
  return (
    !!base && base.level >= maxLevel(weaponId) && (world.passives[passive] ?? 0) >= PASSIVES[passive].maxLevel
  );
}

/** Where an owned weapon stands on its Elo recipe (pause screen, level-up cards). */
export type EloStatus =
  | { kind: 'formed' | 'none' }
  | {
      kind: 'missing';
      weapon: number;
      weaponMax: number;
      passive: PassiveId;
      passiveLevel: number;
      passiveMax: number;
    };

export function eloStatus(world: World, weaponId: WeaponId): EloStatus {
  if (isElo(weaponId)) return { kind: 'formed' };
  const evolved = evolutionOf(weaponId);
  if (!evolved || world.hasWeapon(evolved.id)) return { kind: 'none' };
  const passive = evolved.evo.passive;
  return {
    kind: 'missing',
    weapon: world.weapons.find((w) => w.id === weaponId)?.level ?? 0,
    weaponMax: maxLevel(weaponId),
    passive,
    passiveLevel: world.passives[passive] ?? 0,
    passiveMax: PASSIVES[passive].maxLevel,
  };
}

/** Turns every owned weapon whose recipe is complete into its Elo, right away (`eloForged` event). */
export function forgeElos(world: World): void {
  for (const owned of world.weapons) {
    if (!eloReady(world, owned.id)) continue;
    const { id, evo } = evolutionOf(owned.id) as { id: WeaponId; evo: Evolution };
    markLevel(owned, world.time);
    owned.id = id;
    owned.level = 1;
    owned.timer = 0;
    owned.after = owned.stacks = owned.stackTime = 0;
    world.buildRev++;
    world.events.push({ type: 'eloForged', elo: id, from: evo.from, passive: evo.passive });
  }
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

/** An elite's chest (data CHEST): gold, a level of something owned (which may forge an Elo) and a heal. */
export function openChest(world: World): void {
  let reward: UpgradeOption | null = null;
  const mark = world.events.length;
  for (let i = 0; i < CHEST.levels; i++) {
    const opt = world.rng.pick(candidates(world, false));
    if (!opt) break;
    reward ??= opt;
    applyUpgrade(world, opt);
  }
  addGold(world, CHEST.gold);
  const p = world.player;
  heal(p, p.stats.maxHp * CHEST.heal);
  // A level that forged an Elo is the Elo's moment: the chest opens first and plain, and the forge follows it.
  let forged = false;
  for (let i = mark; i < world.events.length; i++) if (world.events[i]?.type === 'eloForged') forged = true;
  world.events.splice(mark, 0, { type: 'chest', reward: forged ? null : reward });
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
    case 'passive': {
      const def = PASSIVES[opt.id];
      world.passives[opt.id] = opt.level;
      p.stats[def.stat] += def.perLevel;
      if (def.stat === 'maxHp') heal(p, def.perLevel);
      break;
    }
    case 'reward': {
      const r: RewardDef = REWARDS[opt.id];
      if (r.gold) addGold(world, r.gold);
      if (r.heal) heal(p, p.stats.maxHp * r.heal);
      if (r.might) {
        p.stats.might += r.might;
        world.blessings++;
      }
      break;
    }
    case 'heal':
      heal(p, config.xp.healAmount);
      break;
  }
  if (opt.kind === 'weapon' || opt.kind === 'passive') forgeElos(world);
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
