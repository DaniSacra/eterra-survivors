import { describe, expect, it } from 'vitest';
import { heroUnlocked, markCleared, newSave, playtest, stageUnlocked, unlockHero } from '../../src/core/meta';
import { World } from '../../src/core/world';
import { CHARACTERS, CHARACTER_IDS } from '../../src/data/characters';
import { config } from '../../src/data/config';
import { EVOLUTIONS } from '../../src/data/evolutions';
import { STAGE_IDS } from '../../src/data/stages';

describe('characters', () => {
  it.each(CHARACTER_IDS)('%s starts with its weapon and stat changes', (id) => {
    const def = CHARACTERS[id];
    const w = new World(1, { character: id });
    expect(w.weapons.map((x) => x.id)).toEqual([def.weapon]);
    expect(EVOLUTIONS[def.weapon]).toBeUndefined();
    for (const [k, v] of Object.entries(def.stats))
      expect(w.player.stats[k as keyof typeof def.stats]).toBeCloseTo(
        config.player.stats[k as keyof typeof config.player.stats] + v,
      );
    expect(w.player.hp).toBe(w.player.stats.maxHp);
  });

  it('defaults to Aldo in Valmor', () => {
    const w = new World(1);
    expect(w.character).toBe('aldo');
    expect(w.stageId).toBe('valmor');
  });
});

describe('unlocks', () => {
  it('test mode (?dev) opens every hero and stage, and only while it is on', () => {
    playtest.unlockAll = true;
    try {
      for (const id of CHARACTER_IDS) expect(heroUnlocked(newSave(), id)).toBe(true);
      for (const id of STAGE_IDS) expect(stageUnlocked(newSave(), id)).toBe(true);
    } finally {
      playtest.unlockAll = false;
    }
    expect(heroUnlocked(newSave(), 'lyra')).toBe(config.unlockAllHeroes);
    expect(stageUnlocked(newSave(), 'crypt')).toBe(config.unlockAllStages);
  });

  it.skipIf(config.unlockAllHeroes)('free heroes are open; the others are bought once with gold', () => {
    const save = newSave();
    expect(heroUnlocked(save, 'aldo')).toBe(true);
    expect(heroUnlocked(save, 'lyra')).toBe(false);
    expect(unlockHero(save, 'lyra')).toBe(false);
    save.gold = CHARACTERS.lyra.cost + 1;
    expect(unlockHero(save, 'lyra')).toBe(true);
    expect(save.gold).toBe(1);
    expect(heroUnlocked(save, 'lyra')).toBe(true);
    expect(unlockHero(save, 'lyra')).toBe(false);
  });

  it.skipIf(config.unlockAllStages)('each stage opens when the previous one is cleared', () => {
    const save = newSave();
    expect(stageUnlocked(save, 'valmor')).toBe(true);
    expect(stageUnlocked(save, 'crypt')).toBe(false);
    markCleared(save, 'valmor');
    markCleared(save, 'valmor');
    expect(save.cleared).toEqual(['valmor']);
    expect(stageUnlocked(save, 'crypt')).toBe(true);
    expect(stageUnlocked(save, 'southRoad')).toBe(false);
  });
});
