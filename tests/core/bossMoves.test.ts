import { describe, expect, it } from 'vitest';
import { ENEMY_IDS, ENEMIES, type EnemyDef } from '../../src/data/enemies';
import { t } from '../../src/i18n/pt-BR';

describe('boss move names (CU-03)', () => {
  it('every ability of every boss has a name the HUD can show', () => {
    for (const id of ENEMY_IDS) {
      const def = ENEMIES[id] as EnemyDef;
      if (!def.boss) continue;
      for (const ab of def.abilities ?? (def.ability ? [def.ability] : []))
        expect(t.hud.bossMove[id]?.[ab.kind], `${id} ${ab.kind}`).toBeTruthy();
    }
  });
});
