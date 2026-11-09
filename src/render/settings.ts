import { sanitizeSettings, type Settings } from '../core/settings';

/** Browser persistence of the options. Storage may be missing or blocked: defaults are used then. */
const KEY = 'eterra-survivors.settings';
let cached: Settings | null = null;

export function settings(): Settings {
  if (cached) return cached;
  try {
    cached = sanitizeSettings(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
  } catch {
    cached = sanitizeSettings(null);
  }
  return cached;
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
  settings()[key] = value;
  try {
    localStorage.setItem(KEY, JSON.stringify(cached));
  } catch {
    // Private mode or full storage: the option lasts for this session only.
  }
}
