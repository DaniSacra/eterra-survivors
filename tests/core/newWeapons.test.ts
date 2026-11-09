import { describe, expect, it } from 'vitest';
import { rebuildEnemyHash, spawnEnemy } from '../../src/core/enemies';
import { orbitAngle, updateWeapons as rawUpdate } from '../../src/core/weapons';
import type { World } from '../../src/core/world';
import { config } from '../../src/data/config';
import { WEAPONS, type WeaponId } from '../../src/data/weapons';
import { Rng } from '../../src/core/math';
import { bareWorld, still } from './helpers';

function prepared(id: WeaponId) {
  const w = bareWorld();
  w.addWeapon(id);
  return w;
}

function updateWeapons(w: World, dt: number) {
  rebuildEnemyHash(w);
  rawUpdate(w, dt);
}

describe('Adagas de Andilla (thrown, aimed)', () => {
  it('throws at the nearest enemy, whatever way Andilla walks', () => {
    const w = prepared('daggers');
    w.player.facing.x = 1; // walking right...
    w.player.facing.y = 0;
    const far = spawnEnemy(w, 'blackKnight', 200, 0);
    const near = spawnEnemy(w, 'blackKnight', -100, 0); // ...with the nearest enemy on the left
    for (const e of [far, near]) e.def = { ...e.def, speed: 0 };
    w.step(1 / 60, still);
    const s = WEAPONS.daggers.levels[0]!;
    expect(w.projectiles.size).toBe(s.count);
    expect(w.projectiles.active[0]!.sprite).toBe('proj.daggers');
    for (const p of w.projectiles.active) expect(Math.cos(p.angle)).toBeLessThan(0);
    for (let i = 0; i < 30; i++) w.step(1 / 60, still);
    expect(near.hp).toBeLessThan(near.maxHp);
    expect(far.hp).toBe(far.maxHp);
  });

  it('with nobody around, throws where Andilla faces', () => {
    const w = prepared('daggers');
    w.player.facing.x = 0;
    w.player.facing.y = 1;
    w.step(1 / 60, still);
    for (const p of w.projectiles.active) expect(Math.sin(p.angle)).toBeGreaterThan(0.9);
  });

  it('Mãos Ligeiras adds a shot', () => {
    const w = prepared('daggers');
    w.player.stats.amount = 1;
    w.step(1 / 60, still);
    expect(w.projectiles.size).toBe(WEAPONS.daggers.levels[0]!.count + 1);
  });
});

describe('Martelo do Gaspar (thrown, facing)', () => {
  it('flies where the hero walks, even with an enemy elsewhere', () => {
    const w = prepared('hammer');
    w.player.facing.x = 1;
    w.player.facing.y = 0;
    spawnEnemy(w, 'blackKnight', -100, 0);
    w.step(1 / 60, still);
    expect(Math.cos(w.projectiles.active[0]!.angle)).toBeGreaterThan(0.9);
  });
});

describe('Espadas dos Paladinos (orbit)', () => {
  it('hurts what the circling blade touches, not what is far', () => {
    const w = prepared('paladinSwords');
    const s = WEAPONS.paladinSwords.levels[0]!;
    const a = orbitAngle(0, s.spin, 0, 1);
    const hit = spawnEnemy(w, 'blackKnight', Math.cos(a) * s.orbitRadius, Math.sin(a) * s.orbitRadius);
    const away = spawnEnemy(w, 'blackKnight', -300, 0);
    updateWeapons(w, 0);
    expect(hit.maxHp - hit.hp).toBeCloseTo(s.damage);
    expect(away.hp).toBe(away.maxHp);
  });

  it('sweeps the whole circle between cooldowns, re-hitting each enemy only after its cooldown', () => {
    const w = prepared('paladinSwords');
    const s = WEAPONS.paladinSwords.levels[0]!;
    const ring = [0, 1, 2, 3].map((k) =>
      spawnEnemy(w, 'blackKnight', Math.cos(k * 1.57) * s.orbitRadius, Math.sin(k * 1.57) * s.orbitRadius),
    );
    for (const e of ring) e.def = { ...e.def, speed: 0 };
    const turn = (2 * Math.PI) / s.spin;
    for (let t = 0; t < turn; t += 1 / 60) {
      updateWeapons(w, 1 / 60);
      w.time += 1 / 60;
    }
    for (const e of ring) expect(e.maxHp - e.hp).toBeGreaterThanOrEqual(s.damage);
    const before = ring[0]!.hp;
    updateWeapons(w, 0);
    expect(ring[0]!.hp).toBe(before);
  });
});

describe('Geada de Lyra (zone)', () => {
  it('drops frost on an enemy, which hurts on ticks, slows and fades', () => {
    const w = prepared('frost');
    const s = WEAPONS.frost.levels[0]!;
    const e = spawnEnemy(w, 'blackKnight', 120, 0);
    w.step(1 / 60, still);
    expect(w.zones.size).toBe(1);
    expect(e.maxHp - e.hp).toBeCloseTo(s.damage);
    expect(e.slow).toBeGreaterThan(0);
    const x = e.x;
    w.step(0.1, still);
    const slowed = x - e.x;
    for (let i = 0; i < 30; i++) w.step(1 / 60, still);
    expect(e.maxHp - e.hp).toBeCloseTo(s.damage * 2);
    w.weapons.length = 0;
    for (let i = 0; i < 60 * s.duration; i++) w.step(1 / 60, still);
    expect(w.zones.size).toBe(0);
    expect(slowed).toBeLessThan(e.def.speed * 0.1 * 0.9);
  });

  it('waits when there is nobody to freeze', () => {
    const w = prepared('frost');
    w.step(1 / 60, still);
    expect(w.zones.size).toBe(0);
    expect(w.weapons[0]!.timer).toBe(config.weapons.idleRetry);
  });
});

describe('Raio de Lyra (strike)', () => {
  it('hits random enemies on screen with a bolt', () => {
    const w = prepared('lightning');
    const s = WEAPONS.lightning.levels[0]!;
    const near = spawnEnemy(w, 'blackKnight', 100, 50);
    const offscreen = spawnEnemy(w, 'blackKnight', 5000, 0);
    for (let i = 0; i < 10; i++) w.step(1 / 60, still);
    expect(near.maxHp - near.hp).toBeCloseTo(s.damage);
    expect(offscreen.hp).toBe(offscreen.maxHp);
    expect(w.bolts.size).toBe(1);
  });

  it('strikes the nearest enemy first', () => {
    for (let seed = 1; seed <= 5; seed++) {
      const w = prepared('lightning');
      Object.assign(w, { rng: new Rng(seed) });
      const others = [spawnEnemy(w, 'blackKnight', 180, 0), spawnEnemy(w, 'blackKnight', -150, 120)];
      const nearest = spawnEnemy(w, 'blackKnight', 60, 60);
      w.step(1 / 60, still);
      expect(nearest.hp).toBeLessThan(nearest.maxHp);
      for (const e of others) expect(e.hp).toBe(e.maxHp);
    }
  });
});
