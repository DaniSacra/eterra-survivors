import { describe, expect, it } from 'vitest';
import { rebuildEnemyHash, spawnEnemy } from '../../src/core/enemies';
import { updateWeapons } from '../../src/core/weapons';
import { WEAPONS } from '../../src/data/weapons';
import { bareWorld, still } from './helpers';

describe('Leque de Facas', () => {
  it('always throws a knife straight ahead (no blind spot in front)', () => {
    const w = bareWorld();
    w.addWeapon('fan');
    w.player.facing.x = 1;
    w.player.facing.y = 0;
    const e = spawnEnemy(w, 'blackKnight', 100, 0);
    e.def = { ...e.def, speed: 0 };
    for (let i = 0; i < 20; i++) w.step(1 / 60, still);
    expect(e.hp).toBeLessThan(e.maxHp);
    expect(
      w.projectiles.active.some((p) => Math.abs(Math.sin(p.angle)) < 1e-9 && Math.cos(p.angle) > 0),
    ).toBe(true);
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
    expect(e.maxHp - e.hp).toBe(WEAPONS.blade.levels[2]!.damage);
  });
});
