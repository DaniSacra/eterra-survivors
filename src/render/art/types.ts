import type { Pen } from './pen';

/** A code-drawn sprite: its size in world pixels and how to draw it (facing right, feet at the bottom). */
export interface ArtDef {
  w: number;
  h: number;
  draw: (p: Pen) => void;
}
