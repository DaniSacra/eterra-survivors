/**
 * Reward cards: they fill the level-up choice once the pool of weapons and passives runs short, so there are
 * always three cards (late in a run, and in the Noite Sem Fim). Adding one = a new entry here + its name in i18n.
 */
export interface RewardDef {
  /** Gold added (times greed). */
  gold?: number;
  /** Healing, as a fraction of max HP. */
  heal?: number;
  /** Added to the might stat (0.02 = +2% damage); no cap, it stacks. */
  might?: number;
}

export const REWARDS = {
  goldBag: { gold: 40 },
  feast: { heal: 0.5 },
  blessing: { might: 0.02 },
} satisfies Record<string, RewardDef>;

export type RewardId = keyof typeof REWARDS;
export const REWARD_IDS = Object.keys(REWARDS) as RewardId[];
