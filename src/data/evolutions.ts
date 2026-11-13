import type { PassiveId } from './upgrades';
import { WEAPONS, type WeaponCategory, type WeaponDef, type WeaponId } from './weapons';

/**
 * Elos: a weapon at max level with its recipe passive at max level turns into its evolved form on the spot
 * (core/upgrades.ts `forgeElos`). Keyed by the evolved weapon. Names live in i18n under `weapons`.
 */
/** Each Elo's element: its colour (render/ui.ts `ELEMENT_COLOR`) and the particles of its forge and chain. */
export const ELEMENTS = [
  'fury',
  'fire',
  'forge',
  'shadow',
  'ice',
  'storm',
  'holy',
  'arcane',
  'earth',
  'soul',
  'steel',
] as const;
export type ElementId = (typeof ELEMENTS)[number];

/** Gold banked the first time each Elo is forged (the Livro de Elos records it). */
export const ELO_DISCOVERY_GOLD = 40;

export interface Evolution {
  from: WeaponId;
  passive: PassiveId;
  element: ElementId;
}

export const EVOLUTIONS: Partial<Record<WeaponId, Evolution>> = {
  fury: { from: 'blade', passive: 'might', element: 'fury' },
  holyLight: { from: 'elunLight', passive: 'recovery', element: 'holy' },
  yahFlame: { from: 'yahAura', passive: 'vigor', element: 'holy' },
  fan: { from: 'daggers', passive: 'amount', element: 'shadow' },
  vigil: { from: 'paladinSwords', passive: 'armor', element: 'holy' },
  blizzard: { from: 'frost', passive: 'reach', element: 'ice' },
  storm: { from: 'lightning', passive: 'haste', element: 'storm' },
  forgeFury: { from: 'hammer', passive: 'swiftness', element: 'forge' },
  soulProcession: { from: 'wisps', passive: 'growth', element: 'soul' },
  valmorWall: { from: 'shields', passive: 'attraction', element: 'steel' },
  jointBreaker: { from: 'mace', passive: 'armor', element: 'earth' },
  fireSword: { from: 'fire', passive: 'might', element: 'fire' },
  lyraStar: { from: 'staff', passive: 'luck', element: 'arcane' },
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

/** A weapon's strength category; an Elo takes its base's. */
export function weaponCategory(id: WeaponId): WeaponCategory {
  const def: WeaponDef = WEAPONS[id];
  return def.category ?? weaponCategory((EVOLUTIONS[id] as Evolution).from);
}
