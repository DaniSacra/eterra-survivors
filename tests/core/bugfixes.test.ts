import { describe, expect, it } from 'vitest';
import { rebuildEnemyHash, spawnEnemy } from '../../src/core/enemies';
import { updateWeapons } from '../../src/core/weapons';
import { WEAPONS } from '../../src/data/weapons';
import { bareWorld, still } from './helpers';

describe('Leque de Facas', () => {
  it('throws a forward fan at the nearest enemy, most knives on one target', () => {
    const w = bareWorld();
    w.addWeapon('fan');
    w.player.facing.x = 1; // facing away from the target: the fan aims, it does not follow the facing
    w.player.facing.y = 0;
    const e = spawnEnemy(w, 'blackKnight', 0, 90);
    e.def = { ...e.def, speed: 0, knockbackResist: 1 };
    rebuildEnemyHash(w);
    updateWeapons(w, 1 / 60);
    const s = WEAPONS.fan.levels[0]!;
    const half = ((s.count - 1) / 2) * s.spread + 1e-9;
    expect(w.projectiles.size).toBe(s.count);
    for (const p of w.projectiles.active) expect(Math.abs(p.angle - Math.PI / 2)).toBeLessThanOrEqual(half);
    for (let i = 0; i < 30; i++) w.step(1 / 60, still);
    // At 90 px at least 3 knives of the first volley land (a ring of 10 landed one).
    expect(e.maxHp - e.hp).toBeGreaterThanOrEqual(3 * s.damage);
  });

  it('a throw that covers the whole circle keeps one knife straight ahead (no blind spot)', () => {
    const lv = WEAPONS.fan.levels[0] as { spread: number };
    const spread = lv.spread;
    lv.spread = (Math.PI * 2) / 10;
    try {
      const w = bareWorld();
      w.addWeapon('fan');
      w.player.facing.x = 1;
      w.player.facing.y = 0;
      updateWeapons(w, 1 / 60); // nobody around: thrown where the hero faces
      expect(
        w.projectiles.active.some((p) => Math.abs(Math.sin(p.angle)) < 1e-9 && Math.cos(p.angle) > 0),
      ).toBe(true);
    } finally {
      lv.spread = spread;
    }
  });
});

describe('random-target weapons in portrait', () => {
  it('only pick enemies inside the visible rectangle', () => {
    for (const id of ['lightning', 'frost'] as const) {
      const w = bareWorld();
      w.setView(390, 844);
      w.addWeapon(id);
      // Off screen to the sides (within the old max(w,h)/2 reach), and one inside.
      const sides = [spawnEnemy(w, 'blackKnight', 300, 0), spawnEnemy(w, 'blackKnight', -300, 0)];
      const inside = spawnEnemy(w, 'blackKnight', 0, 350);
      for (const e of [...sides, inside]) e.def = { ...e.def, speed: 0 };
      for (let i = 0; i < 600; i++) w.step(1 / 60, still);
      for (const e of sides) expect(e.hp).toBe(e.maxHp);
      expect(inside.hp).toBeLessThan(inside.maxHp);
    }
  });
});

describe('Lâmina with two swings', () => {
  it('hits an enemy standing on the hero once per attack', () => {
    const w = bareWorld();
    w.addWeapon('blade');
    w.weapons[0]!.level = 3;
    expect(WEAPONS.blade.levels[2]!.swings).toBe(2);
    const e = spawnEnemy(w, 'blackKnight', 0, 0);
    rebuildEnemyHash(w);
    updateWeapons(w, 1);
    expect(e.maxHp - e.hp).toBeCloseTo(WEAPONS.blade.levels[2]!.damage);
  });
});
