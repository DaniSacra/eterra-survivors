import { describe, expect, it } from 'vitest';
import { spawnEnemy } from '../../src/core/enemies';
import { dropPickup } from '../../src/core/pickups';
import { applyUpgrade, candidates, chestReward, eloStatus, readyEvolution } from '../../src/core/upgrades';
import { maxLevel, weaponPower } from '../../src/core/weapons';
import { weaponUsed, newSave, recordRun } from '../../src/core/meta';
import { newRunSummary } from '../../src/core/records';
import { EVOLUTIONS, EVOLVED_IDS } from '../../src/data/evolutions';
import { ENEMIES, type EnemyDef } from '../../src/data/enemies';
import { WEAPONS } from '../../src/data/weapons';
import { STAGES } from '../../src/data/stages';

const ELITES = STAGES.valmor.elites;
import { quietWorld, still } from './helpers';

function maxBlade() {
  const w = quietWorld();
  w.weapons[0]!.level = maxLevel('blade');
  return w;
}

describe('evolution data', () => {
  it('evolves from a non-evolved weapon, and evolved forms have one level', () => {
    for (const id of EVOLVED_IDS) {
      const evo = EVOLUTIONS[id]!;
      expect(EVOLUTIONS[evo.from]).toBeUndefined();
      expect(WEAPONS[id].levels).toHaveLength(1);
      expect(WEAPONS[id].kind).toBe(WEAPONS[evo.from].kind);
    }
  });
});

describe('evolutions', () => {
  it('need the base weapon at max level and the passive', () => {
    const w = quietWorld();
    w.passives.might = 1;
    expect(readyEvolution(w)).toBeNull();
    w.weapons[0]!.level = maxLevel('blade');
    expect(readyEvolution(w)).toEqual({ kind: 'evolution', id: 'fury', from: 'blade' });
    delete w.passives.might;
    expect(readyEvolution(w)).toBeNull();
  });

  it('are never offered on level-up, and the base is not offered again once evolved', () => {
    const w = maxBlade();
    w.passives.might = 1;
    expect(candidates(w).some((o) => o.kind === 'weapon' && EVOLVED_IDS.includes(o.id))).toBe(false);
    dropPickup(w, 'chest', w.player.x, w.player.y);
    w.step(1 / 60, still);
    expect(w.weapons[0]).toMatchObject({ id: 'fury', level: 1 });
    expect(candidates(w).some((o) => o.kind === 'weapon' && o.id === 'blade')).toBe(false);
  });
});

describe('chests', () => {
  it('evolve when a recipe is ready and announce it', () => {
    const w = maxBlade();
    w.passives.might = 1;
    dropPickup(w, 'chest', w.player.x + 5, w.player.y);
    w.step(1 / 60, still);
    expect(w.pickups.size).toBe(0);
    expect(w.events).toContainEqual({
      type: 'chest',
      reward: { kind: 'evolution', id: 'fury', from: 'blade' },
    });
  });

  it('otherwise level up something already owned (never a new weapon)', () => {
    const w = quietWorld();
    for (let i = 0; i < 20; i++) {
      const r = chestReward(w);
      expect(r.kind === 'weapon' ? r.id === 'blade' && r.level > 1 : r.kind !== 'passive').toBe(true);
    }
  });

  it('a reward card when nothing can be levelled', () => {
    const w = maxBlade();
    expect(chestReward(w).kind).toBe('reward');
  });

  it('stay on the ground until touched', () => {
    const w = quietWorld();
    dropPickup(w, 'chest', 300, 0);
    w.step(1 / 60, still);
    expect(w.pickups.size).toBe(1);
  });
});

describe('elites', () => {
  it('drop a chest on death', () => {
    const w = quietWorld();
    const e = spawnEnemy(w, 'goblin', 200, 0);
    e.dead = true;
    w.step(1 / 60, still);
    expect(w.pickups.active.map((p) => p.type)).toEqual(['chest']);
  });

  it('spawn on schedule, once each', () => {
    const w = quietWorld();
    w.spawner.update = Object.getPrototypeOf(w.spawner).update;
    w.time = ELITES[0]!.at;
    w.step(1 / 60, still);
    w.step(1 / 60, still);
    expect(w.enemies.active.filter((e) => e.def.elite)).toHaveLength(1);
    expect(w.events).toContainEqual({ type: 'eliteSpawned' });
    for (const el of ELITES) expect((ENEMIES[el.id] as EnemyDef).elite).toBe(true);
  });
});

describe('Elo moments', () => {
  it('announces a ready Elo once, when the last piece of the recipe is taken', () => {
    const w = quietWorld();
    w.weapons[0]!.level = maxLevel('blade') - 1;
    applyUpgrade(w, { kind: 'passive', id: 'might', level: 1 });
    expect(w.events.filter((e) => e.type === 'eloReady')).toEqual([]);
    applyUpgrade(w, { kind: 'weapon', id: 'blade', level: maxLevel('blade') });
    expect(w.events.filter((e) => e.type === 'eloReady')).toEqual([{ type: 'eloReady', weapon: 'blade' }]);
    applyUpgrade(w, { kind: 'passive', id: 'might', level: 2 });
    expect(w.events.filter((e) => e.type === 'eloReady')).toHaveLength(1);
  });

  it('weapon power: damage x hits per cast / cooldown, and every Elo beats its base at max level', () => {
    const blade = WEAPONS.blade.levels[0]!;
    expect(weaponPower('blade')).toBeCloseTo((blade.damage * blade.swings) / blade.cooldown);
    for (const id of EVOLVED_IDS) {
      const from = EVOLUTIONS[id]!.from;
      expect(weaponPower(id)).toBeGreaterThan(weaponPower(from, maxLevel(from)));
    }
  });

  it('the Livro de Elos knows a recipe once its base weapon was used in a run', () => {
    const save = newSave();
    expect(weaponUsed(save, 'mace')).toBe(false);
    recordRun(save, { ...newRunSummary(), hero: 'lyra', weapons: ['lightning', 'mace'] });
    expect(weaponUsed(save, 'mace')).toBe(true);
    expect(weaponUsed(save, 'bells')).toBe(false);
  });
});

describe('Elo status (pause screen)', () => {
  it('tells what is missing, ready or formed', () => {
    const w = quietWorld();
    expect(eloStatus(w, 'blade')).toEqual({
      kind: 'missing',
      levels: maxLevel('blade') - 1,
      passive: 'might',
    });
    w.passives.might = 1;
    expect(eloStatus(w, 'blade')).toEqual({ kind: 'missing', levels: maxLevel('blade') - 1, passive: null });
    w.weapons[0]!.level = maxLevel('blade');
    expect(eloStatus(w, 'blade')).toEqual({ kind: 'ready' });
    applyUpgrade(w, { kind: 'evolution', id: 'fury', from: 'blade' });
    expect(eloStatus(w, 'fury')).toEqual({ kind: 'formed' });
  });
});
