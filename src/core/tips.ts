import type { EnemyId } from '../data/enemies';
import type { EnemyDef } from '../data/enemies';
import type { Enemy } from './enemies';
import type { World } from './world';

/** Seconds between two first-time tips, and how close (px) the enemy must be for its tip to show. */
export const TIP_GAP = 20;
export const TIP_RANGE = 700;

/** An enemy with a verb of its own (something the player can only learn by being hit): its first sight gets a tip. */
export function hasVerb(def: EnemyDef): boolean {
  return !!(
    def.reassemble ||
    def.burst ||
    def.dig ||
    def.trail ||
    def.shoot ||
    def.leap ||
    def.nest ||
    def.flee ||
    def.banner ||
    def.brew
  );
}

/**
 * The first enemy on the field, within `TIP_RANGE` of the hero, that has a verb and whose tip was not shown yet
 * (`seen`), or null. Elites and bosses are named by their own warnings. Never allocates.
 */
export function nextTip(world: World, seen: ReadonlySet<EnemyId>): EnemyId | null {
  const p = world.player;
  const list = world.enemies.active;
  for (let i = 0; i < list.length; i++) {
    const e = list[i] as Enemy;
    if (e.dead || e.def.boss || e.def.elite || seen.has(e.type) || !hasVerb(e.def)) continue;
    if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= TIP_RANGE * TIP_RANGE) return e.type;
  }
  return null;
}
