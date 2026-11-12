import { describe, expect, it } from 'vitest';
import {
  SAVE_VERSION,
  biggestGoal,
  canBuyAny,
  buy,
  confirmPurchase,
  shopShortfall,
  discoverElos,
  lastRun,
  newSave,
  sanitizeSave,
  serializeSave,
  shopBonuses,
  setShopLevel,
  shopCost,
} from '../../src/core/meta';
import { dropPickup } from '../../src/core/pickups';
import { World } from '../../src/core/world';
import { config } from '../../src/data/config';
import { CHARACTERS } from '../../src/data/characters';
import { SHOP, SHOP_IDS } from '../../src/data/shop';
import { CHEST } from '../../src/data/pickups';
import { quietWorld, still } from './helpers';

describe('shop', () => {
  it('costs grow per level, buying spends gold, and stops at max level', () => {
    const save = newSave();
    expect(shopCost(save, 'maxHp')).toBe(SHOP.maxHp.baseCost);
    expect(buy(save, 'maxHp')).toBe(false);
    save.gold = 10_000;
    expect(buy(save, 'maxHp')).toBe(true);
    expect(save.gold).toBe(10_000 - SHOP.maxHp.baseCost);
    expect(shopCost(save, 'maxHp')).toBe(SHOP.maxHp.baseCost * 2);
    while (buy(save, 'maxHp'));
    expect(save.shop.maxHp).toBe(SHOP.maxHp.maxLevel);
    expect(shopCost(save, 'maxHp')).toBeNull();
  });

  it('turns levels into starting stats and charges', () => {
    const save = newSave();
    save.shop = { maxHp: 2, reroll: 3, cooldown: 1 };
    const b = shopBonuses(save);
    expect(b.stats.maxHp).toBe(20);
    expect(b.stats.cooldown).toBeCloseTo(-0.03);
    expect(b.charges.reroll).toBe(config.charges.reroll + 3);
    const w = new World(1, { bonuses: b });
    expect(w.player.stats.maxHp).toBe(config.player.stats.maxHp + CHARACTERS.aldo.stats.maxHp + 20);
    expect(w.player.hp).toBe(w.player.stats.maxHp);
    expect(w.charges.reroll).toBe(config.charges.reroll + 3);
  });

  it('test mode sets any level for free, clamped to the item range', () => {
    const save = newSave();
    setShopLevel(save, 'might', 4);
    expect(shopBonuses(save).stats.might).toBeCloseTo(0.2);
    setShopLevel(save, 'might', 99);
    expect(save.shop.might).toBe(SHOP.might.maxLevel);
    setShopLevel(save, 'might', -3);
    expect(shopBonuses(save).stats.might).toBeUndefined();
    expect(save.gold).toBe(0);
  });

  it('Segunda Chance: the hero gets up once with half their life, briefly untouchable', () => {
    const save = newSave();
    expect(shopBonuses(save).revives).toBe(0);
    save.shop = { revive: 1 };
    const w = new World(1, { bonuses: shopBonuses(save) });
    w.spawner.update = () => {};
    expect(w.revives).toBe(1);
    w.player.hp = -5;
    w.step(1 / 60, still);
    expect(w.state).toBe('playing');
    expect(w.player.hp).toBeCloseTo(w.player.stats.maxHp * config.revive.hp);
    expect(w.player.iframes).toBeGreaterThan(config.revive.iframes - 0.1);
    expect(w.events.some((e) => e.type === 'revived')).toBe(true);
    // Only once: the next fall ends the run.
    w.player.hp = -5;
    w.step(1 / 60, still);
    expect(w.state).toBe('lost');
  });

  it('Desistir ends the run as an abandoned loss, once', () => {
    const w = new World(1);
    w.abandon();
    expect(w.state).toBe('lost');
    expect(w.abandoned).toBe(true);
    const lost = new World(1);
    lost.player.hp = -5;
    lost.step(1 / 60, still);
    expect(lost.state).toBe('lost');
    expect(lost.abandoned).toBe(false);
  });

  it('repairs broken or tampered saves', () => {
    expect(sanitizeSave(null)).toEqual(newSave());
    expect(sanitizeSave('x')).toEqual(newSave());
    expect(
      sanitizeSave({
        gold: 12.7,
        shop: { maxHp: 99, nope: 3, might: -1 },
        heroes: ['lyra', 'ghost'],
        cleared: 'valmor',
      }),
    ).toEqual({ ...newSave(), gold: 12, shop: { maxHp: SHOP.maxHp.maxLevel }, heroes: ['lyra'] });
    // Saves from before heroes and stages still load.
    expect(sanitizeSave({ gold: 5, shop: {} })).toEqual({ ...newSave(), gold: 5 });
  });
});

