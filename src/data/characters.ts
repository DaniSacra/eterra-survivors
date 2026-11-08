import type { Stats } from './config';
import type { WeaponId } from './weapons';

/** Playable heroes, from the Crônicas de Eterra party. Names and texts live in i18n under `characters`. */
export interface CharacterDef {
  /** Asset key in render/assets.ts. */
  sprite: string;
  weapon: WeaponId;
  /** Added to the default stats. */
  stats: Partial<Stats>;
  /** Gold to unlock (0 = free). */
  cost: number;
}

export const CHARACTERS = {
  /** Guerreiro: tough, starts with his village blade. */
  aldo: { sprite: 'player.aldo', weapon: 'blade', stats: { maxHp: 20, armor: 1 }, cost: 0 },
  /** Maga, Aldo's younger sister: lightning, wide spells, frail. */
  lyra: { sprite: 'player.lyra', weapon: 'lightning', stats: { area: 0.1, maxHp: -20 }, cost: 300 },
  /** Clérigo: the holy light, and wounds that close by themselves. */
  teo: { sprite: 'player.teo', weapon: 'elunLight', stats: { regen: 0.4 }, cost: 300 },
  /** Ladina: knives, quick feet and luck with gold. */
  andilla: { sprite: 'player.andilla', weapon: 'daggers', stats: { moveSpeed: 20, greed: 0.25 }, cost: 500 },
} satisfies Record<string, CharacterDef>;

export type CharacterId = keyof typeof CHARACTERS;
export const CHARACTER_IDS = Object.keys(CHARACTERS) as CharacterId[];
