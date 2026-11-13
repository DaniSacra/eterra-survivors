import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/data/enemies';
import { CHARACTERS } from '../../src/data/characters';
import { readFileSync } from 'node:fs';
import { ASSETS, ELO_VFX, HOME_ENEMIES, bootKeys, enemyKeys, eloVfx, runKeys } from '../../src/render/assets';
import { STAGES, STAGE_IDS, bestiaryOrder, stageCast } from '../../src/data/stages';
import { ENEMY_ANIMS, declaredPoses } from '../../src/render/enemyAnims';

// Every png under public/, as URL paths like `sprites/enemies/rat.png`.
const files = new Set(
  Object.keys(import.meta.glob('/public/**/*.png')).map((p) => p.replace('/public/', '')),
);

describe('asset files', () => {
  it('every image and sheet in the asset map has its file in public/ (no 404 at load)', () => {
    for (const [key, def] of Object.entries(ASSETS))
      if (def.kind !== 'art') expect(files.has(def.url), `${key} -> ${def.url}`).toBe(true);
  });

  it('every enemy and hero texture is a PNG (no code-drawn enemy or hero art is left)', () => {
    for (const e of Object.values(ENEMIES)) expect(ASSETS[e.sprite]?.kind, e.sprite).toBe('image');
    for (const id of Object.keys(CHARACTERS))
      expect(ASSETS[`player.${id}`]?.kind, `player.${id}`).toBe('image');
  });

  it('only the poses an enemy declares are loaded', () => {
    for (const [sprite, a] of Object.entries(ENEMY_ANIMS)) {
      const loaded = Object.keys(ASSETS).filter((k) => k.startsWith(`${sprite}.`));
      expect(loaded.sort(), sprite).toEqual(
        declaredPoses(a)
          .map((p) => `${sprite}.${p}`)
          .sort(),
      );
    }
  });

  it('an enemy asks only for the strips it declares', () => {
    expect(declaredPoses(ENEMY_ANIMS['enemy.thiefRat'] as never)).toEqual(['walk']);
    expect(declaredPoses(ENEMY_ANIMS['enemy.spiderEgg'] as never)).toEqual(['walk', 'windup']);
    expect(declaredPoses(ENEMY_ANIMS['enemy.golem'] as never)).toEqual([
      'walk',
      'attack',
      'windup',
      'strike',
      'death',
    ]);
    expect(declaredPoses(ENEMY_ANIMS['enemy.oldWolf'] as never)).toEqual([
      'walk',
      'attack',
      'windup',
      'strike',
      'howl',
      'death',
    ]);
  });

  describe('lazy loading', () => {
    it('the boot leaves the enemies, effects and hero reactions to later', () => {
      const boot = new Set(bootKeys());
      expect(boot.has('vfx.slash')).toBe(false);
      expect(boot.has('player.aldo.fall')).toBe(false);
      expect(boot.has('enemy.rat.walk')).toBe(false);
      expect(boot.has('player.aldo.walk')).toBe(true);
      expect(boot.has('tile.crypt')).toBe(true);
    });

    it('every still on the home scenery is loaded at boot', () => {
      const src = readFileSync('src/scenes/MenuScene.ts', 'utf8');
      const used = new Set([...src.matchAll(/key: '(enemy\.\w+)'/g)].map((m) => m[1]));
      expect([...used].sort()).toEqual([...HOME_ENEMIES].sort());
      const boot = new Set(bootKeys());
      for (const key of used) expect(boot.has(key as string), key).toBe(true);
    });

    it('the story and stage cards find their boss still at boot', () => {
      const boot = new Set(bootKeys());
      for (const id of STAGE_IDS) expect(boot.has(ENEMIES[STAGES[id].boss.id].sprite)).toBe(true);
    });

    it('a run loads its whole cast, what the cast raises, the effects and the hero reactions', () => {
      for (const stage of STAGE_IDS) {
        const keys = new Set(runKeys(stage, 'lyra'));
        for (const id of stageCast(stage)) {
          const anim = ENEMY_ANIMS[ENEMIES[id].sprite];
          expect(keys.has(ENEMIES[id].sprite), `${stage} ${id}`).toBe(true);
          if (anim)
            for (const p of declaredPoses(anim)) expect(keys.has(`${ENEMIES[id].sprite}.${p}`)).toBe(true);
          // What it raises or falls into.
          const def = ENEMIES[id] as { reassemble?: { sprite: string } };
          if (def.reassemble) expect(keys.has(def.reassemble.sprite)).toBe(true);
        }
        expect(keys.has('vfx.slash')).toBe(true);
        expect(keys.has('player.lyra.hurt') && keys.has('player.lyra.fall')).toBe(true);
        // Every key a run asks for exists in the asset map.
        for (const k of keys) expect(ASSETS[k], k).toBeDefined();
      }
    });

    it('the strips only an Elo plays load on demand, and each Elo asks for its own', () => {
      const run = new Set(runKeys('valmor', 'aldo'));
      for (const k of ELO_VFX) {
        expect(ASSETS[k], k).toBeDefined();
        expect(run.has(k)).toBe(false);
      }
      expect(eloVfx('yahFlame')).toEqual(['vfx.pulse']);
      expect(eloVfx('fury')).toEqual(['vfx.furySpin']);
      expect(eloVfx('fireSword')).toEqual([]);
    });

    it("a stage does not load another stage's enemies", () => {
      const valmor = new Set(runKeys('valmor', 'aldo'));
      expect(valmor.has('enemy.golem')).toBe(false);
      expect(valmor.has('enemy.bellRinger.walk')).toBe(false);
      expect(valmor.has('enemy.spiderMother.walk')).toBe(true);
      expect(valmor.has('enemy.spider')).toBe(true);
    });

    it('the Bestiário can load every enemy it lists, and what a boss raises', () => {
      const ids = bestiaryOrder({});
      for (const k of enemyKeys(ids)) expect(ASSETS[k], k).toBeDefined();
      expect(enemyKeys(['spiderNest'])).toContain('enemy.spider');
    });
  });
});
