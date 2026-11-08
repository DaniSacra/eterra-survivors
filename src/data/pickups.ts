/** Things lying on the ground that act when Aldo touches them. Behaviour per id lives in core/pickups.ts. */
export interface PickupDef {
  /** Asset key in render/assets.ts. */
  sprite: string;
}

export const PICKUPS = {
  /** Dropped by elites: an evolution, or a level of something owned. */
  chest: { sprite: 'pickup.chest' },
} satisfies Record<string, PickupDef>;

export type PickupId = keyof typeof PICKUPS;
export const PICKUP_IDS = Object.keys(PICKUPS) as PickupId[];
