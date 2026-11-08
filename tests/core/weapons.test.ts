import { describe, expect, it } from 'vitest';
import { rebuildEnemyHash, spawnEnemy } from '../../src/core/enemies';
import { updateWeapons as rawUpdate } from '../../src/core/weapons';
import type { World } from '../../src/core/world';
import { WEAPONS, WEAPON_IDS } from '../../src/data/weapons';
import { bareWorld, still } from './helpers';

const blade = WEAPONS.blade.levels[0]!;
const light = WEAPONS.elunLight.levels[0]!;
const aura = WEAPONS.yahAura.levels[0]!;

/** Weapons rely on the enemy hash, which `World.step` rebuilds before them. */
function updateWeapons(w: World, dt: number) {
  rebuildEnemyHash(w);
  rawUpdate(w, dt);
}

function prepared(id: 'blade' | 'elunLight' | 'yahAura') {
  const w = bareWorld();
  w.addWeapon(id);
  return w;
}

describe('weapon data', () => {
  it('every level has damage and cooldown > 0', () => {
    for (const id of WEAPON_IDS)
      for (const l of WEAPONS[id].levels) {
        expect(l.damage).toBeGreaterThan(0);
        expect(l.cooldown).toBeGreaterThan(0);
      }
  });
});

describe('Lâmina de Valmor (arc)', () => {
  it('hits enemies in front, not behind', () => {
    const w = prepared('blade');
    w.player.facing.x = 1;
    const front = spawnEnemy(w, 'slime', 40, 0);
    const back = spawnEnemy(w, 'slime', -40, 0);
    w.step(1 / 60, still);
    expect(front.hp).toBeLessThan(front.maxHp);
    expect(back.hp).toBe(back.maxHp);
    expect(w.slashes.size).toBe(1);
  });

  it('respects range and cooldown, and pushes enemies back', () => {
    const w = prepared('blade');
    const near = spawnEnemy(w, 'slime', 40, 0);
    const far = spawnEnemy(w, 'slime', blade.range + 60, 0);
    updateWeapons(w, 0);
    expect(far.hp).toBe(far.maxHp);
    expect(near.kbx).toBeGreaterThan(0);
    const hp = near.hp;
    updateWeapons(w, blade.cooldown / 2);
    expect(near.hp).toBe(hp);
  });

  it('scales with might', () => {
    const w = prepared('blade');
    w.player.stats.might = 2;
    const e = spawnEnemy(w, 'blackKnight', 40, 0);
    updateWeapons(w, 0);
    expect(e.maxHp - e.hp).toBe(blade.damage * 2);
  });
});

describe('Luz de Elun (homing)', () => {
  it('does not fire without targets, then seeks the nearest enemy', () => {
    const w = prepared('elunLight');
    w.step(1 / 60, still);
    expect(w.projectiles.size).toBe(0);
    const near = spawnEnemy(w, 'slime', 0, -120);
    const far = spawnEnemy(w, 'slime', 300, 0);
    for (let i = 0; i < 60 && near.hp === near.maxHp; i++) w.step(1 / 60, still);
    expect(near.hp).toBe(near.maxHp - light.damage);
    expect(far.hp).toBe(far.maxHp);
  });

  it('curves towards a moving target and expires after hitting', () => {
    const w = prepared('elunLight');
    const e = spawnEnemy(w, 'blackKnight', 200, 0);
    w.step(1 / 60, still);
    expect(w.projectiles.size).toBe(1);
    e.y = 150; // the target dodges sideways
    for (let i = 0; i < 120 && e.hp === e.maxHp; i++) w.step(1 / 60, still);
    expect(e.hp).toBeLessThan(e.maxHp);
    expect(w.projectiles.size).toBe(0);
  });

  it('fires one shot per count, at distinct targets when possible', () => {
    const w = prepared('elunLight');
    w.weapons[0]!.level = 4; // count 3
    spawnEnemy(w, 'slime', 100, 0);
    spawnEnemy(w, 'slime', -100, 0);
    w.step(1 / 60, still);
    expect(w.projectiles.size).toBe(3);
    const targets = new Set(w.projectiles.active.map((p) => p.targetUid));
    expect(targets.size).toBe(2);
  });
});

describe('Aura de Yah (area)', () => {
  it('damages every enemy inside the radius on each tick', () => {
    const w = prepared('yahAura');
    const a = spawnEnemy(w, 'blackKnight', 20, 0);
    const b = spawnEnemy(w, 'blackKnight', -20, 10);
    const out = spawnEnemy(w, 'skeleton', aura.radius + 80, 0);
    updateWeapons(w, 0);
    updateWeapons(w, aura.cooldown);
    expect(a.maxHp - a.hp).toBe(aura.damage * 2);
    expect(b.maxHp - b.hp).toBe(aura.damage * 2);
    expect(out.hp).toBe(out.maxHp);
  });
});

describe('damage numbers', () => {
  it('appear on hit, rise and fade', () => {
    const w = prepared('yahAura');
    spawnEnemy(w, 'blackKnight', 10, 0);
    w.step(1 / 60, still);
    expect(w.damageNumbers.size).toBe(1);
    const y = w.damageNumbers.active[0]!.y;
    w.step(0.05, still);
    expect(w.damageNumbers.active[0]!.y).toBeLessThan(y);
    for (let i = 0; i < 60; i++) w.step(1 / 60, still);
    expect(w.damageNumbers.size).toBeLessThanOrEqual(2);
  });
});
