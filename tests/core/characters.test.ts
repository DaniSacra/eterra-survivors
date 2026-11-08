import { describe, expect, it } from 'vitest';
import { heroUnlocked, markCleared, newSave, stageUnlocked, unlockHero } from '../../src/core/meta';
import { World } from '../../src/core/world';
import { CHARACTERS, CHARACTER_IDS } from '../../src/data/characters';
import { config } from '../../src/data/config';
import { EVOLUTIONS } from '../../src/data/evolutions';

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
  it('free heroes are open; the others are bought once with gold', () => {
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

  it('each stage opens when the previous one is cleared', () => {
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
