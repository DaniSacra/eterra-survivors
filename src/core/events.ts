import type { PickupId } from '../data/pickups';
import type { WeaponId } from '../data/weapons';
import type { UpgradeOption } from './upgrades';

/** Rare, notable things the renderer reacts to (shake, sounds, screens). Drained every frame. */
export type GameEvent =
  | { type: 'playerHit' }
  | { type: 'bossSpawned' }
  | { type: 'eliteSpawned' }
  | { type: 'levelUp' }
  | { type: 'chest'; reward: UpgradeOption }
  /** A weapon's Elo recipe just became complete (once per weapon per run): the next chest forms it. */
  | { type: 'eloReady'; weapon: WeaponId }
  | { type: 'pickup'; id: PickupId }
  /** Segunda Chance: the hero fell and got up again. */
  | { type: 'revived' }
  | { type: 'won' }
  | { type: 'lost' };
