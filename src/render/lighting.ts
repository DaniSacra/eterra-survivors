import Phaser from 'phaser';
import type { StageId } from '../data/stages';

/**
 * Darkness and light (art direction since 2026-11-10). The world's ground sits under a light map: a render texture
 * filled each frame with the stage's ambient colour and lit by additive radial stamps, shown with MULTIPLY. Lit
 * spots keep their true colours; the rest falls into the stage's tinted night. The map is drawn at a fraction of
 * the screen resolution (lights are soft) and every light lives in preallocated arrays: nothing allocates per frame.
 *
 * Only the terrain (ground, decals, obstacles, forest) is under the map. Gems, effects, enemies, projectiles and the
 * hero draw above it, so threats never hide in the dark; enemies are shaded instead by their distance to the hero's
 * light (`enemyTint`), keeping enough value to read outside it.
 */

/** Per stage: the ambient colour the night multiplies the ground by, and the tint of an enemy far from any light. */
export const STAGE_DARK: Record<StageId, { ambient: number; enemy: number }> = {
  valmor: { ambient: 0x323e66, enemy: 0x9aa4c8 },
  crypt: { ambient: 0x2e221e, enemy: 0xb09888 },
  southRoad: { ambient: 0x38466e, enemy: 0x9eaacc },
};

/** Depth of the light map: over the terrain (0 to 2.6), under gems (3) and effects (4). */
export const DARK_DEPTH = 2.9;

const KEY = 'light.radial';
const SIZE = 128;
/** The light map's resolution, relative to world px. */
const RES = 0.25;
const MAX_LIGHTS = 320;
const MAX_FLASHES = 16;
/** The hero's light radius (world px): enemies inside it show their true colours. */
export const HERO_LIGHT = 200;

/** The soft radial texture every light is stamped with (white centre, smooth falloff to black). */
function ensureTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(KEY)) return;
  const tex = scene.textures.createCanvas(KEY, SIZE, SIZE) as Phaser.Textures.CanvasTexture;
  const ctx = tex.getContext();
  const g = ctx.createRadialGradient(SIZE / 2, SIZE / 2, 0, SIZE / 2, SIZE / 2, SIZE / 2);
  // Opaque, white to black: additive stamps add nothing where it is black (a transparent edge would still add white).
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.35, '#bfbfbf');
  g.addColorStop(0.7, '#404040');
  g.addColorStop(1, '#000000');
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);
  tex.refresh();
}

