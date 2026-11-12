import { describe, expect, it } from 'vitest';
import { spawnEnemy } from '../../src/core/enemies';
import { dropPickup } from '../../src/core/pickups';
import {
  applyUpgrade,
  candidates,
  eloReady,
  eloStatus,
  movesRecipe,
  openChest,
  rollUpgrades,
} from '../../src/core/upgrades';
import { maxLevel } from '../../src/core/weapons';
import { weaponUsed, newSave, recordRun } from '../../src/core/meta';
import { newRunSummary } from '../../src/core/records';
import { ELEMENTS, EVOLUTIONS, EVOLVED_IDS } from '../../src/data/evolutions';

const elementOf = (id: WeaponId) => EVOLUTIONS[id]?.element ?? null;
import { ELEMENT_COLOR } from '../../src/render/ui';
import { ENEMIES, type EnemyDef } from '../../src/data/enemies';
import { WEAPONS, type WeaponId } from '../../src/data/weapons';
import { CHEST } from '../../src/data/pickups';
import { PASSIVES } from '../../src/data/upgrades';
import { STAGES } from '../../src/data/stages';

const ELITES = STAGES.valmor.elites;
import { quietWorld, still } from './helpers';

describe('evolution data', () => {
  it('evolves from a non-evolved weapon, and evolved forms have one level', () => {
    for (const id of EVOLVED_IDS) {
      const evo = EVOLUTIONS[id]!;
      expect(EVOLUTIONS[evo.from]).toBeUndefined();
      expect(WEAPONS[id].levels).toHaveLength(1);
      // The Procissão is the one Elo that changes how its base fires: Fogos-Fátuos' shots become souls that hunt.
      if (id !== 'soulProcession') expect(WEAPONS[id].kind).toBe(WEAPONS[evo.from].kind);
    }
  });
});

describe('elements', () => {
  it('every Elo has an element, every element a colour, and no two elements share one', () => {
    for (const id of EVOLVED_IDS) expect(ELEMENTS).toContain(elementOf(id));
    expect(elementOf('blade')).toBeNull();
    for (const el of ELEMENTS) expect(ELEMENT_COLOR[el]).toBeTypeOf('number');
    expect(new Set(ELEMENTS.map((el) => ELEMENT_COLOR[el])).size).toBe(ELEMENTS.length);
    // Every element is used by some Elo.
    for (const el of ELEMENTS) expect(EVOLVED_IDS.some((id) => elementOf(id) === el)).toBe(true);
  });
});

describe('evolutions', () => {
  it('need the base weapon and the recipe passive both at max level', () => {
    const w = quietWorld();
    w.passives.might = PASSIVES.might.maxLevel - 1;
    w.weapons[0]!.level = maxLevel('blade');
    expect(eloReady(w, 'blade')).toBe(false);
    w.passives.might = PASSIVES.might.maxLevel;
    expect(eloReady(w, 'blade')).toBe(true);
    w.weapons[0]!.level = maxLevel('blade') - 1;
    expect(eloReady(w, 'blade')).toBe(false);
  });

  it('form on the spot when the last piece is taken, either order, with one eloForged event', () => {
    const w = quietWorld();
    w.weapons[0]!.level = maxLevel('blade') - 1;
    w.passives.might = PASSIVES.might.maxLevel - 1;
    applyUpgrade(w, { kind: 'passive', id: 'might', level: PASSIVES.might.maxLevel });
    expect(w.weapons[0]!.id).toBe('blade');
    applyUpgrade(w, { kind: 'weapon', id: 'blade', level: maxLevel('blade') });
    expect(w.weapons[0]).toMatchObject({ id: 'fury', level: 1 });
    expect(w.events.filter((e) => e.type === 'eloForged')).toEqual([
      { type: 'eloForged', elo: 'fury', from: 'blade', passive: 'might' },
    ]);
    // The other order: weapon first, then the passive.
    const v = quietWorld();
    v.weapons[0]!.level = maxLevel('blade');
    v.passives.might = PASSIVES.might.maxLevel - 1;
    applyUpgrade(v, { kind: 'passive', id: 'might', level: PASSIVES.might.maxLevel });
    expect(v.weapons[0]!.id).toBe('fury');
  });

  it('are never offered on level-up, and the base is not offered again once evolved', () => {
    const w = quietWorld();
    w.weapons[0]!.level = maxLevel('blade') - 1;
    w.passives.might = PASSIVES.might.maxLevel;
    expect(candidates(w).some((o) => o.kind === 'weapon' && EVOLVED_IDS.includes(o.id))).toBe(false);
    applyUpgrade(w, { kind: 'weapon', id: 'blade', level: maxLevel('blade') });
    expect(candidates(w).some((o) => o.kind === 'weapon' && (o.id === 'blade' || o.id === 'fury'))).toBe(
      false,
    );
  });
});