describe('canBuyAny', () => {
  it('is true only when the gold pays the next level of some item', () => {
    const save = newSave();
    const cheapest = Math.min(...SHOP_IDS.map((id) => SHOP[id].baseCost));
    save.gold = cheapest - 1;
    expect(canBuyAny(save)).toBe(false);
    save.gold = cheapest;
    expect(canBuyAny(save)).toBe(true);
    for (const id of SHOP_IDS) save.shop[id] = SHOP[id].maxLevel;
    save.gold = 1_000_000;
    expect(canBuyAny(save)).toBe(false); // all bought
  });
});

describe('Loja purchase flow', () => {
  it('buys only on confirmation of a selected item, and only with enough gold', () => {
    const save = newSave();
    save.gold = 10_000;
    const cart = { selected: null };
    expect(confirmPurchase(save, cart)).toBe(false); // nothing selected: nothing bought
    expect(save.gold).toBe(10_000);
    const selected = { selected: 'maxHp' as const };
    expect(save.shop.maxHp ?? 0).toBe(0); // selecting alone buys nothing
    expect(confirmPurchase(save, selected)).toBe(true);
    expect(save.shop.maxHp).toBe(1);
    save.gold = SHOP.maxHp.baseCost * 2 - 1;
    expect(shopShortfall(save, 'maxHp')).toBe(1);
    expect(confirmPurchase(save, selected)).toBe(false);
    expect(save.shop.maxHp).toBe(1);
    save.gold += 1;
    expect(shopShortfall(save, 'maxHp')).toBe(0);
    expect(confirmPurchase(save, selected)).toBe(true);
    save.shop.maxHp = SHOP.maxHp.maxLevel;
    expect(shopShortfall(save, 'maxHp')).toBeNull();
  });
});

describe('gold', () => {
  it('coins and chests give gold, scaled by greed', () => {
    const w = quietWorld();
    w.player.stats.greed = 2;
    dropPickup(w, 'gold', w.player.x, w.player.y);
    w.step(1 / 60, still);
    expect(w.gold).toBe(config.gold.coin * 2);
    dropPickup(w, 'chest', w.player.x, w.player.y);
    w.step(1 / 60, still);
    expect(w.gold).toBe((config.gold.coin + CHEST.gold) * 2);
  });
});

describe('level-up helpers', () => {
  function leveling() {
    const w = quietWorld();
    w.charges.reroll = w.charges.skip = w.charges.banish = 1;
    w.pendingLevelUps = 1;
    w.step(1 / 60, still);
    expect(w.state).toBe('levelup');
    return w;
  }

  it('Trocar rolls new options and spends a charge', () => {
    const w = leveling();
    const before = w.upgradeOptions;
    w.reroll();
    expect(w.upgradeOptions).not.toBe(before);
    expect(w.charges.reroll).toBe(0);
    w.reroll();
    expect(w.charges.reroll).toBe(0);
  });

  it('Pular ends the level-up without taking anything', () => {
    const w = leveling();
    w.skipLevelUp();
    expect(w.state).toBe('playing');
    expect(w.weapons).toHaveLength(1);
    expect(w.weapons[0]!.level).toBe(1);
  });

  it('Banir removes the option for the rest of the run', () => {
    const w = leveling();
    const opt = w.upgradeOptions[0]!;
    w.banish(0);
    expect(w.state).toBe('levelup');
    expect(w.charges.banish).toBe(0);
    for (let i = 0; i < 30; i++) {
      w.charges.reroll = 1;
      w.reroll();
      expect(w.upgradeOptions).not.toContainEqual(opt);
    }
  });

  it('do nothing without charges or outside a level-up', () => {
    const w = quietWorld();
    w.skipLevelUp();
    w.banish(0);
    expect(w.state).toBe('playing');
    const l = leveling();
    l.charges.skip = 0;
    l.skipLevelUp();
    expect(l.state).toBe('levelup');
  });
});

