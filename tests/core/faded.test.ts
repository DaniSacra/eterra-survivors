import { describe, expect, it } from 'vitest';
import { isFaded } from '../../src/core/behaviours';
import { BossAct } from '../../src/core/bosses';
import { rebuildEnemyHash, spawnEnemy, type Enemy } from '../../src/core/enemies';
import { TAU } from '../../src/core/math';
import { dropPickup } from '../../src/core/pickups';
import { nearestEnemy, randomEnemyNear, updateProjectiles } from '../../src/core/projectiles';
import type { World } from '../../src/core/world';
import { bareWorld, still } from './helpers';

const STEP = 1 / 60;

/** A ghost that stays faded for a while. */
function fadedGhost(w: World, x: number, y: number): Enemy {
  const g = spawnEnemy(w, 'ghost', x, y);
  g.act = BossAct.Active;
  g.actT = 5;
  expect(isFaded(g)).toBe(true);
  return g;
}

/** A straight shot flying right from (x, 0). */
function shoot(w: World, x: number, pierce: number) {
  const p = w.projectiles.acquire();
  Object.assign(p, { x, y: 0, angle: 0, speed: 300, turnRate: 0, damage: 5, knockback: 0, radius: 6 });
  Object.assign(p, { pierce, ttl: 2, sprite: '', source: null, target: null, targetUid: 0, dead: false });
  p.hits.length = 0;
  return p;
}

/** Flies the shots for a second without moving the enemies. */
function fly(w: World): void {
  rebuildEnemyHash(w);
  for (let i = 0; i < 60; i++) updateProjectiles(w, STEP);
}

describe('faded ghosts', () => {
  it('let a shot pass through and hit the enemy behind', () => {
    const w = bareWorld();
    const ghost = fadedGhost(w, 100, 0);
    const skel = spawnEnemy(w, 'skeleton', 140, 0);
    shoot(w, 90, 0);
    fly(w);
    expect(ghost.hp).toBe(ghost.maxHp);
    expect(skel.hp).toBeLessThan(skel.maxHp);
  });

  it('are never picked as a target', () => {
    const w = bareWorld();
    fadedGhost(w, 20, 0);
    const skel = spawnEnemy(w, 'skeleton', 60, 0);
    rebuildEnemyHash(w);
    expect(nearestEnemy(w, 0, 0, 200)).toBe(skel);
    for (let i = 0; i < 20; i++) expect(randomEnemyNear(w, 200, 200, [])).not.toSatisfy(isFaded);
  });

  it('are not marked as hit by an orbit (no re-hit delay when they come back)', () => {
    const w = bareWorld();
    w.addWeapon('paladinSwords');
    const ghosts: Enemy[] = [];
    for (let i = 0; i < 12; i++)
      ghosts.push(fadedGhost(w, Math.cos((i * TAU) / 12) * 70, Math.sin((i * TAU) / 12) * 70));
    w.step(STEP, still);
    for (const g of ghosts) expect(g.orbitReady[0]).toBe(0);
  });

  it('turn solid when the world freezes, so they can be hurt meanwhile', () => {
    const w = bareWorld();
    w.addWeapon('yahAura');
    const ghost = fadedGhost(w, 30, 0);
    dropPickup(w, 'freeze', 0, 0);
    for (let i = 0; i < 60; i++) w.step(STEP, still);
    expect(w.freeze).toBeGreaterThan(0);
    expect(isFaded(ghost)).toBe(false);
    expect(ghost.hp).toBeLessThan(ghost.maxHp);
  });
});

describe('piercing shots', () => {
  it('hit each enemy once and stop after pierce + 1 hits', () => {
    const w = bareWorld();
    const a = spawnEnemy(w, 'skeleton', 120, 0);
    const b = spawnEnemy(w, 'skeleton', 160, 0);
    const c = spawnEnemy(w, 'skeleton', 200, 0);
    const shot = shoot(w, 90, 1);
    fly(w);
    expect(a.maxHp - a.hp).toBeCloseTo(5);
    expect(b.maxHp - b.hp).toBeCloseTo(5);
    expect(c.hp).toBe(c.maxHp);
    expect(shot.dead).toBe(true);
  });
});
