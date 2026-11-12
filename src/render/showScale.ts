// Pure sizing rule of the Bestiário's showcase (no Phaser, so it is tested).

/** The smallest and the largest enemy sprite (art px, by `showSize`): the ends of the Bestiário's size scale. */
const SIZE_MIN = 32;
const SIZE_MAX = 160;

/** An enemy's real size for ordering: its frame's height, or three quarters of its width when that is more. */
export const showSize = (frameW: number, frameH: number): number => Math.max(frameH, frameW * 0.75);

/**
 * How large an enemy shows in the Bestiário box (art px per art px, in steps of a half so pixels stay even). Shown
 * bigger than on the field, but never out of order: a larger enemy always shows larger than a smaller one, the
 * smallest filling a third of the box and the largest filling it.
 */
export function showScale(frameW: number, frameH: number, boxW: number, boxH: number): number {
  const size = showSize(frameW, frameH);
  const t = Math.min(1, Math.max(0, (size - SIZE_MIN) / (SIZE_MAX - SIZE_MIN)));
  const height = boxH * 0.78 * (0.34 + 0.66 * t ** 0.65);
  const fit = Math.min(height / frameH, (boxW * 0.42) / frameW);
  return Math.max(1, Math.floor(fit * 2) / 2);
}
