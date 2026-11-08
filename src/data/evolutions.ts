import type { PassiveId } from './upgrades';
import type { WeaponId } from './weapons';

/**
 * Elos: a weapon at max level plus a passive (any level) turns into its evolved form
 * when Aldo opens a chest. Keyed by the evolved weapon. Names live in i18n under `weapons`.
 */
export interface Evolution {
  from: WeaponId;
  passive: PassiveId;
}

export const EVOLUTIONS: Partial<Record<WeaponId, Evolution>> = {
  fury: { from: 'blade', passive: 'might' },
  holyLight: { from: 'elunLight', passive: 'recovery' },
  yahFlame: { from: 'yahAura', passive: 'vigor' },
  fan: { from: 'daggers', passive: 'amount' },
  vigil: { from: 'paladinSwords', passive: 'armor' },
  blizzard: { from: 'frost', passive: 'reach' },
  storm: { from: 'lightning', passive: 'haste' },
};

export const EVOLVED_IDS = Object.keys(EVOLUTIONS) as WeaponId[];

/** The evolution a base weapon can reach, if any. */
export function evolutionOf(base: WeaponId): { id: WeaponId; evo: Evolution } | null {
  for (const id of EVOLVED_IDS) {
    const evo = EVOLUTIONS[id] as Evolution;
    if (evo.from === base) return { id, evo };
  }
  return null;
}
