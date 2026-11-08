/** Rare, notable things the renderer reacts to (shake, sounds, screens). Drained every frame. */
export type GameEvent =
  { type: 'playerHit' } | { type: 'bossSpawned' } | { type: 'levelUp' } | { type: 'won' } | { type: 'lost' };
