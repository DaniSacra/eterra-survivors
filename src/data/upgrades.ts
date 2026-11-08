import type { StatKey } from './config';

/**
 * Passive upgrades: each level adds `perLevel` to one player stat (see config.player.stats).
 * Multiplier stats (might, cooldown, area) use fractions: 0.1 = +10%.
 * Adding one = a new entry here + its name in i18n.
 */
export interface PassiveDef {
  stat: StatKey;
  perLevel: number;
  maxLevel: number;
}

export const PASSIVES = {
  vigor: { stat: 'maxHp', perLevel: 20, maxLevel: 5 },
  swiftness: { stat: 'moveSpeed', perLevel: 15, maxLevel: 5 },
  might: { stat: 'might', perLevel: 0.1, maxLevel: 5 },
  haste: { stat: 'cooldown', perLevel: -0.08, maxLevel: 5 },
  reach: { stat: 'area', perLevel: 0.1, maxLevel: 5 },
  attraction: { stat: 'magnet', perLevel: 30, maxLevel: 5 },
  recovery: { stat: 'regen', perLevel: 0.3, maxLevel: 5 },
} satisfies Record<string, PassiveDef>;

export type PassiveId = keyof typeof PASSIVES;
export const PASSIVE_IDS = Object.keys(PASSIVES) as PassiveId[];
