import { describe, expect, it } from 'vitest';
import { spawnEnemy } from '../../src/core/enemies';
import { almostElo, passiveReport, weaponReport } from '../../src/core/report';
import { PASSIVES } from '../../src/data/upgrades';
import { maxLevel } from '../../src/core/weapons';
import { WEAPONS } from '../../src/data/weapons';
import { bareWorld, forgeFury, quietWorld, still } from './helpers';

describe('end-of-run report', () => {
  it('credits each weapon with the damage it dealt, never more than the enemy had', () => {
    const w = bareWorld();
    w.addWeapon('yahAura');
    w.addWeapon('daggers');
    const e = spawnEnemy(w, 'skeleton', 10, 0);
    for (let i = 0; i < 120; i++) w.step(1 / 60, still);
    const [aura, daggers] = weaponReport(w);
    expect(e.dead || e.poolIndex === -1).toBe(true);
    expect(aura!.damage + daggers!.damage).toBeCloseTo(e.maxHp);
  });

  it('credits projectiles and frost to the weapon that made them', () => {
    for (const id of ['elunLight', 'frost'] as const) {
      const w = bareWorld();
      w.addWeapon(id);
      spawnEnemy(w, 'blackKnight', 120, 0);
      for (let i = 0; i < 90; i++) w.step(1 / 60, still);
      expect(weaponReport(w)[0]!.damage).toBeGreaterThanOrEqual(WEAPONS[id].levels[0]!.damage);
    }
  });

  it('measures time owned and DPS from when the weapon was picked up', () => {
    const w = bareWorld();
    w.time = 100;
    w.addWeapon('blade');
    w.weapons[0]!.damage = 500;
    w.time = 150;
    expect(weaponReport(w)[0]).toMatchObject({ id: 'blade', time: 50, dps: 10 });
  });

  it('keeps the damage through an evolution, under the evolved name', () => {
    const w = quietWorld();
    w.weapons[0]!.damage = 1234;
    forgeFury(w);
    expect(weaponReport(w)[0]).toMatchObject({ id: 'fury', damage: 1234 });
  });

  it('lists the passives taken with their levels', () => {
    const w = quietWorld();
    w.passives.might = 2;
    w.passives.vigor = 1;
    expect(passiveReport(w)).toEqual([
      { id: 'vigor', level: 1 },
      { id: 'might', level: 2 },
    ]);
  });

  it('almostElo: a recipe one level short, of the weapon or of the passive', () => {
    const w = quietWorld();
    const blade = w.weapons[0];
    if (!blade) throw new Error('aldo starts with the blade');
    expect(almostElo(w)).toBeNull();
    w.passives.might = PASSIVES.might.maxLevel;
    blade.level = maxLevel('blade') - 1;
    expect(almostElo(w)).toEqual({ weapon: 'blade', elo: 'fury', missing: 'weapon', passive: 'might' });
    blade.level = maxLevel('blade');
    w.passives.might = PASSIVES.might.maxLevel - 1;
    expect(almostElo(w)).toEqual({ weapon: 'blade', elo: 'fury', missing: 'passive', passive: 'might' });
    w.passives.might = PASSIVES.might.maxLevel - 2;
    expect(almostElo(w)).toBeNull();
    forgeFury(w);
    expect(almostElo(w)).toBeNull();
  });
});