describe('level-up offers', () => {
  it('recipe pieces (a level of an owned weapon with an Elo, or its passive) come up more often', () => {
    const w = quietWorld();
    w.weapons[0]!.level = 2;
    expect(movesRecipe(w, { kind: 'weapon', id: 'blade', level: 3 })).toBe(true);
    expect(movesRecipe(w, { kind: 'passive', id: 'might', level: 1 })).toBe(true);
    expect(movesRecipe(w, { kind: 'passive', id: 'reach', level: 1 })).toBe(false);
    expect(movesRecipe(w, { kind: 'weapon', id: 'frost', level: 1 })).toBe(false);
    let might = 0;
    let reach = 0;
    for (let i = 0; i < 2000; i++)
      for (const o of rollUpgrades(w)) {
        if (o.kind === 'passive' && o.id === 'might') might++;
        if (o.kind === 'passive' && o.id === 'reach') reach++;
      }
    expect(might / reach).toBeGreaterThan(1.8);
  });
});

describe('chests', () => {
  it('give gold, a level of something owned and a heal, never an Elo by themselves', () => {
    const w = quietWorld();
    w.player.hp = 10;
    const level = w.weapons[0]!.level;
    dropPickup(w, 'chest', w.player.x + 5, w.player.y);
    w.step(1 / 60, still);
    expect(w.pickups.size).toBe(0);
    expect(w.gold).toBe(CHEST.gold);
    expect(w.player.hp).toBeCloseTo(
      Math.min(w.player.stats.maxHp, 10 + w.player.stats.maxHp * CHEST.heal),
      0,
    );
    expect(w.weapons[0]!.level).toBe(level + 1);
    expect(w.events).toContainEqual({
      type: 'chest',
      reward: { kind: 'weapon', id: 'blade', level: level + 1 },
    });
  });

  it('the level it gives can complete a recipe, and then the Elo forms', () => {
    const w = quietWorld();
    w.weapons[0]!.level = maxLevel('blade') - 1;
    w.passives.might = PASSIVES.might.maxLevel;
    openChest(w);
    expect(w.weapons[0]!.id).toBe('fury');
    // The chest opens plain and first; the forge is the moment (no "Lâmina de Valmor nível 7").
    const types = w.events.map((e) => e.type);
    expect(types.indexOf('chest')).toBeLessThan(types.indexOf('eloForged'));
    expect(w.events).toContainEqual({ type: 'chest', reward: null });
  });

  it('only gold and the heal when nothing can be levelled', () => {
    const w = quietWorld();
    w.weapons[0]!.level = maxLevel('blade');
    openChest(w);
    expect(w.events).toContainEqual({ type: 'chest', reward: null });
    expect(w.gold).toBe(CHEST.gold);
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
    const e = spawnEnemy(w, 'golem', 200, 0);
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
    expect(w.events).toContainEqual({ type: 'eliteSpawned', id: ELITES[0]!.id });
    for (const el of ELITES) expect((ENEMIES[el.id] as EnemyDef).elite).toBe(true);
  });
});

describe('Elo moments', () => {
  it('the Livro de Elos knows a recipe once its base weapon was used in a run', () => {
    const save = newSave();
    expect(weaponUsed(save, 'mace')).toBe(false);
    recordRun(save, { ...newRunSummary(), hero: 'lyra', weapons: ['lightning', 'mace'] });
    expect(weaponUsed(save, 'mace')).toBe(true);
    expect(weaponUsed(save, 'shields')).toBe(false);
  });
});

describe('Elo status (pause screen)', () => {
  it('tells the weapon and passive levels, or formed', () => {
    const w = quietWorld();
    expect(eloStatus(w, 'blade')).toEqual({
      kind: 'missing',
      weapon: 1,
      weaponMax: maxLevel('blade'),
      passive: 'might',
      passiveLevel: 0,
      passiveMax: PASSIVES.might.maxLevel,
    });
    w.passives.might = 3;
    expect(eloStatus(w, 'blade')).toMatchObject({ passiveLevel: 3 });
    w.weapons[0]!.level = maxLevel('blade') - 1;
    w.passives.might = PASSIVES.might.maxLevel - 1;
    applyUpgrade(w, { kind: 'passive', id: 'might', level: PASSIVES.might.maxLevel });
    applyUpgrade(w, { kind: 'weapon', id: 'blade', level: maxLevel('blade') });
    expect(eloStatus(w, 'fury')).toEqual({ kind: 'formed' });
    expect(eloStatus(w, 'frost')).toEqual({
      kind: 'missing',
      weapon: 0,
      weaponMax: maxLevel('frost'),
      passive: 'reach',
      passiveLevel: 0,
      passiveMax: PASSIVES.reach.maxLevel,
    });
  });
});
