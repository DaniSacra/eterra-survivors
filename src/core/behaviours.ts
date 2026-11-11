import { config } from '../data/config';
import { MAX_ENEMY_RADIUS, type EnemyId } from '../data/enemies';
import type { Enemy } from './enemies';
import { addPuff } from './effects';
import type { EnemyDef } from '../data/enemies';
import { fireEnemyShot } from './enemyShots';
import { hurtHero } from './elos';
import type { World } from './world';
import { BossAct as Act } from './bosses';
import { addPatch, inView, riseAt } from './marks';
import { TAU } from './math';
import { segmentAt } from './waves';

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
      if (e.def.brew && brew(world, e, dt, out)) return;
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
    case 'dig':
      dig(world, e, dt, out);
      return;
    case 'flee':
      return flee(world, e, dt, ux, uy, dist, step, out);
    case 'still':
      out.x = out.y = 0;
      if (e.def.banner) rally(world, e, dt);
      else if (e.def.nest) nest(world, e, dt, dist);
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
    if (sh.lob) lobPotion(world, e, sh.lob);
    else fireEnemyShot(world, e.x, e.y, p.x, p.y, sh.speed, sh.radius, sh.life, damage);
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

/**
 * Nest (FT-09): while the hero is within `range`, every `every` s raises `count` of `spawn` in a ring beside it (out
 * of spawn marks, so never on top of the hero), up to `total`. Far away it waits, silent.
 */
function nest(world: World, e: Enemy, dt: number, dist: number): void {
  const n = e.def.nest;
  if (!n) return;
  if (dist > n.range) return;
  e.actT -= dt;
  if (e.actT > 0) return;
  e.actT = n.every;
  const hpMult = segmentAt(world.time, world.stage.waves).hpMult;
  const start = world.rng.next() * TAU;
  for (let i = 0; i < n.count && e.spawned < n.total && world.enemies.size < config.enemies.maxActive; i++) {
    const a = start + (i * TAU) / n.count;
    const r = e.def.radius + 16;
    riseAt(world, n.spawn as EnemyId, e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, hpMult);
    e.spawned++;
  }
  if (e.spawned >= n.total && n.once) e.dead = e.vanished = true;
}

/** Gems within this many px of a fleeing thief draw it (it runs for the nearest one), and one it touches is taken. */
const THIEF = { sight: 260, grab: 16, outMargin: 120 };

/**
 * Flee (FT-10): walks in until `keep` px from the hero, then runs from them, bending to the side by its uid and
 * toward the nearest gem in sight, taking every gem it touches (`carry`). After `life` s it runs off for good
 * (`thiefEscaped`, no drop): the gems it carries are lost. Slower than the hero, so it can be caught.
 */
function flee(
  world: World,
  e: Enemy,
  dt: number,
  ux: number,
  uy: number,
  dist: number,
  step: number,
  out: { x: number; y: number },
): void {
  const f = e.def.flee;
  if (!f) return;
  if (e.act === Act.Idle) {
    if (dist > f.keep) return; // still closing in
    e.act = Act.Active;
    e.actT = f.life;
  }
  e.actT -= dt;
  if (e.act === Act.Windup) {
    // Running off: straight away from the hero, until out of the view.
    out.x = -ux * step * 1.3;
    out.y = -uy * step * 1.3;
    if (!inView(world, e.x, e.y, THIEF.outMargin)) {
      e.dead = e.vanished = true;
      world.events.push({ type: 'thiefEscaped' });
    }
    return;
  }
  if (e.actT <= 0) {
    e.act = Act.Windup;
    return;
  }
  // Away from the hero, with a lean to its own side.
  const side = e.uid & 1 ? 1 : -1;
  let dx = -ux - uy * side * 0.6;
  let dy = -uy + ux * side * 0.6;
  if (f.steal) {
    const gems = world.gems.active;
    let best = -1;
    let bestSq = THIEF.sight * THIEF.sight;
    for (let i = 0; i < gems.length; i++) {
      const g = gems[i] as (typeof gems)[number];
      const dSq = (g.x - e.x) ** 2 + (g.y - e.y) ** 2;
      if (dSq <= THIEF.grab * THIEF.grab) {
        e.carry += g.value;
        world.gems.release(g);
        i--;
        continue;
      }
      if (dSq < bestSq) {
        bestSq = dSq;
        best = i;
      }
    }
    // A gem in sight pulls it, unless the hero is on top of it.
    if (best >= 0 && dist > f.keep * 0.5) {
      const g = gems[best] as (typeof gems)[number];
      const gd = Math.sqrt(bestSq) || 1;
      dx = (g.x - e.x) / gd;
      dy = (g.y - e.y) / gd;
    }
  }
  const len = Math.hypot(dx, dy) || 1;
  out.x = (dx / len) * step;
  out.y = (dy / len) * step;
}

