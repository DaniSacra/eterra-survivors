import { describe, expect, it } from 'vitest';
import { BossAct } from '../../src/core/bosses';
import { spawnEnemy } from '../../src/core/enemies';
import { ENEMIES } from '../../src/data/enemies';
import { ENEMY_ANIMS, enemyPose, poseFrame } from '../../src/render/enemyAnims';
import { bareWorld } from '../core/helpers';

describe('enemy state animations', () => {
  it('shows the walk until an ability starts, then follows the core timers', () => {
    const w = bareWorld();
    const boss = spawnEnemy(w, 'blackKnight', 500, 0);
    expect(enemyPose(boss)).toEqual({ pose: 'walk', k: -1 });
    const ab = boss.def.ability as { windup: number };
    boss.act = BossAct.Windup;
    boss.actT = ab.windup;
    expect(enemyPose(boss)).toEqual({ pose: 'windup', k: 0 });
    boss.actT = ab.windup / 2;
    expect(enemyPose(boss).k).toBeCloseTo(0.5);
    boss.act = BossAct.Active;
    expect(enemyPose(boss)).toEqual({ pose: 'strike', k: -1 });
  });

  it('reads a leaper in the air by its air time and a thrower by its windup', () => {
    const w = bareWorld();
    const golem = spawnEnemy(w, 'golem', 500, 0);
    const lp = golem.def.leap as { air: number; windup: number };
    golem.act = BossAct.Active;
    golem.actT = lp.air * 0.25;
    expect(enemyPose(golem).pose).toBe('strike');
    expect(enemyPose(golem).k).toBeCloseTo(0.75);
    const witch = spawnEnemy(w, 'witch', 500, 0);
    witch.act = BossAct.Windup;
    witch.actT = ENEMIES.witch.shoot.windup;
    expect(enemyPose(witch)).toEqual({ pose: 'windup', k: 0 });
  });

  it('picks frames inside each strip: progress clamps, timed poses loop or hold', () => {
    for (const a of Object.values(ENEMY_ANIMS)) {
      expect(poseFrame(a, 'windup', 1, 0)).toBe(a.frames.windup - 1);
      expect(poseFrame(a, 'walk', -1, 123.4)).toBeLessThan(a.frames.walk);
      expect(poseFrame(a, 'death', -1, 99)).toBe(a.frames.death - 1);
      expect(poseFrame(a, 'strike', -1, 0)).toBe(0);
    }
  });

  it('leaves a death puff that names what died (for the corpse animation)', () => {
    const w = bareWorld();
    const e = spawnEnemy(w, 'witch', 100, 0);
    e.hp = 0;
    e.dead = true;
    w.onEnemyKilled(e);
    const puff = w.puffs.active[w.puffs.active.length - 1];
    expect(puff?.sprite).toBe('enemy.witch');
    // It stood to the right of the hero, so it faced left.
    expect(puff?.flip).toBe(true);
  });
});
