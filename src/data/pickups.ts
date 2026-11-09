/** Things lying on the ground that act when Aldo touches them. Behaviour per id lives in core/pickups.ts. */
export interface PickupDef {
  /** Asset key in render/assets.ts. */
  sprite: string;
  /** Relative chance among random enemy drops (0 = never random). */
  weight: number;
}

export const PICKUPS = {
  /** Dropped by elites: gold, a level of something owned and a heal (CHEST). */
  chest: { sprite: 'pickup.chest', weight: 0 },
  /** A coin (its own drop chance: config.gold). */
  gold: { sprite: 'pickup.gold', weight: 0 },
  /** Pão da Berta: heals. */
  food: { sprite: 'pickup.food', weight: 5 },
  /** Pedra-Ímã: every gem on the ground flies to Aldo. */
  magnet: { sprite: 'pickup.magnet', weight: 2 },
  /** Badalada: the Sineiro's bell, hurts everything on screen. */
  bomb: { sprite: 'pickup.bomb', weight: 1 },
  /** Sopro de Geada: freezes every enemy for a while. */
  freeze: { sprite: 'pickup.freeze', weight: 1 },
} satisfies Record<string, PickupDef>;

/** What an elite's chest gives, all at once. */
export const CHEST = {
  /** Gold (before greed and the stage multiplier). */
  gold: 25,
  /** Levels of random owned weapons or passives (each a fresh roll; skipped when nothing can level). */
  levels: 1,
  /** Fraction of max HP healed. */
  heal: 0.25,
};

export type PickupId = keyof typeof PICKUPS;
export const PICKUP_IDS = Object.keys(PICKUPS) as PickupId[];

/** The table random drops roll on. */
export const RANDOM_DROPS = PICKUP_IDS.filter((id) => PICKUPS[id].weight > 0).map((id) => ({
  id,
  weight: PICKUPS[id].weight,
}));
