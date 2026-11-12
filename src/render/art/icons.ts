import { INK, type Pen } from './pen';
import type { ArtDef } from './types';

/**
 * Icons still drawn from code: the four small HUD ones and Gaspar's face. The weapon, Elo, passive and Loja icons
 * are PixelLab medallions (`public/sprites/icons/`, AR-04b, wired in `assets.ts`). 28 x 28 world px.
 */
const S = 28;
const C = S / 2;

function badge(bg: number, rim: number, symbol: (p: Pen) => void, glow = 0): ArtDef {
  return {
    w: S,
    h: S,
    draw(p) {
      if (glow) p.fill(glow, 0.45).fillCircle(C, C, C + 1);
      p.outline = 1.5;
      p.circle(C, C, C - 2, rim);
      p.ink();
      p.fill(bg).fillCircle(C, C, C - 4.5);
      p.fill(0xffffff, 0.15).fillEllipse(C - 4, C - 5, 12, 7);
      symbol(p);
    },
  };
}

const passive = (bg: number, sym: (p: Pen) => void) => badge(bg, 0xe8e2d0, sym);

export const ICON_ART: Record<string, ArtDef> = {
  /** A padlock, for locked stages and heroes. */
  'icon.lock': {
    w: 20,
    h: 22,
    draw(p) {
      p.outline = 1.5;
      p.g.lineStyle(6, INK, 1).beginPath().arc(10, 9, 5, Math.PI, 0).strokePath();
      p.g.lineStyle(3, 0xa8b8c8, 1).beginPath().arc(10, 9, 5, Math.PI, 0).strokePath();
      p.rrect(3, 9, 14, 11, 2.5, 0xd8a040);
      p.ink();
      p.fill(INK).fillCircle(10, 13.5, 1.6).fillRect(9.3, 13.5, 1.4, 3.5);
      p.fill(0xffffff, 0.35).fillRect(5, 10.5, 3, 7);
    },
  },
  /** A gold cup, for unlocked achievements and the in-run notice. */
  'icon.trophy': {
    w: 20,
    h: 22,
    draw(p) {
      p.outline = 1.5;
      p.ellipse(3.5, 6.5, 5, 6, 0xd8a040).ellipse(16.5, 6.5, 5, 6, 0xd8a040);
      p.poly([3.5, 2, 16.5, 2, 15, 10, 10, 13.5, 5, 10], 0xffd870);
      p.rrect(8.5, 12, 3, 5, 1, 0xd8a040).rrect(4.5, 16, 11, 4.5, 1.5, 0xd8a040);
      p.ink();
      p.fill(0x8a5a20).fillEllipse(3.5, 6.5, 2, 3).fillEllipse(16.5, 6.5, 2, 3);
      p.fill(0xffffff, 0.55).fillEllipse(7.5, 5.5, 2.5, 5);
      p.fill(0xb07a30).fillRect(5.5, 18.6, 9, 1.2);
    },
  },
  /** A slime drop with a down chevron: the hero is slowed (CU-02). */
  'icon.slow': {
    w: 16,
    h: 16,
    draw(p) {
      p.outline = 1.5;
      p.poly([8, 1.5, 12.5, 8, 12.5, 10.5, 10.5, 14, 5.5, 14, 3.5, 10.5, 3.5, 8], 0x7ad04a);
      p.ink();
      p.fill(0xe8ffc0, 0.7).fillEllipse(6.2, 9, 1.6, 2.6);
      p.fill(INK).fillRect(7.2, 7.5, 1.6, 3).fillTriangle(5.8, 10, 10.2, 10, 8, 12.4);
    },
  },
  /** A small cartoon skull, for the kill counter in the HUD. */
  'icon.kills': {
    w: 16,
    h: 16,
    draw(p) {
      p.outline = 1.5;
      p.circle(8, 7, 6, 0xe8e2d0).rrect(4.5, 9, 7, 5, 2, 0xe8e2d0);
      p.ink();
      p.fill(0xb8b0a0).fillRect(5.5, 12.4, 5, 1.6);
      p.fill(INK).fillCircle(5.8, 7.6, 1.8).fillCircle(10.2, 7.6, 1.8).fillTriangle(7.2, 11, 8.8, 11, 8, 9.6);
      p.fill(0xffffff, 0.6).fillCircle(5.4, 4.4, 1.2);
    },
  },
  /** Gaspar, the smith of Valmor: generic (the canon gives no looks), bearded, leather apron. */
  'icon.gaspar': passive(0x5a4030, (p) => {
    p.outline = 1.2;
    p.rrect(7, 19, 14, 7, 3, 0x7a5030); // apron over the shoulders
    p.circle(C, 12.5, 6, 0xe0b090); // face
    p.poly([8.5, 13, 19.5, 13, 18, 19, C, 21.5, 10, 19], 0x8a5a38); // beard
    p.ink();
    p.fill(0x8a5a38).fillEllipse(C, 7.5, 11, 4); // hair
    p.fill(INK).fillCircle(11.8, 11.8, 0.9).fillCircle(16.2, 11.8, 0.9);
    p.fill(0xc08068).fillEllipse(C, 14, 3, 2); // nose
  }),
  /** Banir: a red "no" sign. */
  'icon.banish': passive(0x5a2a2a, (p) => {
    p.g.lineStyle(3, 0xff8090, 1).strokeCircle(C, C, 7.5);
    p.g.lineBetween(C - 5.3, C + 5.3, C + 5.3, C - 5.3);
  }),
};
