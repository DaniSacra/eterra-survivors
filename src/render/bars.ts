import Phaser from 'phaser';
import { ART_RES } from './art/pen';

/**
 * Pixel bars (PA-01): the frame and the fill of life, boss and experience bars are textures baked once at ART_RES
 * (no `Graphics` redraw per frame). A bar is two 9-slices: the frame, stretched to the bar's size, and the fill, whose
 * width is the only thing that changes (`set`).
 */
type Look = 'hp' | 'xp' | 'boss';

const LOOKS: Record<
  Look,
  { track: string; hi: string; mid: string; lo: string; shine: string; rim?: string; rimHi?: string }
> = {
  hp: { track: '#2a0e16', hi: '#ff8a96', mid: '#d83a4a', lo: '#8a1f30', shine: '#ffd0d6' },
  // The boss bar (CU-03): dark violet with a thin gold rim, apart from the hero's coral life and the cyan XP.
  boss: {
    track: '#16101e',
    hi: '#d6b0ff',
    mid: '#8a46d0',
    lo: '#4a2088',
    shine: '#f4e4ff',
    rim: '#b8902c',
    rimHi: '#f0d070',
  },
  xp: { track: '#0e1c2c', hi: '#d4f8ff', mid: '#7ae6ff', lo: '#3a8fb0', shine: '#ffffff' },
};
const OUT = '#0b0d14';
const STEEL_HI = '#6a738a';
const STEEL = '#3c4560';

const key = (what: 'frame' | 'fill', look: Look, small: boolean): string =>
  `bar.${what}.${look}${small ? '.s' : ''}`;

/** Frame/fill corner in texture px (the 9-slice keeps it crisp). */
export const BAR_TEX = {
  large: { frameCorner: 3 * ART_RES, inset: 2 * ART_RES, fillCorner: ART_RES },
  small: { frameCorner: 2 * ART_RES, inset: ART_RES, fillCorner: ART_RES },
};

function bake(
  scene: Phaser.Scene,
  name: string,
  w: number,
  h: number,
  draw: (c: CanvasRenderingContext2D) => void,
): void {
  if (scene.textures.exists(name)) return;
  const src = document.createElement('canvas');
  src.width = w;
  src.height = h;
  draw(src.getContext('2d') as CanvasRenderingContext2D);
  const tex = scene.textures.createCanvas(name, w * ART_RES, h * ART_RES) as Phaser.Textures.CanvasTexture;
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, w * ART_RES, h * ART_RES);
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
}

/** Bakes every bar texture (idempotent). */
export function ensureBarTextures(scene: Phaser.Scene): void {
  for (const look of Object.keys(LOOKS) as Look[]) {
    const c = LOOKS[look];
    // Large frame (HUD): 8 x 8 art px, rounded outline, steel rim lit from the top, dark track.
    bake(scene, key('frame', look, false), 8, 8, (g) => {
      const r = (x: number, y: number, w: number, h: number, col: string) => {
        g.fillStyle = col;
        g.fillRect(x, y, w, h);
      };
      r(0, 0, 8, 8, OUT);
      r(1, 1, 6, 6, c.rim ?? STEEL);
      r(1, 1, 6, 1, c.rimHi ?? STEEL_HI);
      r(2, 2, 4, 4, c.track);
      r(2, 2, 4, 1, '#000000');
      g.clearRect(0, 0, 1, 1);
      g.clearRect(7, 0, 1, 1);
      g.clearRect(0, 7, 1, 1);
      g.clearRect(7, 7, 1, 1);
    });
    // Large fill: 4 art px tall (highlight, light, mid, dark), a shine dot at the left end.
    bake(scene, key('fill', look, false), 4, 4, (g) => {
      g.fillStyle = c.hi;
      g.fillRect(0, 0, 4, 1);
      g.fillStyle = c.mid;
      g.fillRect(0, 1, 4, 2);
      g.fillStyle = c.lo;
      g.fillRect(0, 3, 4, 1);
      g.fillStyle = c.shine;
      g.fillRect(0, 0, 1, 1);
    });
    // Small frame (under the hero's feet): 6 x 5 art px, outline only.
    bake(scene, key('frame', look, true), 6, 5, (g) => {
      g.fillStyle = OUT;
      g.fillRect(0, 0, 6, 5);
      g.fillStyle = c.track;
      g.fillRect(1, 1, 4, 3);
      g.clearRect(0, 0, 1, 1);
      g.clearRect(5, 0, 1, 1);
      g.clearRect(0, 4, 1, 1);
      g.clearRect(5, 4, 1, 1);
    });
    bake(scene, key('fill', look, true), 4, 3, (g) => {
      g.fillStyle = c.hi;
      g.fillRect(0, 0, 4, 1);
      g.fillStyle = c.mid;
      g.fillRect(0, 1, 4, 1);
      g.fillStyle = c.lo;
      g.fillRect(0, 2, 4, 1);
    });
  }
}

/** A frame plus a fill, both preallocated; `place` lays them out, `set` changes the filled share. */
export class PixelBar {
  readonly frame: Phaser.GameObjects.NineSlice;
  readonly fill: Phaser.GameObjects.NineSlice;
  private readonly inset: number;
  private innerW = 0;
  private shown = -1;

  constructor(scene: Phaser.Scene, look: Look, small = false) {
    ensureBarTextures(scene);
    const d = small ? BAR_TEX.small : BAR_TEX.large;
    const fc = d.frameCorner;
    this.inset = d.inset;
    this.frame = scene.add
      .nineslice(0, 0, key('frame', look, small), undefined, 16, 16, fc, fc, fc, fc)
      .setOrigin(0);
    const k = d.fillCorner;
    this.fill = scene.add.nineslice(0, 0, key('fill', look, small), undefined, 4, 4, k, k, 0, 0).setOrigin(0);
  }

  /** Top-left corner and outer size in world px. */
  place(x: number, y: number, w: number, h: number): this {
    this.frame.setPosition(x, y).setSize(w, h);
    this.fill.setPosition(x + this.inset, y + this.inset);
    this.innerW = w - this.inset * 2;
    this.shown = -1;
    this.fill.setSize(this.innerW, h - this.inset * 2);
    return this;
  }

  /** Moves the bar without resizing it. */
  moveTo(x: number, y: number): this {
    this.frame.setPosition(x, y);
    this.fill.setPosition(x + this.inset, y + this.inset);
    return this;
  }

  /** The filled share, 0 to 1 (hidden when it would be thinner than the fill's two ends). */
  set(ratio: number): this {
    const w = Math.round(this.innerW * Math.min(1, Math.max(0, ratio)));
    if (w === this.shown) return this;
    this.shown = w;
    if (w < ART_RES * 2) this.fill.setVisible(false);
    else this.fill.setVisible(true).setSize(w, this.fill.height);
    return this;
  }

  setVisible(v: boolean): this {
    this.frame.setVisible(v);
    this.fill.setVisible(v);
    return this;
  }

  setDepth(d: number): this {
    this.frame.setDepth(d);
    this.fill.setDepth(d + 0.01);
    return this;
  }

  setTint(c: number): this {
    this.fill.setTint(c);
    return this;
  }
}
