import { describe, expect, it } from 'vitest';
import { spawnEnemy } from '../../src/core/enemies';
import { hasVerb, nextTip } from '../../src/core/tips';
import { ENEMIES, ENEMY_IDS, type EnemyDef } from '../../src/data/enemies';
import { t } from '../../src/i18n/pt-BR';
import { quietWorld } from './helpers';

describe('first-time tips', () => {
  it('every enemy with a verb has a tip text', () => {
    for (const id of ENEMY_IDS) {
      const def = ENEMIES[id] as EnemyDef;
      if (hasVerb(def) && !def.boss && !def.elite) expect(t.bestiary.tips[id], id).toBeTruthy();
    }
  });

  it('finds an unseen enemy with a verb near the hero, and nothing for plain ones', () => {
    const w = quietWorld();
    spawnEnemy(w, 'rat', 100, 0);
    expect(nextTip(w, new Set())).toBeNull();
    spawnEnemy(w, 'slime', 150, 0);
    expect(nextTip(w, new Set())).toBe('slime');
    expect(nextTip(w, new Set(['slime']))).toBeNull();
  });

  it('ignores far enemies, elites and bosses', () => {
    const w = quietWorld();
    spawnEnemy(w, 'slime', 5000, 0);
    spawnEnemy(w, 'gravedigger', 100, 0);
    spawnEnemy(w, 'bellRinger', 100, 100);
    expect(nextTip(w, new Set())).toBeNull();
  });
});
