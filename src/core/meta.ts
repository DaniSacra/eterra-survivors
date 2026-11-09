import { CHARACTERS, CHARACTER_IDS, type CharacterId } from '../data/characters';
import { config, type Stats } from '../data/config';
import { SHOP, SHOP_IDS, type ChargeKey, type ShopDef, type ShopId } from '../data/shop';
import { STAGE_IDS, type StageId } from '../data/stages';
import { EVOLVED_IDS } from '../data/evolutions';
import type { WeaponId } from '../data/weapons';

/** Bump when the save shape changes, and migrate older saves in `sanitizeSave`. */
export const SAVE_VERSION = 1;

/** What survives between runs. Persisted by render/save.ts. */
export interface MetaSave {
  version: number;
  gold: number;
  shop: Partial<Record<ShopId, number>>;
  /** Heroes bought (free ones are always available). */
  heroes: CharacterId[];
  /** Stages won at least once. */
  cleared: StageId[];
  /** Elos ever formed (the Livro de Elos shows their recipes). */
  elos: WeaponId[];
}

export type Charges = Record<ChargeKey, number>;

/** Everything a run starts with besides the defaults (from the shop, later the character). */
export interface RunBonuses {
  stats: Partial<Stats>;
  charges: Charges;
}

export const newSave = (): MetaSave => ({
  version: SAVE_VERSION,
  gold: 0,
  shop: {},
  heroes: [],
  cleared: [],
  elos: [],
});

/**
 * Accepts anything (old, versionless or broken saves) and returns a valid save of the current version.
 * Version 0 (no `version` field) had no Elos list: it simply starts empty, nothing else is lost.
 */
export function sanitizeSave(raw: unknown): MetaSave {
  const save = newSave();
  if (!raw || typeof raw !== 'object') return save;
  const r = raw as { gold?: unknown; shop?: unknown; heroes?: unknown; cleared?: unknown; elos?: unknown };
  if (typeof r.gold === 'number' && r.gold >= 0) save.gold = Math.floor(r.gold);
  if (r.shop && typeof r.shop === 'object') {
    for (const id of SHOP_IDS) {
      const lv = (r.shop as Record<string, unknown>)[id];
      if (typeof lv === 'number' && lv > 0) save.shop[id] = Math.min(Math.floor(lv), SHOP[id].maxLevel);
    }
  }
  const known = <T extends string>(list: unknown, ids: readonly T[]): T[] =>
    Array.isArray(list) ? ids.filter((id) => list.includes(id)) : [];
  save.heroes = known(r.heroes, CHARACTER_IDS);
  save.cleared = known(r.cleared, STAGE_IDS);
  save.elos = known(r.elos, EVOLVED_IDS);
  return save;
}

/** Marks Elos as discovered; returns the ones that were new. */
export function discoverElos(save: MetaSave, ids: readonly WeaponId[]): WeaponId[] {
  const fresh = ids.filter((id) => EVOLVED_IDS.includes(id) && !save.elos.includes(id));
  save.elos.push(...fresh);
  return fresh;
}

/** The cheapest thing still to buy (a shop level, or a hero while heroes are sold), for the end screen. */
export function nextGoal(
  save: MetaSave,
): { kind: 'shop'; id: ShopId; cost: number } | { kind: 'hero'; id: CharacterId; cost: number } | null {
  let best: ReturnType<typeof nextGoal> = null;
  for (const id of SHOP_IDS) {
    const cost = shopCost(save, id);
    if (cost !== null && (!best || cost < best.cost)) best = { kind: 'shop', id, cost };
  }
  for (const id of CHARACTER_IDS) {
    const cost = CHARACTERS[id].cost;
    if (!heroUnlocked(save, id) && (!best || cost < best.cost)) best = { kind: 'hero', id, cost };
  }
  return best;
}

export const heroUnlocked = (save: MetaSave, id: CharacterId): boolean =>
  config.unlockAllHeroes || CHARACTERS[id].cost === 0 || save.heroes.includes(id);

/** Buys a hero if affordable. Returns true on success. */
export function unlockHero(save: MetaSave, id: CharacterId): boolean {
  const cost = CHARACTERS[id].cost;
  if (heroUnlocked(save, id) || save.gold < cost) return false;
  save.gold -= cost;
  save.heroes.push(id);
  return true;
}

/** The first stage is always open; each next one opens when the previous is cleared. */
export function stageUnlocked(save: MetaSave, id: StageId): boolean {
  const i = STAGE_IDS.indexOf(id);
  return i === 0 || save.cleared.includes(STAGE_IDS[i - 1] as StageId);
}

export function markCleared(save: MetaSave, id: StageId): void {
  if (!save.cleared.includes(id)) save.cleared.push(id);
}

export const shopLevel = (save: MetaSave, id: ShopId): number => save.shop[id] ?? 0;

/** Price of the next level, or null when maxed. */
export function shopCost(save: MetaSave, id: ShopId): number | null {
  const def: ShopDef = SHOP[id];
  const next = shopLevel(save, id) + 1;
  return next > def.maxLevel ? null : def.baseCost * next;
}

/** Buys the next level if affordable. Returns true on success. */
export function buy(save: MetaSave, id: ShopId): boolean {
  const cost = shopCost(save, id);
  if (cost === null || save.gold < cost) return false;
  save.gold -= cost;
  save.shop[id] = shopLevel(save, id) + 1;
  return true;
}

/** The starting stat deltas and per-run charges the shop gives. */
export function shopBonuses(save: MetaSave): RunBonuses {
  const out: RunBonuses = { stats: {}, charges: { ...config.charges } };
  for (const id of SHOP_IDS) {
    const lv = shopLevel(save, id);
    if (lv === 0) continue;
    const def: ShopDef = SHOP[id];
    const add = def.perLevel * lv;
    if ('stat' in def) out.stats[def.stat] = (out.stats[def.stat] ?? 0) + add;
    else out.charges[def.charge] += add;
  }
  return out;
}
