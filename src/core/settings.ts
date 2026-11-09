/** Player options, kept between sessions (render/settings.ts stores them). */
export interface Settings {
  /** Floating damage numbers over enemies. */
  damageNumbers: boolean;
  /** Calmer screen: no camera shake and softer flashes (accessibility). */
  calm: boolean;
  /** All sound off. */
  muted: boolean;
  /** The short "what is an Elo" tip was shown (it shows once, the first time an Elo is ready). */
  eloTipSeen: boolean;
}

export const defaultSettings = (): Settings => ({
  damageNumbers: true,
  calm: false,
  muted: false,
  eloTipSeen: false,
});

/** Whatever was stored (possibly old, partial or broken) as valid settings. */
export function sanitizeSettings(raw: unknown): Settings {
  const out = defaultSettings();
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as Record<string, unknown>;
  for (const k of Object.keys(out) as (keyof Settings)[]) if (typeof r[k] === 'boolean') out[k] = r[k];
  return out;
}
