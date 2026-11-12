import { describe, expect, it } from 'vitest';
import { ENEMY_IDS } from '../../src/data/enemies';
import { STAGES, enemyStage } from '../../src/data/stages';
import { t } from '../../src/i18n/pt-BR';
import { SHOP_IDS } from '../../src/data/shop';

describe('Bestiário texts', () => {
  it('has a "Como enfrentar" tip for every enemy', () => {
    for (const id of ENEMY_IDS) expect(t.bestiary.tips[id], id).toBeTruthy();
  });

  it('places every enemy on a stage that exists', () => {
    for (const id of ENEMY_IDS) expect(STAGES[enemyStage(id)], id).toBeDefined();
  });

  it('places the bosses on their own stage', () => {
    expect(enemyStage('bellRinger')).toBe('crypt');
  });
});

describe('Loja texts', () => {
  it('describes every item and gives Gaspar a line for it', () => {
    for (const id of SHOP_IDS) {
      expect(t.shop.desc[id], id).toBeTruthy();
      expect(t.shop.pitch[id], id).toBeTruthy();
    }
  });
});
