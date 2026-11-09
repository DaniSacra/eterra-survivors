import type { Stats } from './config';
import type { WeaponId } from './weapons';

/** Playable heroes, from the Crônicas de Eterra party. Names and texts live in i18n under `characters`. */
export interface CharacterDef {
  /** Asset key in render/assets.ts. */
  sprite: string;
  /** Starting weapon (every weapon is in the shared pool; any hero can be offered any of them). */
  weapon: WeaponId;
  /** Added to the default stats. */
  stats: Partial<Stats>;
  /** Gold to unlock (0 = free). */
  cost: number;
}

export const CHARACTERS = {
  /** Guerreiro: tough, starts with his village blade. */
  aldo: { sprite: 'player.aldo', weapon: 'blade', stats: { maxHp: 30, armor: 2 }, cost: 0 },
  /** Maga, Aldo's younger sister: her staff, wide spells, frail. */
  lyra: { sprite: 'player.lyra', weapon: 'staff', stats: { area: 0.1, maxHp: -10 }, cost: 800 },
  /** Clérigo: a mace that shakes the ground, and wounds that close by themselves. */
  teo: { sprite: 'player.teo', weapon: 'mace', stats: { regen: 0.4 }, cost: 800 },
  /** Ladina: knives, quick feet and luck with gold. */
  andilla: { sprite: 'player.andilla', weapon: 'daggers', stats: { moveSpeed: 10, greed: 0.25 }, cost: 1200 },
} satisfies Record<string, CharacterDef>;

export type CharacterId = keyof typeof CHARACTERS;
export const CHARACTER_IDS = Object.keys(CHARACTERS) as CharacterId[];