/**
 * A potion in the air (FT-11): it lands where the hero stands now, `flight` s later (the spot is marked all the way),
 * and leaves the next of the thrower's `pools`, round and round. A poison tick takes the thrower's contact damage times the pool's `hit`.
 */
function lobPotion(world: World, e: Enemy, lob: NonNullable<NonNullable<EnemyDef['shoot']>['lob']>): void {
  const pool = lob.pools[e.spawned++ % lob.pools.length];
  if (!pool) return;
  const p = world.player;
  const base = e.def.damage * world.enemyDamage * world.stage.mult.damage * rallyDamage(e);
  addPatch(
    world,
    pool.kind,
    p.x,
    p.y,
    pool.radius,
    lob.flight,
    pool.ttl,
    pool.slow ?? 1,
    base * (pool.hit ?? 0),
    e.x,
    e.y,
  );
}

/**
 * Dig (FT-16): every `every` s the Coveiro stops `windup` s with the shovel planted; at the end `count` of `spawn`
 * rise in a ring of `radius` px around him, each out of a spawn mark if it is in view.
 */
function dig(world: World, e: Enemy, dt: number, out: { x: number; y: number }): void {
  const d = e.def.dig;
  if (!d) return;
  if (e.stir > 0) {
    out.x = out.y = 0;
    // A blow that stuns him (the Maça de Ferro) breaks the windup: the grave stays shut, and he tries again later.
    if (e.stun > 0) {
      e.stir = 0;
      e.brewT = d.every * 0.5;
      return;
    }
    e.stir -= dt;
    if (e.stir > 0) return;
    e.brewT = d.every;
    const start = world.rng.next() * TAU;
    const hpMult = segmentAt(world.time, world.stage.waves).hpMult;
    for (let i = 0; i < d.count; i++) {
      const a = start + (i / d.count) * TAU;
      riseAt(world, d.spawn as EnemyId, e.x + Math.cos(a) * d.radius, e.y + Math.sin(a) * d.radius, hpMult);
    }
    return;
  }
  e.brewT -= dt;
  const p = world.player;
  const near = (p.x - e.x) ** 2 + (p.y - e.y) ** 2 <= d.range * d.range;
  if (e.brewT <= 0 && e.stun <= 0 && near && world.enemies.size < config.enemies.maxActive) e.stir = d.windup;
}

/**
 * Brew (FT-11): every `every` s the witch stops `windup` s to stir; at the end the others within `radius` heal
 * `heal` of their max HP and are rallied `rally` s. Returns true while stirring (she stands still).
 */
function brew(world: World, e: Enemy, dt: number, out: { x: number; y: number }): boolean {
  const b = e.def.brew;
  if (!b) return false;
  if (e.stir > 0) {
    e.stir -= dt;
    out.x = out.y = 0;
    if (e.stir > 0) return true;
    e.brewT = b.every;
    const list = world.enemies.active;
    const ids = world.enemyHash.query(e.x, e.y, b.radius + MAX_ENEMY_RADIUS, world.scratch);
    for (let n = 0; n < ids.length; n++) {
      const o = list[ids[n] as number] as Enemy;
      if (o === e || o.dead || o.def.boss) continue;
      if ((o.x - e.x) ** 2 + (o.y - e.y) ** 2 > b.radius * b.radius) continue;
      o.hp = Math.min(o.maxHp, o.hp + o.maxHp * b.heal);
      o.rally = Math.max(o.rally, b.rally);
    }
    return true;
  }
  e.brewT -= dt;
  if (e.brewT > 0 || e.stun > 0) return false;
  e.stir = b.windup;
  return false;
}
