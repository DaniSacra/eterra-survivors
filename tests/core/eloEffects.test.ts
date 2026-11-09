import { describe, expect, it } from 'vitest';
import { applyDot, rebuildEnemyHash, spawnEnemy } from '../../src/core/enemies';
import { updateProjectiles } from '../../src/core/projectiles';
import { STARLET } from '../../src/core/projectiles';
import { updateWeapons } from '../../src/core/weapons';
import type { World } from '../../src/core/world';
import { config } from '../../src/data/config';
import { WEAPONS, type WeaponId } from '../../src/data/weapons';
import { bareWorld } from './helpers';

/** Weapons and shots for `t` seconds, with the enemy hash rebuilt each frame as `World.step` does. */
function run(w: World, t: number): void {
  for (let s = 0; s < t; s += 1 / 60) {
    rebuildEnemyHash(w);
    updateWeapons(w, 1 / 60);
    updateProjectiles(w, 1 / 60);
  }
}

function armed(id: WeaponId): World {
  const w = bareWorld();
  w.addWeapon(id);
  w.player.facing.x = 1;
  w.player.facing.y = 0;
  return w;
}

const tough = (w: World, x: number, y: number) => {
  const e = spawnEnemy(w, 'skeleton', x, y);
  e.hp = e.maxHp = 1e6;
  e.def = { ...e.def, knockbackResist: 1 };
  return e;
};

describe('Fúria: the cutting wave', () => {
  const def = WEAPONS.fury;
  const l = def.levels[0]!;

  it('every third blow sends a wave ahead that cuts through everything in its line', () => {
    const w = armed('fury');
    const a = tough(w, l.range + 60, 0);
    const b = tough(w, l.range + 120, 0);
    const swings = () => {
      w.weapons[0]!.timer = 0;
      run(w, 1 / 60);
    };
    for (let i = 0; i < def.wave.every - 1; i++) swings();
    expect(w.projectiles.size).toBe(0);
    swings();
    expect(w.projectiles.size).toBe(1);
    w.weapons[0]!.timer = 99;
    run(w, def.wave.lifetime);
    const hit = l.damage * def.wave.damage;
    expect(a.maxHp - a.hp).toBeCloseTo(hit);
    expect(b.maxHp - b.hp).toBeCloseTo(hit);
  });
});

describe('Estrela de Lyra: the stars that fall', () => {
  const def = WEAPONS.lyraStar;
  const l = def.levels[0]!;

  it('the burst throws small stars around it that land and burst again, without splitting', () => {
    const w = armed('lyraStar');
    w.player.stats.amount = 1 - l.count; // a single orb
    const target = tough(w, 60, 0);
    run(w, 0.2);
    w.weapons[0]!.timer = 99;
    const stars = w.projectiles.active.filter((p) => p.sprite === STARLET);
    expect(stars).toHaveLength(def.split.count);
    expect(stars.every((s) => s.damage === l.damage * def.split.scale)).toBe(true);
    const bursts = w.bolts.size;
    // An enemy where one star will land.
    const s0 = stars[0]!;
    const lx = s0.x + Math.cos(s0.angle) * def.split.distance;
    const ly = s0.y + Math.sin(s0.angle) * def.split.distance;
    const landing = tough(w, lx, ly);
    run(w, def.split.fall + 0.05);
    expect(landing.hp).toBeLessThan(landing.maxHp);
    expect(w.bolts.size).toBeGreaterThan(bursts);
    run(w, 1);
    expect(w.projectiles.active.filter((p) => p.sprite === STARLET)).toHaveLength(0);
    expect(target.hp).toBeLessThan(target.maxHp);
  });
});

describe('Leque de Facas: ricochet and bleeding', () => {
  const def = WEAPONS.fan;
  const l = def.levels[0]!;

  it('a knife that hits bounces to the nearest enemy it has not hit, up to `ricochet.count` times', () => {
    const w = armed('fan');
    w.player.stats.amount = 1 - l.count; // a single knife
    const first = tough(w, 60, 0);
    const second = tough(w, 60, 100);
    const third = tough(w, 160, 100);
    run(w, 0.02);
    w.weapons[0]!.timer = 99;
    run(w, 1);
    for (const e of [first, second, third]) expect(e.hp).toBeLessThan(e.maxHp);
    expect(w.projectiles.size).toBe(0);
  });

  it('a critical hit makes the enemy bleed: damage over time, emerald tint', () => {
    const w = armed('fan');
    w.player.stats.amount = 1 - l.count;
    w.rng.next = () => 0; // every hit a crit
    const e = tough(w, 60, 0);
    run(w, 0.15);
    w.weapons[0]!.timer = 99;
    const crit = l.damage * def.crit.mult;
    expect(e.dot).toBeGreaterThan(0);
    expect(e.dotKind).toBe('bleed');
    expect(e.dotDps).toBeCloseTo(crit * def.bleed.dps);
    const hp = e.hp;
    for (let t = 0; t < 1; t += 1 / 60) w.step(1 / 60, { x: 0, y: 0 });
    expect(hp - e.hp).toBeGreaterThan(0);
  });
});

describe('damage over time', () => {
  it('ticks every config.dotTick for its duration, crediting its weapon, then stops', () => {
    const w = bareWorld();
    w.addWeapon('fan');
    const source = w.weapons[0]!;
    w.weapons.length = 0; // only the bleeding hurts it
    const e = tough(w, 300, 0);
    applyDot(e, 'bleed', 10, 2, source);
    for (let t = 0; t < 3; t += 1 / 60) w.step(1 / 60, { x: 0, y: 0 });
    expect(e.maxHp - e.hp).toBeCloseTo(20, 0);
    expect(source.damage).toBeCloseTo(20, 0);
    expect(e.dot).toBeLessThanOrEqual(0);
    expect(config.dotTick).toBeGreaterThan(0);
  });

  it('the stronger one stays; a weaker one only lengthens it', () => {
    const w = bareWorld();
    const e = tough(w, 300, 0);
    applyDot(e, 'bleed', 10, 1, null);
    applyDot(e, 'burn', 4, 3, null);
    expect(e.dotDps).toBe(10);
    expect(e.dotKind).toBe('bleed');
    expect(e.dot).toBe(3);
  });
});
