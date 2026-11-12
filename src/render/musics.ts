import type { StageId } from '../data/stages';

/**
 * The single music map: track id to file, volume and loop point. Files live in `public/audio/music/` and are
 * trimmed at the end of their loop, so a track plays from 0 once (the intro) and then jumps back to `loopStart`
 * seconds, forever. Add a track here and its file; render/music.ts plays it.
 */
export interface MusicDef {
  /** Relative to the site root, like the sprites. */
  url: string;
  /** Track volume, 0 to 1 (before the global music level). */
  vol: number;
  /** Where the loop jumps back to, in seconds. */
  loopStart: number;
}

export const MUSIC = {
  valmor: { url: 'audio/music/valmor.mp3', vol: 0.9, loopStart: 56.355 },
  crypt: { url: 'audio/music/crypt.mp3', vol: 0.9, loopStart: 84.079 },
  southRoad: { url: 'audio/music/southRoad.mp3', vol: 0.9, loopStart: 90.117 },
  boss: { url: 'audio/music/boss.mp3', vol: 0.9, loopStart: 73.793 },
  menu: { url: 'audio/music/menu.mp3', vol: 0.9, loopStart: 53.267 },
} satisfies Record<string, MusicDef>;

export type MusicId = keyof typeof MUSIC;

/** The track that plays during each stage. */
export const STAGE_MUSIC: Record<StageId, MusicId> = {
  valmor: 'valmor',
  crypt: 'crypt',
  southRoad: 'southRoad',
};

/** Overall music level against the sound effects. */
export const MUSIC_LEVEL = 0.45;
/** Seconds of a cross-fade between two tracks. */
export const MUSIC_FADE = 1.5;
/** Music level while the pause screen is up (a fraction, fades both ways). */
export const MUSIC_DUCK = 0.3;
