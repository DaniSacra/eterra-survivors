import type { Enemy } from './enemies';
import type { World } from './world';
import { BossAct as Act } from './bosses';

/**
 * Movement of the enemies with a behaviour of their own (data/enemies.ts `move`). Uses the enemy's `act`, `actT`
 * and aim fields (shared with bosses, which never have a `move`). Allocation-free.
 */

/** Charge: when close, stops to crouch for a moment, then dashes in a straight line. */
const CHARGE = { trigger: 200, windup: 0.5, dash: 0.55, speedMult: 2.6, rest: 3.5 };
/** Phase: now and then fades out (harmless, cannot be hit) and drifts faster. */
const PHASE = { faded: 1.2, solid: 4, fadedSpeed: 1.4 };
/** Zigzag: weaves sideways while closing in. */
const ZIGZAG = { freq: 3, amount: 0.4 };

/** True while a phasing enemy is faded (no contact damage, ignores hits). */
export const isFaded = (e: Enemy): boolean => e.def.move === 'phase' && e.act === Act.Active;

/**
 * Adjusts the step (mx, my) toward the hero (ux, uy unit, `step` px this frame) for the enemy's behaviour.
 * Writes the result into `out`.
 */
export function behaviourStep(
  world: World,
  e: Enemy,
  dt: number,
  ux: number,
  uy: number,
  dist: number,
  step: number,
  out: { x: number; y: number },
): void {
  out.x = ux * step;
  out.y = uy * step;
  switch (e.def.move) {
    case 'zigzag': {
      const side = Math.sin(world.time * ZIGZAG.freq + e.uid) * step * ZIGZAG.amount;
      out.x -= uy * side;
      out.y += ux * side;
      return;
    }
    case 'phase':
      e.actT -= dt;
      if (e.actT <= 0) {
        const fading = e.act !== Act.Active;
        e.act = fading ? Act.Active : Act.Idle;
        e.actT = fading ? PHASE.faded : PHASE.solid + world.rng.next() * 2;
      }
      if (e.act === Act.Active) {
        out.x *= PHASE.fadedSpeed;
        out.y *= PHASE.fadedSpeed;
      }
      return;
    case 'charge':
      e.actT -= dt;
      if (e.act === Act.Idle) {
        if (e.actT > 0 || dist > CHARGE.trigger) return;
        e.act = Act.Windup;
        e.actT = CHARGE.windup;
        e.aimX = ux;
        e.aimY = uy;
      }
      if (e.act === Act.Windup) {
        out.x = out.y = 0;
        if (e.actT > 0) return;
        e.act = Act.Active;
        e.actT = CHARGE.dash;
      }
      // Dashing: straight along the aim, whatever the hero does now.
      out.x = e.aimX * step * CHARGE.speedMult;
      out.y = e.aimY * step * CHARGE.speedMult;
      if (e.actT <= 0) {
        e.act = Act.Idle;
        e.actT = CHARGE.rest + world.rng.next();
      }
      return;
  }
}
