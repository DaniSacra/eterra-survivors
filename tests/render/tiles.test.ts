import { describe, expect, it } from 'vitest';
import { ASSETS } from '../../src/render/assets';
import { STAGES } from '../../src/data/stages';

const files = import.meta.glob('/public/sprites/tiles/*.png', { query: '?url', eager: true });

describe('ground tiles', () => {
  it('every stage ground and the forest are image files of PixelLab ground', () => {
    const keys = [...Object.values(STAGES).map((s) => s.tile), 'tile.forest'];
    for (const key of keys) {
      const def = ASSETS[key];
      expect(def, key).toMatchObject({ kind: 'image' });
      const url = (def as { url: string }).url;
      expect(Object.keys(files), key).toContain(`/public/${url}`);
    }
  });
});