describe('save versions and Elos', () => {
  it('loads a versionless save without losing anything, at the current version', () => {
    const old = { gold: 340, shop: { might: 2 }, heroes: ['teo'], cleared: ['valmor'] };
    const s = sanitizeSave(old);
    expect(s).toMatchObject({
      gold: 340,
      shop: { might: 2 },
      heroes: ['teo'],
      cleared: ['valmor'],
      elos: [],
    });
    expect(s.version).toBe(SAVE_VERSION);
  });

  it('rejects a gold value that would not survive JSON (Infinity, NaN)', () => {
    expect(sanitizeSave({ gold: Infinity }).gold).toBe(0);
    expect(sanitizeSave({ gold: NaN }).gold).toBe(0);
    expect(sanitizeSave({ gold: 12.7 }).gold).toBe(12);
  });

  it('a save from a newer version keeps what this build does not know when written back', () => {
    const future = {
      version: SAVE_VERSION + 1,
      gold: 500,
      shop: { might: 1, newThing: 3 },
      heroes: ['teo', 'newHero'],
      cleared: ['valmor', 'newStage'],
      elos: ['fury', 'newElo'],
      quests: { done: 4 },
    };
    const s = sanitizeSave(JSON.parse(JSON.stringify(future)));
    expect(s.elos).toEqual(['fury']); // this build only uses what it knows
    buy(s, 'might');
    s.cleared.push('crypt');
    const back = JSON.parse(JSON.stringify(serializeSave(s)));
    expect(back.version).toBe(SAVE_VERSION + 1);
    expect(back.quests).toEqual({ done: 4 });
    expect(back.shop).toEqual({ might: 2, newThing: 3 });
    expect(back.gold).toBe(500 - SHOP.might.baseCost * 2); // level 2 bought here
    expect(back.heroes).toEqual(['teo', 'newHero']);
    expect(back.cleared).toEqual(['valmor', 'newStage', 'crypt']);
    expect(back.elos).toEqual(['fury', 'newElo']);
  });

  it('a current save is written as is', () => {
    const s = sanitizeSave({ version: SAVE_VERSION, gold: 10, elos: ['fury'] });
    expect(serializeSave(s)).toEqual({ ...newSave(), gold: 10, elos: ['fury'] });
  });

  it('keeps known Elos and drops unknown ids', () => {
    expect(sanitizeSave({ elos: ['fury', 'blade', 'nope'] }).elos).toEqual(['fury']);
  });

  it('discovers Elos once and reports only the new ones', () => {
    const s = newSave();
    expect(discoverElos(s, ['fury', 'storm'])).toEqual(['fury', 'storm']);
    expect(discoverElos(s, ['fury', 'blade'])).toEqual([]);
    expect(s.elos).toEqual(['fury', 'storm']);
  });

  it('the long-term goal is the most expensive next level left in the Loja', () => {
    const s = newSave();
    const priciest = Math.max(...SHOP_IDS.map((id) => SHOP[id].baseCost));
    expect(biggestGoal(s)!.cost).toBe(priciest);
    for (const id of SHOP_IDS) s.shop[id] = SHOP[id].maxLevel;
    expect(biggestGoal(s)).toBeNull();
  });

  it('remembers the last hero and stage only while they can still be played', () => {
    expect(lastRun(sanitizeSave(null))).toEqual({ character: 'aldo', stage: 'valmor' });
    // An old save without the fields stays valid.
    expect(lastRun(sanitizeSave({ version: 1, gold: 10, cleared: ['valmor'] }))).toEqual({
      character: 'aldo',
      stage: 'valmor',
    });
    const ok = sanitizeSave({ cleared: ['valmor'], heroes: ['lyra'], lastHero: 'lyra', lastStage: 'crypt' });
    expect(lastRun(ok)).toEqual({ character: 'lyra', stage: 'crypt' });
    // A stage no longer open (unless the playtest switch opens all), or junk, falls back to the default.
    const locked = lastRun(sanitizeSave({ lastHero: 'lyra', lastStage: 'crypt' })).stage;
    expect(locked).toBe(config.unlockAllStages ? 'crypt' : 'valmor');
    expect(lastRun(sanitizeSave({ lastHero: 'gandalf', lastStage: 42 }))).toEqual({
      character: 'aldo',
      stage: 'valmor',
    });
    // Survives a round trip through storage.
    expect(lastRun(sanitizeSave(JSON.parse(JSON.stringify(serializeSave(ok)))))).toEqual({
      character: 'lyra',
      stage: 'crypt',
    });
  });
});

describe('tipsSeen', () => {
  it('starts empty, keeps only known enemies, and an old save without it migrates to empty', () => {
    expect(sanitizeSave({ version: 2 }).tipsSeen).toEqual([]);
    expect(sanitizeSave({ version: 2, tipsSeen: ['slime', 'nope', 7] }).tipsSeen).toEqual(['slime']);
  });
});
