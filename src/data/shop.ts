import type { StatKey } from './config';

/** Level-up helpers bought in the shop: each level adds one use per run. */
export type ChargeKey = 'reroll' | 'skip' | 'banish';

/**
 * Permanent upgrades bought with gold between runs (saved in the browser).
 * Each level adds `perLevel` to a starting stat, or one charge per run.
 * Cost of level L (1-based) = baseCost * L.
 */
export type ShopDef = { perLevel: number; maxLevel: number; baseCost: number } & (
  | { stat: StatKey }
  | { charge: ChargeKey }
  /** Segunda Chance: the hero gets up once per run (per level) with `config.revive.hp` of their life. */
  | { revive: true }
);

export const SHOP = {
  might: { stat: 'might', perLevel: 0.05, maxLevel: 10, baseCost: 120 },
  maxHp: { stat: 'maxHp', perLevel: 10, maxLevel: 10, baseCost: 80 },
  armor: { stat: 'armor', perLevel: 1, maxLevel: 5, baseCost: 160 },
  regen: { stat: 'regen', perLevel: 0.2, maxLevel: 5, baseCost: 120 },
  moveSpeed: { stat: 'moveSpeed', perLevel: 7, maxLevel: 3, baseCost: 120 },
  cooldown: { stat: 'cooldown', perLevel: -0.03, maxLevel: 5, baseCost: 200 },
  area: { stat: 'area', perLevel: 0.05, maxLevel: 5, baseCost: 160 },
  magnet: { stat: 'magnet', perLevel: 15, maxLevel: 3, baseCost: 80 },
  growth: { stat: 'growth', perLevel: 0.05, maxLevel: 5, baseCost: 150 },
  greed: { stat: 'greed', perLevel: 0.1, maxLevel: 5, baseCost: 100 },
  amount: { stat: 'amount', perLevel: 1, maxLevel: 2, baseCost: 2500 },
  revive: { revive: true, perLevel: 1, maxLevel: 1, baseCost: 2000 },
  reroll: { charge: 'reroll', perLevel: 1, maxLevel: 5, baseCost: 120 },
  skip: { charge: 'skip', perLevel: 1, maxLevel: 5, baseCost: 80 },
  banish: { charge: 'banish', perLevel: 1, maxLevel: 5, baseCost: 150 },
} satisfies Record<string, ShopDef>;

export type ShopId = keyof typeof SHOP;
export const SHOP_IDS = Object.keys(SHOP) as ShopId[];

/** The Loja's sections, in order: starting stats, level-up helpers, and the special purchases. */
export const SHOP_SECTIONS = {
  stats: SHOP_IDS.filter((id) => 'stat' in SHOP[id] && id !== 'amount'),
  helps: SHOP_IDS.filter((id) => 'charge' in SHOP[id]),
  special: ['amount', 'revive'] as ShopId[],
} satisfies Record<string, ShopId[]>;
export type ShopSection = keyof typeof SHOP_SECTIONS;
