import { settings } from './settings';
import { DEV_MODE } from './dev';

/**
 * Anonymous usage counts through GoatCounter (https://valmor-resiste.goatcounter.com): no cookies, no personal data.
 * Only in production builds and never in test mode (?dev); the player can switch it off in Opções ("Estatísticas
 * anônimas"). Events are paths such as `start/valmor/aldo`; see `track` callers.
 */
const ENDPOINT = 'https://valmor-resiste.goatcounter.com/count';

interface GoatCounter {
  count: (vars: { path: string; title?: string; event?: boolean }) => void;
}
const goat = (): GoatCounter | undefined => (window as unknown as { goatcounter?: GoatCounter }).goatcounter;

const enabled = (): boolean => import.meta.env.PROD && !DEV_MODE && settings().stats;

/** Loads GoatCounter's script once, and counts the visit itself. */
export function initAnalytics(): void {
  if (!enabled()) return;
  try {
    (window as unknown as { goatcounter: object }).goatcounter = { no_onload: false };
    const s = document.createElement('script');
    s.async = true;
    s.src = 'https://gc.zgo.at/count.js';
    s.dataset.goatcounter = ENDPOINT;
    document.head.appendChild(s);
  } catch {
    // Blocked or no DOM: the game does not need it.
  }
}

/** Counts one event (a path, with an optional readable title). Silent when off, blocked or not loaded yet. */
export function track(path: string, title?: string): void {
  if (!enabled()) return;
  try {
    goat()?.count({ path, title, event: true });
  } catch {
    // Never let counting break the game.
  }
}
