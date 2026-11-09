import type Phaser from 'phaser';

/**
 * Cheap round shapes for per-frame effects. Phaser's own `fillCircle`, `strokeCircle`, `arc` and `slice` always
 * build 100-point paths (and fills run them through earcut), whatever the size: a small spark costs as much as the
 * whole aura. These use a few segments picked by size, from a precomputed table: fills are triangle fans and
 * strips (no earcut), strokes are short polylines. Nothing is allocated on our side.
 */
const N = 48;
const COS: number[] = [];
const SIN: number[] = [];
for (let i = 0; i <= N; i++) {
  COS.push(Math.cos((i / N) * Math.PI * 2));
  SIN.push(Math.sin((i / N) * Math.PI * 2));
}

/** Table step for a circle of radius r (fewer segments for small ones; N / step segments in all). */
const stepFor = (r: number): number => (r < 5 ? 8 : r < 12 ? 6 : r < 30 ? 4 : r < 80 ? 2 : 1);

/** A filled circle (current fill style). */
export function disc(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number): void {
  if (r <= 0) return;
  const s = stepFor(r);
  for (let i = 0; i < N; i += s) {
    const j = i + s;
    g.fillTriangle(
      x,
      y,
      x + (COS[i] as number) * r,
      y + (SIN[i] as number) * r,
      x + (COS[j] as number) * r,
      y + (SIN[j] as number) * r,
    );
  }
}

/** A circle outline (current line style). */
export function ring(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number): void {
  if (r <= 0) return;
  const s = stepFor(r);
  g.beginPath();
  g.moveTo(x + r, y);
  for (let i = s; i < N; i += s) g.lineTo(x + (COS[i] as number) * r, y + (SIN[i] as number) * r);
  g.closePath();
  g.strokePath();
}

/** Number of segments for an arc of radius r spanning `da` radians. */
const segsFor = (r: number, da: number): number =>
  Math.max(2, Math.min(N, Math.ceil((Math.abs(da) * r) / 10)));

/** An open arc from a0 to a1 (current line style). */
export function arcLine(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  r: number,
  a0: number,
  a1: number,
): void {
  const n = segsFor(r, a1 - a0);
  const da = (a1 - a0) / n;
  g.beginPath();
  g.moveTo(x + Math.cos(a0) * r, y + Math.sin(a0) * r);
  for (let i = 1; i <= n; i++) g.lineTo(x + Math.cos(a0 + da * i) * r, y + Math.sin(a0 + da * i) * r);
  g.strokePath();
}

/** Fills the ring sector between radii r0 and r1, angles a0 to a1 (r0 = 0: a pie slice). */
export function band(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  r0: number,
  r1: number,
  a0: number,
  a1: number,
): void {
  const n = segsFor(r1, a1 - a0);
  const da = (a1 - a0) / n;
  let c = Math.cos(a0);
  let s = Math.sin(a0);
  for (let i = 1; i <= n; i++) {
    const c2 = Math.cos(a0 + da * i);
    const s2 = Math.sin(a0 + da * i);
    g.fillTriangle(x + c * r1, y + s * r1, x + c2 * r1, y + s2 * r1, x + c * r0, y + s * r0);
    if (r0 > 0) g.fillTriangle(x + c2 * r1, y + s2 * r1, x + c2 * r0, y + s2 * r0, x + c * r0, y + s * r0);
    c = c2;
    s = s2;
  }
}
