/** The music's two loudness levels; "off" is `music: false`. */
export type MusicLevel = 'low' | 'normal';

/** Player options, kept between sessions (render/settings.ts stores them). */
export interface Settings {
  /** Floating damage numbers over enemies. */
  damageNumbers: boolean;
  /** Calmer screen: no camera shake and softer flashes (accessibility). */
  calm: boolean;
  /** All sound off. */
  muted: boolean;
  /** The background music (sound effects stay). */
  music: boolean;
  /** How loud the music plays while `music` is on (PS-01); an old save without it plays at Normal. */
  musicLevel: MusicLevel;
  /** Gaspar already greeted the player (his line shows on the first visit to the Loja). */
  gasparMet: boolean;
}

export const defaultSettings = (): Settings => ({
  damageNumbers: true,
  calm: false,
  muted: false,
  music: true,
  musicLevel: 'normal',
  gasparMet: false,
});

/** Whatever was stored (possibly old, partial or broken) as valid settings. */
export function sanitizeSettings(raw: unknown): Settings {
  const out = defaultSettings();
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as Record<string, unknown>;
  for (const k of Object.keys(out) as (keyof Settings)[])
    if (typeof r[k] === 'boolean') (out as unknown as Record<string, unknown>)[k] = r[k];
  if (r.musicLevel === 'low' || r.musicLevel === 'normal') out.musicLevel = r.musicLevel;
  return out;
}

/** The Options button for the music cycles Desligada, Baixa, Normal and back to Desligada. */
export function nextMusic(s: Pick<Settings, 'music' | 'musicLevel'>): Pick<Settings, 'music' | 'musicLevel'> {
  if (!s.music) return { music: true, musicLevel: 'low' };
  return s.musicLevel === 'low'
    ? { music: true, musicLevel: 'normal' }
    : { music: false, musicLevel: 'normal' };
}

/** The music's volume factor: 0 when off, half at Baixa, full at Normal. */
export function musicScale(s: Pick<Settings, 'music' | 'musicLevel'>): number {
  return !s.music ? 0 : s.musicLevel === 'low' ? 0.5 : 1;
}
