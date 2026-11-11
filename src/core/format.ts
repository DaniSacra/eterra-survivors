import { config } from '../data/config';
import type { EnemyDef } from '../data/enemies';

/** 125.7 -> "02:05". */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** An enemy's speed against the hero's: up to 50% slow, 75% medium, 95% fast, then faster than you. */
export type SpeedClass = 'slow' | 'medium' | 'fast' | 'faster';
/** How far hits push it: 0.9+ not at all, 0.5+ a little, else easily. */
export type PushClass = 'none' | 'little' | 'easy';
/** Its own way: a way of moving, an elite's chest, or a boss's ability. */
export type EnemyWay =
  | 'charge'
  | 'zigzag'
  | 'phase'
  | 'shoot'
  | 'leap'
  | 'pack'
  | 'still'
  | 'banner'
  | 'nest'
  | 'flee'
  | 'reassemble'
  | 'dig'
  | 'burst'
  | 'elite'
  | 'cleave'
  | 'frost'
  | 'web'
  | 'eggs'
  | 'toll'
  | 'lunge';

export interface EnemyTraits {
  hp: number;
  speed: SpeedClass;
  damage: number;
  push: PushClass;
  way: EnemyWay | null;
}

/** The bestiary's sheet in player terms, from an enemy's data. */
export function enemyTraits(def: EnemyDef, heroSpeed = config.player.stats.moveSpeed): EnemyTraits {
  const r = def.speed / heroSpeed;
  const speed: SpeedClass = r <= 0.5 ? 'slow' : r <= 0.75 ? 'medium' : r <= 0.95 ? 'fast' : 'faster';
  const k = def.knockbackResist;
  const push: PushClass = k >= 0.9 ? 'none' : k >= 0.5 ? 'little' : 'easy';
  const way: EnemyWay | null =
    def.ability?.kind ??
    (def.elite
      ? 'elite'
      : def.banner
        ? 'banner'
        : def.nest
          ? 'nest'
          : def.dig
            ? 'dig'
            : def.burst
              ? 'burst'
              : def.reassemble
                ? 'reassemble'
                : (def.move ?? null));
  return { hp: def.hp, speed, damage: def.damage, push, way };
}
