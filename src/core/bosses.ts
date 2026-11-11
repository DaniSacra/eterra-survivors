import { config } from '../data/config';
import type { BossAbility, EnemyId } from '../data/enemies';
import { markIce } from './arena';
import type { Enemy } from './enemies';
import { riseAt } from './marks';
import { TAU, angleDiff } from './math';
import { hurtHero } from './elos';
import { segmentAt } from './waves';
import type { World } from './world';

/** What a boss is doing with its ability: waiting for the next one, winding up (telegraphed), or acting. */
export const BossAct = { Idle: 0, Windup: 1, Active: 2 } as const;

/** How long the cleave stays visible after it lands, seconds. */
export const CLEAVE_SHOW = 0.25;

/** The ability a boss is on now: its `abilities` in turn, or its one `ability`. */
export function bossAbility(e: Enemy): BossAbility | undefined {
  const list = e.def.abilities;
  return list ? list[e.abilityIdx % list.length] : e.def.ability;
}

/** Done with an ability: wait its `every`, and the next one in the cycle comes. */
function rest(e: Enemy, ab: BossAbility): void {
  e.act = BossAct.Idle;
  e.actT = ab.every;
  e.abilityIdx++;
}

/**
 * Runs a boss's telegraphed ability (data/enemies.ts `ability`). Returns true while the boss moves on its own
 * (standing still to wind up, or dashing), so the normal walk toward the hero is skipped.
 */
export function updateBoss(world: World, e: Enemy, dt: number): boolean {
  const ab = bossAbility(e);
  if (!ab) return false;
  if (world.freeze > 0) return e.act !== BossAct.Idle; // frozen mid-attack: hold still, timers paused
  const p = world.player;
  e.actT -= dt;
  switch (e.act) {
    case BossAct.Idle: {
      if (e.actT > 0) return false;
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const d = Math.hypot(dx, dy);
      if (d > ab.trigger) return false;
      e.act = BossAct.Windup;
      e.actT = ab.windup;
      e.aimX = dx / (d || 1);
      e.aimY = dy / (d || 1);
      if (ab.kind === 'frost') markIce(world, e, ab);
      return true;
    }
    case BossAct.Windup:
      if (e.actT > 0) return true;
      return release(world, e, ab);
    case BossAct.Active:
      if (e.actT <= 0) {
        rest(e, ab);
        return false;
      }
      if (ab.kind === 'lunge') {
        const speed = ab.range / (ab.dash ?? 0.5);
        e.x += e.aimX * speed * dt;
        e.y += e.aimY * speed * dt;
        const r = config.player.radius + e.def.radius;
        if (
          (p.x - e.x) ** 2 + (p.y - e.y) ** 2 < r * r &&
          hurtHero(world, e, ab.damage * world.stage.mult.damage, 'boss')
        )
          world.events.push({ type: 'playerHit' });
      }
      return true;
    default:
      return false;
  }
}

function release(world: World, e: Enemy, ab: BossAbility): boolean {
  const p = world.player;
  switch (ab.kind) {
    case 'cleave': {
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const inReach = Math.hypot(dx, dy) <= ab.range + config.player.radius;
      const inArc = Math.abs(angleDiff(Math.atan2(e.aimY, e.aimX), Math.atan2(dy, dx))) <= (ab.arc ?? 1) / 2;
      if (inReach && inArc && hurtHero(world, e, ab.damage * world.stage.mult.damage, 'boss'))
        world.events.push({ type: 'playerHit' });
      e.act = BossAct.Active;
      e.actT = CLEAVE_SHOW;
      return true;
    }
    case 'toll': {
      const n = ab.count ?? 6;
      const hpMult = segmentAt(world.time, world.stage.waves).hpMult;
      for (let i = 0; i < n && world.enemies.size < config.enemies.maxActive; i++) {
        const a = (i * TAU) / n;
        // The dead rise out of marks on the ground (FT-02), never on top of the hero.
        riseAt(
          world,
          ab.summon as EnemyId,
          e.x + Math.cos(a) * ab.range,
          e.y + Math.sin(a) * ab.range,
          hpMult,
        );
      }
      rest(e, ab);
      return false;
    }
    case 'frost':
      // The ice formed with the howl (core/arena.ts); the screen shakes in the render.
      rest(e, ab);
      return false;
    case 'lunge':
      e.act = BossAct.Active;
      e.actT = ab.dash ?? 0.5;
      return true;
  }
}
