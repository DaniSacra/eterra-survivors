import { describe, expect, it } from 'vitest';
import { damageEnemy, spawnEnemy, sweepDeadEnemies, updateEnemies } from '../../src/core/enemies';
import { updateMarks } from '../../src/core/marks';
import { ENEMIES } from '../../src/data/enemies';
import { bareWorld } from './helpers';

const STEP = 1 / 60;

function run(w: ReturnType<typeof bareWorld>, seconds: number): void {
  for (let t = 0; t < seconds; t += STEP) {
    updateEnemies(w, STEP);
    updateMarks(w, STEP);
    sweepDeadEnemies(w);
  }
}

describe('reassemble (FT-15)', () => {
  const re = ENEMIES.bones.reassemble as { delay: number; hp: number };

  it('the first death leaves a harmless pile with no gem or kill', () => {
    const w = bareWorld();
    const e = spawnEnemy(w, 'bones', 30, 0);
    damageEnemy(w, e, 9999);
    sweepDeadEnemies(w);
    expect(e.dead).toBe(false);
    expect(e.pile).toBeGreaterThan(0);
    expect(w.kills).toBe(0);
    expect(w.gems.size).toBe(0);
    const hp = w.player.hp;
    e.x = w.player.x;
    e.y = w.player.y;
    run(w, 0.5);
    expect(w.player.hp).toBe(hp);
  });

  it('stands up on its own with part of its life', () => {
    const w = bareWorld();
    const e = spawnEnemy(w, 'bones', 300, 0);
    damageEnemy(w, e, 9999);
    run(w, re.delay + 0.2);
    expect(e.pile).toBe(0);
    expect(e.rose).toBe(true);
    expect(e.hp).toBeCloseTo(e.maxHp * re.hp);
    expect(w.kills).toBe(0);
  });

  it('a hit on the pile breaks it for good: gem and kill', () => {
    const w = bareWorld();
    const e = spawnEnemy(w, 'bones', 300, 0);
    damageEnemy(w, e, 9999);
    damageEnemy(w, e, 1);
    sweepDeadEnemies(w);
    expect(w.kills).toBe(1);
    expect(w.gems.size).toBe(1);
  });

  it('after standing up, the next death is final', () => {
    const w = bareWorld();
    const e = spawnEnemy(w, 'bones', 300, 0);
    damageEnemy(w, e, 9999);
    run(w, re.delay + 0.2);
    damageEnemy(w, e, 9999);
    sweepDeadEnemies(w);
    expect(w.kills).toBe(1);
  });
});

describe('burst (FT-14)', () => {
  const b = ENEMIES.emberBones.burst as { delay: number; radius: number; damage: number; foes: number };

  it('leaves a mark that hurts the hero only after its delay', () => {
    const w = bareWorld();
    const e = spawnEnemy(w, 'emberBones', w.player.x + 10, w.player.y);
    damageEnemy(w, e, 9999);
    sweepDeadEnemies(w);
    expect(w.marks.size).toBe(1);
    const hp = w.player.hp;
    run(w, b.delay * 0.5);
    expect(w.player.hp).toBe(hp);
    run(w, b.delay * 0.5 + 0.1);
    expect(w.player.hp).toBeLessThan(hp);
    expect(w.marks.size).toBe(0);
  });

  it('hurts the other enemies in the radius but not outside it', () => {
    const w = bareWorld();
    w.player.x = 200;
    w.player.y = 0;
    const e = spawnEnemy(w, 'emberBones', 0, 0);
    const near = spawnEnemy(w, 'skeleton', b.radius - 10, 0);
    const far = spawnEnemy(w, 'skeleton', b.radius + 60, 0);
    near.stun = far.stun = 5;
    const nearHp = near.hp;
    const farHp = far.hp;
    damageEnemy(w, e, 9999);
    sweepDeadEnemies(w);
    run(w, b.delay + 0.1);
    expect(near.hp).toBeLessThan(nearHp);
    expect(far.hp).toBe(farHp);
  });
});
