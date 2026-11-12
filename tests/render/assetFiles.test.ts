import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../../src/data/enemies';
import { CHARACTERS } from '../../src/data/characters';
import { ASSETS } from '../../src/render/assets';
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

  it('a walk-only enemy asks for the walk strip alone', () => {
    expect(declaredPoses(ENEMY_ANIMS['enemy.spiderEgg'] as never)).toEqual(['walk']);
    expect(declaredPoses(ENEMY_ANIMS['enemy.golem'] as never)).toEqual(['walk', 'windup', 'strike', 'death']);
  });
});
