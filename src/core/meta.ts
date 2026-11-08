import { config, type Stats } from '../data/config';
import { SHOP, SHOP_IDS, type ChargeKey, type ShopDef, type ShopId } from '../data/shop';

/** What survives between runs: banked gold and shop levels. Persisted by render/save.ts. */
export interface MetaSave {
  gold: number;
  shop: Partial<Record<ShopId, number>>;
}

export type Charges = Record<ChargeKey, number>;

/** Everything a run starts with besides the defaults (from the shop, later the character). */
export interface RunBonuses {
  stats: Partial<Stats>;
  charges: Charges;
}

export const newSave = (): MetaSave => ({ gold: 0, shop: {} });

/** Accepts anything (old or broken saves) and returns a valid save. */
export function sanitizeSave(raw: unknown): MetaSave {
  const save = newSave();
  if (!raw || typeof raw !== 'object') return save;
  const r = raw as { gold?: unknown; shop?: unknown };
  if (typeof r.gold === 'number' && r.gold >= 0) save.gold = Math.floor(r.gold);
  if (r.shop && typeof r.shop === 'object') {
    for (const id of SHOP_IDS) {
      const lv = (r.shop as Record<string, unknown>)[id];
      if (typeof lv === 'number' && lv > 0) save.shop[id] = Math.min(Math.floor(lv), SHOP[id].maxLevel);
    }
  }
  return save;
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
