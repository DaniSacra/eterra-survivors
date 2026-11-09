import { describe, expect, it } from 'vitest';
import {
  applyUpgrade,
  candidates,
  rollUpgrades,
  weaponLevelDiff,
  weaponsCompletedBy,
} from '../../src/core/upgrades';
import { addXp, xpToNext } from '../../src/core/xp';
import { config } from '../../src/data/config';
import { PASSIVES, PASSIVE_IDS } from '../../src/data/upgrades';
import { WEAPONS, WEAPON_IDS } from '../../src/data/weapons';
import { quietWorld, still } from './helpers';

describe('upgrades', () => {
  it('offers distinct options: new weapons, weapon levels and passives', () => {
    const w = quietWorld();
    const opts = rollUpgrades(w);
    expect(opts).toHaveLength(config.xp.choices);
    expect(new Set(opts.map((o) => JSON.stringify(o))).size).toBe(opts.length);
    const all = candidates(w);
    expect(all).toContainEqual({ kind: 'weapon', id: 'blade', level: 2 });
    expect(all).toContainEqual({ kind: 'weapon', id: 'yahAura', level: 1 });
    expect(all.filter((o) => o.kind === 'passive')).toHaveLength(PASSIVE_IDS.length);
  });

  it('adds new weapons and levels owned ones', () => {
    const w = quietWorld();
    applyUpgrade(w, { kind: 'weapon', id: 'yahAura', level: 1 });
    applyUpgrade(w, { kind: 'weapon', id: 'blade', level: 2 });
    expect(w.weapons.map((x) => [x.id, x.level])).toEqual([
      ['blade', 2],
      ['yahAura', 1],
    ]);
  });

  it('passives raise the stat; max hp also heals', () => {
    const w = quietWorld();
    w.player.hp = 50;
    applyUpgrade(w, { kind: 'passive', id: 'vigor', level: 1 });
    expect(w.player.stats.maxHp).toBe(config.player.stats.maxHp + PASSIVES.vigor.perLevel);
    expect(w.player.hp).toBe(50 + PASSIVES.vigor.perLevel);
    applyUpgrade(w, { kind: 'passive', id: 'haste', level: 1 });
    expect(w.player.stats.cooldown).toBeCloseTo(1 + PASSIVES.haste.perLevel);
  });

  it('stops offering maxed things and falls back to a heal', () => {
    const w = quietWorld();
    w.weapons.length = 0;
    for (const id of WEAPON_IDS)
      w.weapons.push({ id, level: WEAPONS[id].levels.length, timer: 0, damage: 0, since: 0 });
    for (const id of PASSIVE_IDS) w.passives[id] = PASSIVES[id].maxLevel;
    expect(candidates(w)).toEqual([]);
    expect(rollUpgrades(w)).toEqual([{ kind: 'heal' }]);
  });

  it('no new weapons once the slots are full', () => {
    const w = quietWorld();
    w.weapons.length = 0;
    for (let i = 0; i < config.weapons.maxOwned; i++)
      w.weapons.push({ id: 'blade', level: 1, timer: 0, damage: 0, since: 0 });
    expect(candidates(w).some((o) => o.kind === 'weapon' && o.level === 1)).toBe(false);
  });

  it('describes what a weapon level changes', () => {
    expect(weaponLevelDiff('blade', 2)).toContainEqual({
      stat: 'damage',
      from: WEAPONS.blade.levels[0]!.damage,
      to: WEAPONS.blade.levels[1]!.damage,
    });
    expect(weaponLevelDiff('blade', 1)).toEqual([]);
  });
});

describe('level-up flow', () => {
  it('pauses the world until a choice is made, and chains queued level-ups', () => {
    const w = quietWorld();
    addXp(w, xpToNext(1) + xpToNext(2));
    w.step(1 / 60, still);
    expect(w.state).toBe('levelup');
    expect(w.events).toContainEqual({ type: 'levelUp' });
    const t = w.time;
    w.step(1, still);
    expect(w.time).toBe(t);

    w.chooseUpgrade(0);
    expect(w.state).toBe('levelup');
    w.chooseUpgrade(0);
    expect(w.state).toBe('playing');
    expect(w.pendingLevelUps).toBe(0);
  });

  it('ignores invalid choices', () => {
    const w = quietWorld();
    w.chooseUpgrade(0);
    expect(w.state).toBe('playing');
  });
});

describe('passive limit', () => {
  it('once maxPassives are owned, only those level up', () => {
    const w = quietWorld();
    const owned = PASSIVE_IDS.slice(0, config.weapons.maxPassives);
    for (const id of owned) applyUpgrade(w, { kind: 'passive', id, level: 1 });
    const passives = candidates(w).filter((o) => o.kind === 'passive');
    expect(passives.length).toBeGreaterThan(0);
    for (const o of passives) expect(owned).toContain(o.id);
  });

  it('lists every owned weapon whose Elo a passive completes', () => {
    expect(weaponsCompletedBy(['mace', 'blade', 'paladinSwords'], 'armor')).toEqual([
      'mace',
      'paladinSwords',
    ]);
    expect(weaponsCompletedBy(['blade', 'fire'], 'might')).toEqual(['blade', 'fire']);
    expect(weaponsCompletedBy(['frost'], 'might')).toEqual([]);
    // An Elo already formed needs nothing more.
    expect(weaponsCompletedBy(['fury'], 'might')).toEqual([]);
  });
});
