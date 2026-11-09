/** Player options, kept between sessions (render/settings.ts stores them). */
export interface Settings {
  /** Floating damage numbers over enemies. */
  damageNumbers: boolean;
  /** Calmer screen: no camera shake and softer flashes (accessibility). */
  calm: boolean;
  /** All sound off. */
  muted: boolean;
  /** Gaspar already greeted the player (his line shows on the first visit to the Loja). */
  gasparMet: boolean;
}

export const defaultSettings = (): Settings => ({
  damageNumbers: true,
  calm: false,
  muted: false,
  gasparMet: false,
});

/** Whatever was stored (possibly old, partial or broken) as valid settings. */
export function sanitizeSettings(raw: unknown): Settings {
  const out = defaultSettings();
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as Record<string, unknown>;
  for (const k of Object.keys(out) as (keyof Settings)[]) if (typeof r[k] === 'boolean') out[k] = r[k];
  return out;
}
