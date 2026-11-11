import type { ArtDef } from './types';

/**
 * Pixel ground tiles: a texture of one seamless 128x128 grid of art pixels (1 art px = 2 texture
 * px, the game's one pixel density). Hard edges, flat palette colours, no blending: every tile is deterministic.
 */

/** Art pixels per side of one variant. */
export const VARIANT = 128;
/** Texture pixels per art pixel. */
const PX = 2;
/** Grids per side of the texture. */
const VARIANTS = 1;
/** Texture size of a ground tile. */
export const TILE_TEXTURE = VARIANT * PX * VARIANTS;

/** Ground palettes by tile key: `base` tones go from dark to light and are what the player stands on. */
export const TILE_PALETTES = {
  tile: { base: [0x2c3550, 0x34405e, 0x3e4b6c], accent: [0x3a9a6a, 0x55555e, 0xcbd8ec] },
  'tile.crypt': { base: [0x26243e, 0x363258, 0x403c64], accent: [0x3ec8a0, 0x4a4268, 0x1c1a2e] },
  'tile.road': { base: [0x323a50, 0x3a4258, 0x4a5470], accent: [0x4e566e, 0xe8eff8, 0x2a3044] },
  'tile.forest': { base: [0x161b2c, 0x1c2236, 0x232a42], accent: [0x234a44, 0xdce6f4, 0x3a2a24] },
} as const;

