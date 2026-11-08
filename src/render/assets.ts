import type Phaser from 'phaser';

/**
 * The single asset map. Every visual is referenced by key; today they are generated from code.
 * To use real art, change an entry to `{ kind: 'image', url: 'sprites/foo.png' }` (files in /public).
 */
type Shape = 'circle' | 'square' | 'triangle' | 'diamond' | 'hex' | 'ring';

export type AssetDef =
  | { kind: 'shape'; shape: Shape; size: number; color: number; stroke?: number }
  | { kind: 'tile'; size: number; color: number; speckle: number }
  | { kind: 'image'; url: string };

export const ASSETS = {
  tile: { kind: 'tile', size: 128, color: 0x1a2030, speckle: 0x2c3548 },
  player: { kind: 'shape', shape: 'circle', size: 28, color: 0x3a78c8, stroke: 0xe8e2d0 },
  'enemy.skeleton': { kind: 'shape', shape: 'square', size: 22, color: 0xd8d0b8, stroke: 0x6a6250 },
  'enemy.spider': { kind: 'shape', shape: 'triangle', size: 26, color: 0x8a4ab8, stroke: 0x3a1a58 },
  'enemy.slime': { kind: 'shape', shape: 'hex', size: 36, color: 0x5aa040, stroke: 0x2e5418 },
  'proj.elunLight': { kind: 'shape', shape: 'circle', size: 14, color: 0xfff2b0, stroke: 0xffd040 },
  'gem.small': { kind: 'shape', shape: 'diamond', size: 12, color: 0x40c8e8, stroke: 0xd0f4ff },
  'gem.medium': { kind: 'shape', shape: 'diamond', size: 16, color: 0x40e870, stroke: 0xd8ffe0 },
  'gem.large': { kind: 'shape', shape: 'diamond', size: 22, color: 0xe84060, stroke: 0xffd8e0 },
  'enemy.oldWolf': { kind: 'shape', shape: 'triangle', size: 44, color: 0x8a8a96, stroke: 0xffd040 },
  'enemy.golem': { kind: 'shape', shape: 'square', size: 52, color: 0x7a7266, stroke: 0xffa020 },
  'pickup.chest': { kind: 'shape', shape: 'square', size: 24, color: 0xb07020, stroke: 0xffe080 },
  'enemy.blackKnight': { kind: 'shape', shape: 'diamond', size: 76, color: 0x1a1a24, stroke: 0xc8323e },
} satisfies Record<string, AssetDef>;

export type AssetKey = keyof typeof ASSETS;

export function preloadAssets(scene: Phaser.Scene): void {
  for (const [key, def] of Object.entries(ASSETS) as [string, AssetDef][]) {
    if (def.kind === 'image') scene.load.image(key, def.url);
  }
}

/** Generates the code-drawn textures. Call in `create()` after `preloadAssets`. */
export function generateAssets(scene: Phaser.Scene): void {
  const g = scene.make.graphics({}, false);
  for (const [key, def] of Object.entries(ASSETS) as [string, AssetDef][]) {
    if (def.kind === 'image' || scene.textures.exists(key)) continue;
    g.clear();
    if (def.kind === 'tile') drawTile(g, def.size, def.color, def.speckle);
    else drawShape(g, def.shape, def.size, def.color, def.stroke);
    g.generateTexture(key, def.size, def.size);
  }
  g.destroy();
}

function drawTile(g: Phaser.GameObjects.Graphics, size: number, color: number, speckle: number): void {
  g.fillStyle(color).fillRect(0, 0, size, size);
  // Deterministic scatter: frost speckles and a few stones.
  let s = 7;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  g.fillStyle(speckle);
  for (let i = 0; i < 40; i++) g.fillRect(Math.floor(rnd() * size), Math.floor(rnd() * size), 2, 2);
  g.fillStyle(speckle, 0.6);
  for (let i = 0; i < 4; i++) g.fillCircle(rnd() * size, rnd() * size, 3 + rnd() * 4);
}

function drawShape(
  g: Phaser.GameObjects.Graphics,
  shape: Shape,
  size: number,
  color: number,
  stroke?: number,
) {
  const c = size / 2;
  const r = c - 2;
  g.fillStyle(color);
  if (stroke !== undefined) g.lineStyle(2, stroke);
  const poly = (sides: number, rot: number) => {
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < sides; i++) {
      const a = rot + (i / sides) * Math.PI * 2;
      pts.push({ x: c + Math.cos(a) * r, y: c + Math.sin(a) * r });
    }
    g.fillPoints(pts, true);
    if (stroke !== undefined) g.strokePoints(pts, true);
  };
  switch (shape) {
    case 'circle':
      g.fillCircle(c, c, r);
      if (stroke !== undefined) g.strokeCircle(c, c, r);
      break;
    case 'ring':
      g.lineStyle(Math.max(2, size / 16), color).strokeCircle(c, c, r);
      break;
    case 'square':
      g.fillRect(2, 2, size - 4, size - 4);
      if (stroke !== undefined) g.strokeRect(2, 2, size - 4, size - 4);
      break;
    case 'triangle':
      poly(3, -Math.PI / 2);
      break;
    case 'diamond':
      poly(4, 0);
      break;
    case 'hex':
      poly(6, 0);
      break;
  }
}
