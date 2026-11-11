import { describe, expect, it } from 'vitest';
import {
  applyUpgrade,
  canBanish,
  canReroll,
  candidates,
  rollUpgrades,
  weaponLevelDiff,
  eloReady,
  statPreview,
} from '../../src/core/upgrades';
import { addXp, xpToNext } from '../../src/core/xp';
import { config } from '../../src/data/config';
import { PASSIVES, PASSIVE_IDS } from '../../src/data/upgrades';
import { WEAPONS, WEAPON_IDS } from '../../src/data/weapons';
import { REWARDS } from '../../src/data/rewards';
import { forgeFury, quietWorld, still } from './helpers';

function maxedWorld() {
  const w = quietWorld();
  w.weapons.length = 0;
  for (const id of WEAPON_IDS.slice(0, config.weapons.maxOwned)) {
    w.addWeapon(id);
    w.weapons[w.weapons.length - 1]!.level = WEAPONS[id].levels.length;
  }
  for (const id of PASSIVE_IDS.slice(0, config.weapons.maxPassives)) w.passives[id] = PASSIVES[id].maxLevel;
  return w;
}

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

  it('with everything maxed, still offers 3 distinct cards: the rewards', () => {
    const w = maxedWorld();
    expect(candidates(w)).toEqual([]);
    for (let i = 0; i < 20; i++) {
      const opts = rollUpgrades(w);
      expect(opts).toHaveLength(3);
      expect(new Set(opts.map((o) => JSON.stringify(o))).size).toBe(3);
      expect(opts.every((o) => o.kind === 'reward')).toBe(true);
    }
  });

  it('a short pool is topped up with rewards to 3 cards, never an empty list', () => {
    const w = maxedWorld();
    w.weapons[0]!.level--;
    const opts = rollUpgrades(w);
    expect(opts).toHaveLength(3);
    expect(opts.filter((o) => o.kind === 'weapon')).toHaveLength(1);
    expect(opts.filter((o) => o.kind === 'reward')).toHaveLength(2);
    expect(w.poolShortAt).toBe(-1); // only measured when a level-up opens
  });

  it('reward cards do what they say', () => {
    const w = maxedWorld();
    const gold = w.gold;
    applyUpgrade(w, { kind: 'reward', id: 'goldBag' });
    expect(w.gold).toBe(gold + Math.round(REWARDS.goldBag.gold * w.player.stats.greed));
    const might = w.player.stats.might;
    applyUpgrade(w, { kind: 'reward', id: 'blessing' });
    applyUpgrade(w, { kind: 'reward', id: 'blessing' });
    expect(w.player.stats.might).toBeCloseTo(might + 2 * REWARDS.blessing.might);
    expect(w.blessings).toBe(2);
    w.player.hp = 1;
    applyUpgrade(w, { kind: 'reward', id: 'feast' });
    expect(w.player.hp).toBeCloseTo(1 + w.player.stats.maxHp * REWARDS.feast.heal);
  });

  it('Banir and Pular work on reward cards, but Banir never leaves fewer than 3 cards', () => {
    const w = maxedWorld();
    w.weapons[0]!.level--; // 1 weapon level + 3 rewards = 4 options
    w.charges.banish = 5;
    w.charges.skip = 1;
    w.pendingLevelUps = 1;
    w.step(1 / 60, still);
    expect(w.state).toBe('levelup');
    const reward = w.upgradeOptions.findIndex((o) => o.kind === 'reward');
    const banned = w.upgradeOptions[reward]!;
    expect(canBanish(w, banned)).toBe(true);
    w.banish(reward);
    expect(w.charges.banish).toBe(4);
    expect(w.upgradeOptions).not.toContainEqual(banned);
    expect(w.upgradeOptions).toHaveLength(3);
    // 3 options left: banishing another would leave 2.
    expect(canBanish(w, w.upgradeOptions[0]!)).toBe(false);
    w.banish(0);
    expect(w.charges.banish).toBe(4);
    w.skipLevelUp();
    expect(w.state).toBe('playing');
  });

  it("only reward cards left: Trocar can't show anything new and keeps its charge", () => {
    const w = maxedWorld(); // nothing to level: the 3 reward cards
    w.charges.reroll = 2;
    w.pendingLevelUps = 1;
    w.step(1 / 60, still);
    expect(w.state).toBe('levelup');
    expect(canReroll(w)).toBe(false);
    w.reroll();
    expect(w.charges.reroll).toBe(2);
    expect(w.upgradeOptions.some((o) => canBanish(w, o))).toBe(false);
  });

  it('records the level at which the pool first ran short', () => {
    const w = maxedWorld();
    w.pendingLevelUps = 1;
    w.step(1 / 60, still);
    expect(w.poolShortLevel).toBe(w.level);
    expect(w.poolShortAt).toBeGreaterThanOrEqual(0);
  });

  it('no new weapons once the slots are full', () => {
    const w = quietWorld();
    w.weapons.length = 0;
    for (let i = 0; i < config.weapons.maxOwned; i++) w.addWeapon('blade');
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

  it('bumps buildRev on every build change, not on a heal', () => {
    const w = quietWorld();
    const r0 = w.buildRev;
    applyUpgrade(w, { kind: 'weapon', id: 'frost', level: 1 });
    applyUpgrade(w, { kind: 'passive', id: 'might', level: 1 });
    expect(w.buildRev).toBe(r0 + 2);
    applyUpgrade(w, { kind: 'heal' });
    expect(w.buildRev).toBe(r0 + 2);
    const r1 = w.buildRev;
    forgeFury(w);
    expect(w.buildRev).toBe(r1 + 2); // the level, then the Elo
  });

  it('eloReady: base and passive at max level, until the Elo is formed', () => {
    const w = quietWorld();
    expect(eloReady(w, 'frost')).toBe(false); // not owned
    forgeFury(w);
    expect(eloReady(w, 'blade')).toBe(false);
    expect(eloReady(w, 'fury')).toBe(false);
  });

  it('statPreview: a passive shows its stat from now to after the pick', () => {
    const w = quietWorld();
    applyUpgrade(w, { kind: 'passive', id: 'reach', level: 1 });
    const p = statPreview(w, { kind: 'passive', id: 'reach', level: 2 });
    expect(p?.stat).toBe('area');
    expect(p?.from).toBeCloseTo(w.player.stats.area);
    expect(p?.to).toBeCloseTo(w.player.stats.area + PASSIVES.reach.perLevel);
    expect(statPreview(w, { kind: 'weapon', id: 'frost', level: 1 })).toBeNull();
    expect(statPreview(w, { kind: 'heal' })).toBeNull();
  });
});

describe('Pular', () => {
  it('gives a little gold for the choice given up', () => {
    const w = quietWorld();
    w.charges.skip = 1;
    w.pendingLevelUps = 1;
    w.step(1 / 60, still);
    const gold = w.gold;
    w.skipLevelUp();
    expect(w.gold).toBe(gold + config.skipGold);
    expect(w.state).toBe('playing');
  });
});
