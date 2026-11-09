/**
 * The first of `levels` layouts (0 = roomiest) whose measured size fits in `room`; the last one when none does.
 * `measure` lays a level out and returns its size.
 */
export function firstFit(levels: number, room: number, measure: (level: number) => number): number {
  for (let level = 0; level < levels - 1; level++) if (measure(level) <= room) return level;
  return levels - 1;
}
