import type { StatKey } from './config';

/** Level-up helpers bought in the shop: each level adds one use per run. */
export type ChargeKey = 'reroll' | 'skip' | 'banish';

/**
 * Permanent upgrades bought with gold between runs (saved in the browser).
 * Each level adds `perLevel` to a starting stat, or one charge per run.
 * Cost of level L (1-based) = baseCost * L.
 */
export type ShopDef = { perLevel: number; maxLevel: number; baseCost: number } & (
  { stat: StatKey } | { charge: ChargeKey }
);

export const SHOP = {
  might: { stat: 'might', perLevel: 0.05, maxLevel: 5, baseCost: 150 },
  maxHp: { stat: 'maxHp', perLevel: 10, maxLevel: 5, baseCost: 100 },
  armor: { stat: 'armor', perLevel: 1, maxLevel: 3, baseCost: 200 },
  regen: { stat: 'regen', perLevel: 0.1, maxLevel: 5, baseCost: 120 },
  moveSpeed: { stat: 'moveSpeed', perLevel: 7, maxLevel: 3, baseCost: 120 },
  cooldown: { stat: 'cooldown', perLevel: -0.03, maxLevel: 3, baseCost: 250 },
  area: { stat: 'area', perLevel: 0.05, maxLevel: 3, baseCost: 200 },
  magnet: { stat: 'magnet', perLevel: 15, maxLevel: 3, baseCost: 80 },
  growth: { stat: 'growth', perLevel: 0.05, maxLevel: 5, baseCost: 150 },
  greed: { stat: 'greed', perLevel: 0.1, maxLevel: 5, baseCost: 100 },
  amount: { stat: 'amount', perLevel: 1, maxLevel: 1, baseCost: 3000 },
  reroll: { charge: 'reroll', perLevel: 1, maxLevel: 5, baseCost: 120 },
  skip: { charge: 'skip', perLevel: 1, maxLevel: 5, baseCost: 80 },
  banish: { charge: 'banish', perLevel: 1, maxLevel: 5, baseCost: 150 },
} satisfies Record<string, ShopDef>;

export type ShopId = keyof typeof SHOP;
export const SHOP_IDS = Object.keys(SHOP) as ShopId[];
