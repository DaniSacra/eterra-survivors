/** Pure volume ramps of the music player (render/music.ts), kept apart so they can be tested without Phaser. */

/**
 * One step of a voice's own fade: `vol` moves linearly toward `target` over `fade` seconds. While the sound is still
 * locked (no gesture yet) nothing plays, so the fade must not run: the track enters with its full fade once unlocked.
 */
export function rampVolume(vol: number, target: number, dt: number, fade: number, unlocked: boolean): number {
  if (!unlocked) return vol;
  const step = dt / fade;
  if (vol < target) return Math.min(target, vol + step);
  if (vol > target) return Math.max(target, vol - step);
  return vol;
}

/** One step of the smoothed level shared by every voice (pause ducks it, silence takes it to 0). */
export function levelStep(now: number, target: number, dt: number): number {
  return now + (target - now) * Math.min(1, dt * 6);
}
