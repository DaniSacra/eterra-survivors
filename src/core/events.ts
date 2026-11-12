import type { EnemyId } from '../data/enemies';
import type { PickupId } from '../data/pickups';
import type { PassiveId } from '../data/upgrades';
import type { WeaponId } from '../data/weapons';
import type { UpgradeOption } from './upgrades';

/** Rare, notable things the renderer reacts to (shake, sounds, screens). Drained every frame. */
export type GameEvent =
  | { type: 'playerHit' }
  | { type: 'bossSpawned' }
  | { type: 'eliteSpawned'; id: EnemyId }
  /** A thief rat showed up with its eye on the gems, and when it got away with them (FT-10). */
  | { type: 'thiefSpawned' }
  /** The mark of a thief about to appear was laid (its coins sound one second ahead). */
  | { type: 'thiefMark'; x: number; y: number }
  | { type: 'thiefEscaped' }
  /** An Ossada em Brasa's mark went off (FT-14). */
  | { type: 'burst'; x: number; y: number; radius: number }
  | { type: 'levelUp' }
  /** An elite's chest: the level it gave (null if nothing could level), with its gold and heal (data CHEST). */
  | { type: 'chest'; reward: UpgradeOption | null }
  /** A recipe was completed (weapon and passive at max level): `from` just turned into the Elo `elo`. */
  /** A weapon the hero did not have joined the build (a level-up or a chest; not the starting weapon). */
  | { type: 'weaponAdded'; id: WeaponId }
  | { type: 'eloForged'; elo: WeaponId; from: WeaponId; passive: PassiveId }
  | { type: 'pickup'; id: PickupId }
  /** Muralha de Valmor's guard took a hit (and gave it back). */
  | { type: 'ward' }
  /** Segunda Chance: the hero fell and got up again. */
  | { type: 'revived' }
  | { type: 'won' }
  | { type: 'lost' };
