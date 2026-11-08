import { config } from '../data/config';
import { PASSIVES, PASSIVE_IDS, type PassiveId } from '../data/upgrades';
import { WEAPONS, WEAPON_IDS, type WeaponId } from '../data/weapons';
import { maxLevel } from './weapons';
import type { World } from './world';

/** `level` is the level the thing will have after picking (1 = new weapon). */
export type UpgradeOption =
  | { kind: 'weapon'; id: WeaponId; level: number }
  | { kind: 'passive'; id: PassiveId; level: number }
  | { kind: 'heal' };

/** Every option currently available. */
export function candidates(world: World): UpgradeOption[] {
  const out: UpgradeOption[] = [];
  const canAddWeapon = world.weapons.length < config.weapons.maxOwned;
  for (const id of WEAPON_IDS) {
    const owned = world.weapons.find((w) => w.id === id);
    if (owned && owned.level < maxLevel(id)) out.push({ kind: 'weapon', id, level: owned.level + 1 });
    else if (!owned && canAddWeapon) out.push({ kind: 'weapon', id, level: 1 });
  }
  for (const id of PASSIVE_IDS) {
    const level = world.passives[id] ?? 0;
    if (level < PASSIVES[id].maxLevel) out.push({ kind: 'passive', id, level: level + 1 });
  }
  return out;
}

/** Up to `n` distinct random options; a heal when everything is maxed. */
export function rollUpgrades(world: World, n = config.xp.choices): UpgradeOption[] {
  const pool = world.rng.shuffle(candidates(world));
  return pool.length > 0 ? pool.slice(0, n) : [{ kind: 'heal' }];
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
