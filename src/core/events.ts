import type { UpgradeOption } from './upgrades';

/** Rare, notable things the renderer reacts to (shake, sounds, screens). Drained every frame. */
export type GameEvent =
  | { type: 'playerHit' }
  | { type: 'bossSpawned' }
  | { type: 'eliteSpawned' }
  | { type: 'levelUp' }
  | { type: 'chest'; reward: UpgradeOption }
  | { type: 'won' }
  | { type: 'lost' };
