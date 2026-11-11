import { config } from '../data/config';
import { MAX_ENEMY_RADIUS } from '../data/enemies';
import type { Enemy } from './enemies';
import { addPuff } from './effects';
import { fireEnemyShot } from './enemyShots';
import { hurtHero } from './elos';
import type { World } from './world';
import { BossAct as Act } from './bosses';

/**
 * Movement of the enemies with a behaviour of their own (data/enemies.ts `move`). Uses the enemy's `act`, `actT`
 * and aim fields (shared with bosses, which never have a `move`). Allocation-free.
 */

/** Charge: when close, stops to crouch for a moment, then dashes in a straight line. */
export const CHARGE = { trigger: 200, windup: 0.5, dash: 0.55, speedMult: 2.6, rest: 3.5 };
/** Phase: now and then fades out (harmless, cannot be hit) and drifts faster. */
const PHASE = { faded: 1.2, solid: 4, fadedSpeed: 1.4 };
/** Zigzag: weaves sideways while closing in. */
const ZIGZAG = { freq: 3, amount: 0.4 };

/** True while a phasing enemy is faded (no contact damage, ignores hits). */
export const isFaded = (e: Enemy): boolean => e.def.move === 'phase' && e.act === Act.Active;
/** True while a leaping enemy is in the air (no contact, no shoving; it can still be hit). */
export const isAirborne = (e: Enemy): boolean => e.def.move === 'leap' && e.act === Act.Active;

/** Contact damage multiplier of `e` right now: rallied by a banner (FT-06) or not. */
export const rallyDamage = (e: Enemy): number => (e.rally > 0 ? config.rally.damage : 1);

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
    case 'charge': {
      const c = e.def.charge ?? CHARGE;
      e.actT -= dt;
      if (e.act === Act.Idle) {
        if (e.actT > 0 || dist > c.trigger) return;
        e.act = Act.Windup;
        e.actT = c.windup;
        e.aimX = ux;
        e.aimY = uy;
      }
      if (e.act === Act.Windup) {
        out.x = out.y = 0;
        if (e.actT > 0) return;
        e.act = Act.Active;
        e.actT = c.dash;
      }
      // Dashing: straight along the aim, whatever the hero does now.
      out.x = e.aimX * step * c.speedMult;
      out.y = e.aimY * step * c.speedMult;
      if (e.actT <= 0) {
        e.act = Act.Idle;
        e.actT = c.rest + world.rng.next();
      }
      return;
    }
    case 'shoot':
      return shoot(world, e, dt, ux, uy, dist, step, out);
    case 'leap':
      return leap(world, e, dt, dist, out);
    case 'pack': {
      // Comes in from its own side (by uid parity), turned `flank` rad off the straight line, until close.
      const pk = e.def.pack;
      if (!pk || dist <= pk.close) return;
      const a = (e.uid & 1 ? 1 : -1) * pk.flank;
      const c = Math.cos(a);
      const s = Math.sin(a);
      out.x = (ux * c - uy * s) * step;
      out.y = (ux * s + uy * c) * step;
      return;
    }
    case 'still':
      out.x = out.y = 0;
      if (e.def.banner) rally(world, e, dt);
      return;
  }
}

/**
 * Shoot (FT-03): walks in to `range`, backs off inside `keep`, holds between; every `every` s stops `windup` s and
 * throws at where the hero stands then. A stunned one doesn't throw (its windup starts over).
 */
function shoot(
  world: World,
  e: Enemy,
  dt: number,
  ux: number,
  uy: number,
  dist: number,
  step: number,
  out: { x: number; y: number },
): void {
  const sh = e.def.shoot;
  if (!sh) return;
  e.actT -= dt;
  if (e.act === Act.Windup) {
    out.x = out.y = 0;
    if (e.stun > 0) {
      e.act = Act.Idle;
      e.actT = sh.windup;
      return;
    }
    if (e.actT > 0) return;
    const p = world.player;
    const damage =
      e.def.damage * (sh.damage ?? 1) * world.enemyDamage * world.stage.mult.damage * rallyDamage(e);
    fireEnemyShot(world, e.x, e.y, p.x, p.y, sh.speed, sh.radius, sh.life, damage);
    e.act = Act.Idle;
    e.actT = sh.every * (0.85 + 0.3 * world.rng.next());
    return;
  }
  // Keep between `keep` and `range`.
  if (dist < sh.keep) {
    out.x = -ux * step;
    out.y = -uy * step;
  } else if (dist <= sh.range) out.x = out.y = 0;
  if (e.actT <= 0 && dist <= sh.range + 30 && e.stun <= 0) {
    e.act = Act.Windup;
    e.actT = sh.windup;
  }
}

/**
 * Leap (FT-04): within `trigger` it marks the hero's spot (aimX, aimY hold the spot), crouches `windup`, flies
 * `air` s straight to it (no contact meanwhile) and lands hurting the hero within `radius`.
 */
function leap(world: World, e: Enemy, dt: number, dist: number, out: { x: number; y: number }): void {
  const lp = e.def.leap;
  if (!lp) return;
  e.actT -= dt;
  const p = world.player;
  if (e.act === Act.Idle) {
    if (e.actT > 0 || dist > lp.trigger || e.stun > 0) return;
    e.act = Act.Windup;
    e.actT = lp.windup;
    e.aimX = p.x;
    e.aimY = p.y;
  }
  if (e.act === Act.Windup) {
    out.x = out.y = 0;
    if (e.actT > 0) return;
    e.act = Act.Active;
    e.actT = lp.air;
  }
  // In the air: the rest of the way to the mark, spread over the time left.
  const k = Math.min(1, dt / Math.max(dt, e.actT + dt));
  out.x = (e.aimX - e.x) * k;
  out.y = (e.aimY - e.y) * k;
  if (e.actT > 0) return;
  // Landing.
  out.x = e.aimX - e.x;
  out.y = e.aimY - e.y;
  const r = lp.radius + config.player.radius;
  if ((p.x - e.aimX) ** 2 + (p.y - e.aimY) ** 2 <= r * r) {
    const damage = e.def.damage * world.enemyDamage * world.stage.mult.damage * rallyDamage(e);
    if (hurtHero(world, e, damage, 'leap')) world.events.push({ type: 'playerHit' });
  }
  addPuff(world, e.aimX, e.aimY, lp.radius, 'death');
  e.act = Act.Idle;
  e.actT = lp.rest + world.rng.next();
}

/** Banner (FT-06): every `tick` s, the others within `radius` are rallied for a little over a tick. */
function rally(world: World, e: Enemy, dt: number): void {
  const b = e.def.banner;
  if (!b) return;
  e.actT -= dt;
  if (e.actT > 0) return;
  e.actT = b.tick;
  const list = world.enemies.active;
  const ids = world.enemyHash.query(e.x, e.y, b.radius + MAX_ENEMY_RADIUS, world.scratch);
  for (let n = 0; n < ids.length; n++) {
    const o = list[ids[n] as number] as Enemy;
    if (o === e || o.dead || o.def.boss) continue;
    if ((o.x - e.x) ** 2 + (o.y - e.y) ** 2 <= b.radius * b.radius) o.rally = b.tick * 1.6;
  }
}
