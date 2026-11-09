import { SIGNATURE_OWNER } from '../data/characters';
import { config } from '../data/config';
import { EVOLUTIONS, EVOLVED_IDS, evolutionOf } from '../data/evolutions';
import { PASSIVES, PASSIVE_IDS, type PassiveId } from '../data/upgrades';
import { WEAPONS, WEAPON_IDS, type WeaponId } from '../data/weapons';
import { isElo, maxLevel } from './weapons';
import type { World } from './world';

/** `level` is the level the thing will have after picking (1 = new weapon). */
export type UpgradeOption =
  | { kind: 'weapon'; id: WeaponId; level: number }
  | { kind: 'passive'; id: PassiveId; level: number }
  /** Only from chests: `from` turns into `id`. */
  | { kind: 'evolution'; id: WeaponId; from: WeaponId }
  | { kind: 'heal' };

/** Identifies a weapon or passive for banishing (null for things that can't be banished). */
export function banishKey(opt: UpgradeOption): string | null {
  return opt.kind === 'weapon' || opt.kind === 'passive' ? `${opt.kind}:${opt.id}` : null;
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

/** Up to `n` distinct random options; a heal when everything is maxed. */
export function rollUpgrades(world: World, n = config.xp.choices): UpgradeOption[] {
  const pool = world.rng.shuffle(candidates(world));
  return pool.length > 0 ? pool.slice(0, n) : [{ kind: 'heal' }];
}

/** The first evolution whose recipe is complete: base weapon at max level + its passive owned. */
export function readyEvolution(world: World): UpgradeOption | null {
  for (const id of EVOLVED_IDS) {
    const evo = EVOLUTIONS[id];
    if (!evo || world.hasWeapon(id)) continue;
    const base = world.weapons.find((w) => w.id === evo.from);
    if (base && base.level >= maxLevel(base.id) && (world.passives[evo.passive] ?? 0) > 0)
      return { kind: 'evolution', id, from: evo.from };
  }
  return null;
}

/** The owned base weapons whose Elo uses `passive` (a passive card lists them all). */
export function weaponsCompletedBy(owned: readonly WeaponId[], passive: PassiveId): WeaponId[] {
  return owned.filter((id) => evolutionOf(id)?.evo.passive === passive);
}

/** What a chest gives: an evolution if one is ready, else a level of something already owned, else a heal. */
export function chestReward(world: World): UpgradeOption {
  return readyEvolution(world) ?? world.rng.pick(candidates(world, false)) ?? { kind: 'heal' };
}

export function applyUpgrade(world: World, opt: UpgradeOption): void {
  const p = world.player;
  switch (opt.kind) {
    case 'weapon': {
      const owned = world.weapons.find((w) => w.id === opt.id);
      if (owned) owned.level = opt.level;
      else world.addWeapon(opt.id);
      break;
    }
    case 'evolution': {
      const owned = world.weapons.find((w) => w.id === opt.from);
      if (owned) {
        owned.id = opt.id;
        owned.level = 1;
        owned.timer = 0;
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
    case 'heal':
      p.hp = Math.min(p.stats.maxHp, p.hp + config.xp.healAmount);
      break;
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
