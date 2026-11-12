import { describe, expect, it } from 'vitest';
import { BossAct } from '../../src/core/bosses';
import { spawnEnemy } from '../../src/core/enemies';
import { config } from '../../src/data/config';
import { ENEMIES } from '../../src/data/enemies';
import { ENEMY_ANIMS, enemyPose, inReach, poseFrame, type EnemyAnim } from '../../src/render/enemyAnims';
import { bareWorld } from '../core/helpers';

const ANIM = ENEMY_ANIMS['enemy.blackKnight'] as EnemyAnim;

describe('enemy state animations', () => {
  it('shows the walk until an ability starts, then follows the core timers', () => {
    const w = bareWorld();
    const boss = spawnEnemy(w, 'blackKnight', 500, 0);
    expect(enemyPose(boss, ANIM)).toEqual({ pose: 'walk', k: -1 });
    const ab = boss.def.ability as { windup: number };
    boss.act = BossAct.Windup;
    boss.actT = ab.windup;
    expect(enemyPose(boss, ANIM)).toEqual({ pose: 'windup', k: 0 });
    boss.actT = ab.windup / 2;
    expect(enemyPose(boss, ANIM).k).toBeCloseTo(0.5);
    boss.act = BossAct.Active;
    expect(enemyPose(boss, ANIM)).toEqual({ pose: 'strike', k: -1 });
  });

  it('reads a leaper in the air by its air time and a thrower by its windup', () => {
    const w = bareWorld();
    const golem = spawnEnemy(w, 'golem', 500, 0);
    const lp = golem.def.leap as { air: number; windup: number };
    golem.act = BossAct.Active;
    golem.actT = lp.air * 0.25;
    expect(enemyPose(golem, ANIM).pose).toBe('strike');
    expect(enemyPose(golem, ANIM).k).toBeCloseTo(0.75);
    const witch = spawnEnemy(w, 'witch', 500, 0);
    witch.act = BossAct.Windup;
    witch.actT = ENEMIES.witch.shoot.windup;
    expect(enemyPose(witch, ANIM)).toEqual({ pose: 'windup', k: 0 });
  });

  it('gives a walk-only enemy (the crowd) its walk in every state', () => {
    const w = bareWorld();
    const walker = {
      frames: { walk: 5 },
      fps: { walk: 8, windup: 8, strike: 12, death: 8 },
      w: 1,
      h: 1,
    } as EnemyAnim;
    const e = spawnEnemy(w, 'goblin', 500, 0);
    e.act = BossAct.Windup;
    expect(enemyPose(e, walker).pose).toBe('walk');
    expect(poseFrame(walker, 'windup', 0.9, 0)).toBeLessThan(5);
  });

  it('picks frames inside each strip: progress clamps, timed poses loop or hold', () => {
    for (const a of Object.values(ENEMY_ANIMS)) {
      expect(poseFrame(a, 'windup', 1, 0)).toBe((a.frames.windup ?? a.frames.walk) - 1);
      expect(poseFrame(a, 'walk', -1, 123.4)).toBeLessThan(a.frames.walk);
      expect(poseFrame(a, 'death', -1, 99)).toBe((a.frames.death ?? a.frames.walk) - 1);
      expect(poseFrame(a, 'strike', -1, 0)).toBe(0);
    }
  });

  it('shows the attack loop only while a damaging crowd enemy touches the hero and does nothing special', () => {
    const w = bareWorld();
    const rat = spawnEnemy(w, 'rat', 100, 0);
    const a = ENEMY_ANIMS['enemy.rat'] as EnemyAnim;
    expect(enemyPose(rat, a, false)).toEqual({ pose: 'walk', k: -1 });
    expect(enemyPose(rat, a, true)).toEqual({ pose: 'attack', k: -1 });
    // A crouching charger, a stunned one and a harmless one do not bite.
    rat.act = BossAct.Windup;
    expect(enemyPose(rat, a, true).pose).toBe('walk');
    rat.act = BossAct.Idle;
    rat.stun = 1;
    expect(enemyPose(rat, a, true).pose).toBe('walk');
    const egg = spawnEnemy(w, 'spiderEgg', 100, 0);
    expect(enemyPose(egg, ENEMY_ANIMS['enemy.spiderEgg'] as EnemyAnim, true).pose).toBe('walk');
    // An enemy without an attack strip keeps walking.
    expect(enemyPose(rat, { ...a, frames: { walk: 5 } }, true).pose).toBe('walk');
  });

  it('loops the attack strip and finds reach from the contact range plus a margin', () => {
    const a = ENEMY_ANIMS['enemy.rat'] as EnemyAnim;
    const n = a.frames.attack as number;
    expect(poseFrame(a, 'attack', -1, 0)).toBe(0);
    expect(poseFrame(a, 'attack', -1, 100 / a.fps.attack + 0.001)).toBeLessThan(n);
    const w = bareWorld();
    const rat = spawnEnemy(w, 'rat', 0, 0);
    const touch = rat.def.radius + config.player.radius;
    expect(inReach(rat, touch, 0)).toBe(true);
    expect(inReach(rat, touch + 3, 0)).toBe(true);
    expect(inReach(rat, touch + 30, 0)).toBe(false);
  });

  it('the goblin throws from its windup and the crow dives by its air time', () => {
    const w = bareWorld();
    const goblin = spawnEnemy(w, 'goblin', 100, 0);
    goblin.act = BossAct.Windup;
    goblin.actT = ENEMIES.goblin.shoot.windup * 0.1;
    expect(enemyPose(goblin, ENEMY_ANIMS['enemy.goblin'] as EnemyAnim).pose).toBe('strike');
    goblin.actT = ENEMIES.goblin.shoot.windup * 0.9;
    expect(enemyPose(goblin, ENEMY_ANIMS['enemy.goblin'] as EnemyAnim).pose).toBe('windup');
    const crow = spawnEnemy(w, 'crow', 100, 0);
    crow.act = BossAct.Active;
    crow.actT = ENEMIES.crow.leap.air * 0.5;
    const p = enemyPose(crow, ENEMY_ANIMS['enemy.crow'] as EnemyAnim, true);
    expect(p.pose).toBe('strike');
    expect(p.k).toBeCloseTo(0.5);
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