function hash(a: number, b: number, seed: number): number {
  let h = (a * 374761393 + b * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Seeded generator for scattering marks. */
function rng(seed: number): () => number {
  let s = seed * 9301 + 49297;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** A seamless grid of colours, 128x128 art pixels. */
class Grid {
  readonly cells = new Int32Array(VARIANT * VARIANT);
  set(x: number, y: number, c: number): void {
    const m = VARIANT;
    this.cells[(((y % m) + m) % m) * m + (((x % m) + m) % m)] = c;
  }
  rect(x: number, y: number, w: number, h: number, c: number): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }
}

/** Wrapping value noise (lattice of `cells` per side), 0..1. */
function noise(x: number, y: number, cells: number, seed: number): number {
  const s = VARIANT / cells;
  const gx = x / s;
  const gy = y / s;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const fx = gx - x0;
  const fy = gy - y0;
  const v = (i: number, j: number) =>
    hash(((i % cells) + cells) % cells, ((j % cells) + cells) % cells, seed);
  const sm = (t: number) => t * t * (3 - 2 * t);
  const a = v(x0, y0) + (v(x0 + 1, y0) - v(x0, y0)) * sm(fx);
  const b = v(x0, y0 + 1) + (v(x0 + 1, y0 + 1) - v(x0, y0 + 1)) * sm(fx);
  return a + (b - a) * sm(fy);
}

/** Fills the grid with three flat tones in soft blotches (hard thresholds, no blending). */
function blotches(g: Grid, base: readonly number[], seed: number): void {
  for (let y = 0; y < VARIANT; y++)
    for (let x = 0; x < VARIANT; x++) {
      const n = noise(x, y, 8, seed) * 0.65 + noise(x, y, 16, seed + 7) * 0.35;
      g.set(x, y, n < 0.36 ? (base[0] as number) : n > 0.64 ? (base[2] as number) : (base[1] as number));
    }
}

type Painter = (g: Grid, r: () => number, v: number) => void;

function tile(seed: number, base: readonly number[], paint: Painter, flat = false): ArtDef {
  return {
    w: TILE_TEXTURE,
    h: TILE_TEXTURE,
    draw(p) {
      for (let v = 0; v < VARIANTS * VARIANTS; v++) {
        const g = new Grid();
        if (flat) g.rect(0, 0, VARIANT, VARIANT, base[1] as number);
        else blotches(g, base, seed + v * 31);
        paint(g, rng(seed * 7 + v * 101 + 3), v);
        const ox = (v % VARIANTS) * VARIANT * PX;
        const oy = Math.floor(v / VARIANTS) * VARIANT * PX;
        for (let y = 0; y < VARIANT; y++)
          for (let x = 0; x < VARIANT; x++)
            p.fill(g.cells[y * VARIANT + x] as number).fillRect(ox + x * PX, oy + y * PX, PX, PX);
      }
    },
  };
}

/** Scatters `n` marks, each a tuple of pixels relative to its origin. */
function scatter(
  g: Grid,
  r: () => number,
  n: number,
  c: number,
  shape: readonly (readonly [number, number])[],
): void {
  for (let i = 0; i < n * 4; i++) {
    const x = Math.floor(r() * VARIANT);
    const y = Math.floor(r() * VARIANT);
    for (const [dx, dy] of shape) g.set(x + dx, y + dy, c);
  }
}

const TUFT = [
  [0, 0],
  [1, -1],
  [2, 0],
  [1, 0],
  [3, -1],
  [4, 0],
] as const;
const PEBBLE = [
  [0, 0],
  [1, 0],
  [2, 0],
  [0, 1],
  [1, 1],
] as const;
const DOT = [[0, 0]] as const;

const A = TILE_PALETTES;

export const PIXEL_TILES: Record<string, ArtDef> = {
  /** Valmor: night snow, frozen tufts, pebbles and a few glints. */
  tile: tile(11, A.tile.base, (g, r) => {
    scatter(g, r, 7, A.tile.accent[0], TUFT);
    scatter(g, r, 5, A.tile.accent[1], PEBBLE);
    scatter(g, r, 22, A.tile.accent[2], DOT);
  }),
  /** Cripta: flagstones in running bond, 1 px joints, a lit top edge, moss and the odd crack. */
  'tile.crypt': tile(
    7,
    A['tile.crypt'].base,
    (g, r) => {
      const rowH = 16;
      const tones = [0x403c64, 0x363258, 0x3c4a6c, 0x4a4268] as const;
      for (let row = 0; row < VARIANT / rowH; row++) {
        const off = row % 2 ? 16 : 0;
        for (let x = -off; x < VARIANT; x += 32) {
          const c = tones[Math.floor(r() * tones.length)] as number;
          g.rect(x, row * rowH, 32, rowH, c);
          g.rect(x + 1, row * rowH + 1, 30, 1, A['tile.crypt'].accent[1]);
          g.rect(x, row * rowH + rowH - 1, 32, 1, A['tile.crypt'].accent[2]);
          g.rect(x + 31, row * rowH, 1, rowH, A['tile.crypt'].accent[2]);
        }
      }
      scatter(g, r, 4, A['tile.crypt'].accent[0], [
        [0, 0],
        [1, 0],
        [0, 1],
        [2, 1],
        [1, 2],
      ]);
      scatter(g, r, 2, A['tile.crypt'].accent[2], [
        [0, 0],
        [1, 1],
        [1, 2],
        [2, 3],
        [3, 3],
      ]);
    },
    true,
  ),
  /** Estrada: packed snow with flat pebbles and glints. */
  'tile.road': tile(23, A['tile.road'].base, (g, r) => {
    scatter(g, r, 8, A['tile.road'].accent[0], PEBBLE);
    scatter(g, r, 6, A['tile.road'].accent[2], [
      [0, 0],
      [1, 0],
      [2, 0],
    ]);
    scatter(g, r, 18, A['tile.road'].accent[1], DOT);
  }),
  /** The forest flanking the road: snowy pines in offset rows over dark ground. */
  'tile.forest': tile(41, A['tile.forest'].base, (g, r) => {
    const [green, snow, trunk] = A['tile.forest'].accent;
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 4; col++) {
        const cx = col * 32 + (row % 2 ? 16 : 0) + 8 + Math.floor(r() * 6);
        const top = row * 32 + 2 + Math.floor(r() * 4);
        g.rect(cx - 1, top + 25, 2, 4, trunk);
        for (let t = 0; t < 3; t++) {
          const y0 = top + t * 7;
          const rows = 11 - (2 - t) * 0;
          for (let i = 0; i < rows; i++) {
            const half = Math.min(2 + Math.floor((i * (t + 3)) / 5), 5 + t * 2);
            g.rect(cx - half, y0 + i, half * 2 + 1, 1, green);
            if (i < 4) g.rect(cx - Math.max(0, half - 2), y0 + i, Math.max(0, half - 2) * 2 + 1, 1, snow);
          }
        }
      }
    scatter(g, r, 14, snow, DOT);
  }),
};
