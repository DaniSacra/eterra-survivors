import { describe, expect, it } from 'vitest';
import { STAGE_IDS } from '../../src/data/stages';
import { MUSIC, STAGE_MUSIC } from '../../src/render/musics';

// Every mp3 under public/, as URL paths like `audio/music/valmor.mp3`.
const files = new Set(
  Object.keys(import.meta.glob('/public/audio/**/*.mp3')).map((p) => p.replace('/public/', '')),
);

describe('music map', () => {
  it('every stage has a track', () => {
    for (const id of STAGE_IDS) expect(MUSIC[STAGE_MUSIC[id]], id).toBeDefined();
  });

  it('every track has its file, a sane volume and a loop point', () => {
    for (const [id, def] of Object.entries(MUSIC)) {
      expect(files.has(def.url), `${id} -> ${def.url}`).toBe(true);
      expect(def.vol).toBeGreaterThan(0);
      expect(def.vol).toBeLessThanOrEqual(1);
      expect(def.loopStart).toBeGreaterThanOrEqual(0);
    }
  });
});
