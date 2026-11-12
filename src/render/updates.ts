/**
 * Updates must be noticed without clearing any cache: every deploy writes `version.json` with its build stamp (also in
 * the bundle as `__BUILD_ID__`). The game compares them when it opens, when the tab comes back and every few minutes;
 * a newer one reloads the page at once, or, in the middle of a run, as soon as the player is back on the menu.
 */
const KEY = 'eterra-survivors.updated';
let pending = false;

/** The remote build stamp, or null when offline or in development. */
async function latestBuild(): Promise<string | null> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}version.json`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as { build?: string };
    return typeof data.build === 'string' ? data.build : null;
  } catch {
    return null;
  }
}

function reload(build: string): void {
  try {
    // Remembered so the menu can say so (and so a stale server answer cannot make the page reload forever).
    if (sessionStorage.getItem(KEY) === build) return;
    sessionStorage.setItem(KEY, build);
  } catch {
    // No storage: reload anyway, once per page load.
  }
  window.location.reload();
}

async function check(canReloadNow: () => boolean): Promise<void> {
  const build = await latestBuild();
  if (!build || build === __BUILD_ID__) return;
  if (canReloadNow()) reload(build);
  else pending = true;
}

/** Starts the checks (production only). `inRun` says whether a run is going, which a reload would lose. */
export function watchUpdates(inRun: () => boolean): void {
  if (!import.meta.env.PROD) return;
  const run = () => void check(() => !inRun());
  run();
  window.setInterval(run, 5 * 60_000);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && run());
}

/** Called when the menu opens: a newer version found during a run is applied now. */
export function applyPendingUpdate(): void {
  if (!pending) return;
  void latestBuild().then((build) => build && build !== __BUILD_ID__ && reload(build));
}

/** True once right after a reload that brought a new version (the menu says so). */
export function justUpdated(): boolean {
  try {
    const hit =
      sessionStorage.getItem(KEY) === __BUILD_ID__ && sessionStorage.getItem(`${KEY}.shown`) !== '1';
    if (hit) sessionStorage.setItem(`${KEY}.shown`, '1');
    return hit;
  } catch {
    return false;
  }
}
