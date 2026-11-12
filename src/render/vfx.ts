import type { AssetDef } from './assets';

/**
 * Animated pixel effects (made with the PixelLab effects workbench, packed as a horizontal strip at 2 texture px
 * per art px in public/sprites/fx/vfx/). `anchor` is where the effect's origin sits in a frame (fractions); an effect
 * plays once over `frames` frames at `fps`. Logged in docs/art/credits.md.
 */
export interface VfxDef {
  frames: number;
  /** Frame size, art px. */
  w: number;
  h: number;
  anchor: readonly [number, number];
  fps: number;
}

export const VFX = {
  /** Raio: a bolt from above, a flash, a ring of force on the ground exactly as wide as the hit (ring radius 40 art px). */
  bolt: { frames: 10, w: 96, h: 240, anchor: [0.5, 0.925], fps: 16 },
  /** Fogo and Espada de Fogo's burst: a fireball whose ring reaches 44 art px (scaled to the blast radius). */
  blast: { frames: 9, w: 96, h: 96, anchor: [0.5, 0.5], fps: 14 },
  /** A flame (looping, 8 frames): the falling fireball and the flames on burning ground. */
  flame: { frames: 8, w: 48, h: 76, anchor: [0.5, 0.763], fps: 10 },
  /** Geada and Nevasca's crystals: they rise, shimmer and melt over the patch's life (stretch the 11 frames to it). */
  ice: { frames: 11, w: 144, h: 72, anchor: [0.5, 0.778], fps: 3 },
  /** Aura de Yah's ring of light and turning runes (looping); its outer ring is 57 art px from the centre. */
  aura: { frames: 12, w: 128, h: 128, anchor: [0.5, 0.5], fps: 12 },
  /** The mace's shock wave: two dusty rings running out; the big one reaches 50 art px (scaled to the wave radius). */
  shock: { frames: 7, w: 112, h: 112, anchor: [0.5, 0.5], fps: 14 },
  /** The hero blade's cut: a crescent of 145 degrees pointing right, 92 art px from the centre (rotate and scale to the swing). */
  slash: { frames: 6, w: 224, h: 224, anchor: [0.5, 0.5], fps: 16 },
} as const satisfies Record<string, VfxDef>;

export type VfxId = keyof typeof VFX;
export const vfxKey = (id: VfxId): string => `vfx.${id}`;

/** One asset per effect: a strip of `frames` frames, each w x h art px at 2 texture px per art px. */
export function vfxAssets(): Record<string, AssetDef> {
  return Object.fromEntries(
    (Object.entries(VFX) as [VfxId, VfxDef][]).map(([id, d]) => [
      vfxKey(id),
      {
        kind: 'sheet',
        url: `sprites/fx/vfx/${id}.png`,
        w: d.w * 2,
        h: d.h * 2,
        fps: d.fps,
      } satisfies AssetDef,
    ]),
  );
}