/** Mixes two 0xRRGGBB colours (f = 0 gives a, 1 gives b). No allocation: it runs per enemy per frame. */
export function mixColor(a: number, b: number, f: number): number {
  const r = ((a >> 16) & 255) + (((b >> 16) & 255) - ((a >> 16) & 255)) * f;
  const g = ((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * f;
  const bl = (a & 255) + ((b & 255) - (a & 255)) * f;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
}

export class Lighting {
  private rt: Phaser.GameObjects.RenderTexture;
  private readonly scene: Phaser.Scene;
  private readonly ambient: number;
  private readonly enemyDark: number;
  private readonly xs = new Float32Array(MAX_LIGHTS);
  private readonly ys = new Float32Array(MAX_LIGHTS);
  private readonly rs = new Float32Array(MAX_LIGHTS);
  private readonly as = new Float32Array(MAX_LIGHTS);
  private readonly cs = new Uint32Array(MAX_LIGHTS);
  private count = 0;
  // Flashes: short lights that fade (bombs, the forge), in a ring buffer.
  private readonly fx = new Float32Array(MAX_FLASHES);
  private readonly fy = new Float32Array(MAX_FLASHES);
  private readonly fr = new Float32Array(MAX_FLASHES);
  private readonly ft = new Float32Array(MAX_FLASHES);
  private readonly fd = new Float32Array(MAX_FLASHES);
  private readonly fc = new Uint32Array(MAX_FLASHES);
  private nextFlash = 0;
  /** The hero's light centre, for `enemyTint`. */
  private hx = 0;
  private hy = 0;
  /** Reused stamp settings (one object for every light). */
  private readonly stamp = {
    alpha: 1,
    tint: 0xffffff,
    scale: 1,
    blendMode: Phaser.BlendModes.ADD,
    skipBatch: true,
  };

  constructor(scene: Phaser.Scene, stage: StageId) {
    ensureTexture(scene);
    const dark = STAGE_DARK[stage];
    this.ambient = dark.ambient;
    this.enemyDark = dark.enemy;
    this.scene = scene;
    this.rt = this.make(4, 4);
  }

  /** A light map of w x h px. (Phaser 3.90's resize() leaves a render texture that no longer draws: remake it.) */
  private make(w: number, h: number): Phaser.GameObjects.RenderTexture {
    return this.scene.add
      .renderTexture(0, 0, w, h)
      .setOrigin(0)
      .setDepth(DARK_DEPTH)
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
      .setScale(1 / RES);
  }

  /** Starts a frame's light list. */
  begin(): void {
    this.count = 0;
  }

  /** Adds a light for this frame (world px; alpha 0 to 1 is its strength). Over the cap it is dropped. */
  add(x: number, y: number, radius: number, color: number, alpha = 1): void {
    const i = this.count;
    if (i >= MAX_LIGHTS) return;
    this.xs[i] = x;
    this.ys[i] = y;
    this.rs[i] = radius;
    this.cs[i] = color;
    this.as[i] = alpha;
    this.count = i + 1;
  }

  /** The hero's light (always on), which also lights the enemies around them. */
  hero(x: number, y: number, color: number): void {
    this.hx = x;
    this.hy = y;
    this.add(x, y, HERO_LIGHT * 1.6, mixColor(color, 0xffffff, 0.4), 0.9);
    this.add(x, y, HERO_LIGHT * 0.8, 0xffe8c8, 0.7);
  }

  /** A short light that fades over `seconds` (skipped by the caller with the calm screen). */
  flash(x: number, y: number, radius: number, color: number, seconds: number): void {
    const i = this.nextFlash;
    this.nextFlash = (i + 1) % MAX_FLASHES;
    this.fx[i] = x;
    this.fy[i] = y;
    this.fr[i] = radius;
    this.fc[i] = color;
    this.ft[i] = seconds;
    this.fd[i] = seconds;
  }

  /**
   * An enemy's tint at (x, y): its true colours inside the hero's light, the stage's night tint outside, smooth in
   * between.
   */
  enemyTint(x: number, y: number): number {
    const dx = x - this.hx;
    const dy = y - this.hy;
    const d = Math.sqrt(dx * dx + dy * dy) / HERO_LIGHT;
    if (d <= 0.6) return 0xffffff;
    if (d >= 1.6) return this.enemyDark;
    return mixColor(0xffffff, this.enemyDark, (d - 0.6) / 1.0);
  }

  /** Draws the light map over the view rectangle (world px) and ages the flashes by `dt` seconds. */
  render(vx: number, vy: number, vw: number, vh: number, dt: number): void {
    const w = Math.ceil(vw * RES) + 2;
    const h = Math.ceil(vh * RES) + 2;
    if (this.rt.width !== w || this.rt.height !== h) {
      this.rt.destroy();
      this.rt = this.make(w, h);
    }
    const rt = this.rt;
    rt.setPosition(vx, vy);
    rt.fill(this.ambient);
    for (let i = 0; i < MAX_FLASHES; i++) {
      const left = this.ft[i] as number;
      if (left <= 0) continue;
      this.ft[i] = left - dt;
      const k = left / (this.fd[i] as number);
      this.add(this.fx[i] as number, this.fy[i] as number, this.fr[i] as number, this.fc[i] as number, k * k);
    }
    const s = this.stamp;
    // One batch for every light (the stamps skip their own).
    rt.beginDraw();
    for (let i = 0; i < this.count; i++) {
      const r = (this.rs[i] as number) * RES;
      const x = ((this.xs[i] as number) - vx) * RES;
      const y = ((this.ys[i] as number) - vy) * RES;
      if (x + r < 0 || y + r < 0 || x - r > w || y - r > h) continue;
      s.alpha = this.as[i] as number;
      s.tint = this.cs[i] as number;
      s.scale = (r * 2) / SIZE;
      rt.stamp(KEY, undefined, x, y, s);
    }
    rt.endDraw();
  }
}
