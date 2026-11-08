import type { Pen } from './pen';
import type { ArtDef } from './types';

/** The four heroes as chibis facing right, in their identity colors (amber/brown/blue, purple/gold, green/white, red/black/silver). */
interface Look {
  skin: number;
  hair: number;
  body: number;
  trim: number;
  legs: number;
  /** Behind the body (sword on the back, staff...). */
  back?: (p: Pen) => void;
  /** Hair or hat on top of the head (outlined parts). */
  head: (p: Pen) => void;
  /** Details after the outline pass. */
  front?: (p: Pen) => void;
}

const W = 32;
const H = 38;

function chibi(look: Look): ArtDef {
  return {
    w: W,
    h: H,
    draw(p) {
      p.shadow(16, 35, 20, 6);
      look.back?.(p);
      p.rrect(10.5, 28, 4.5, 7, 2, look.legs).rrect(17, 28, 4.5, 7, 2, look.legs);
      p.rrect(8, 19, 16, 12, 5, look.body);
      p.circle(16, 13, 10, look.skin);
      look.head(p);
      p.ink();
      // Belt / trim and a body shine.
      p.fill(look.trim).fillRect(8.5, 25, 15, 2.5);
      p.shine(12, 22, 5, 3, 0.25);
      // Face, looking right.
      p.eye(15, 14.5, 2.1).eye(20.5, 14.5, 2.1);
      p.fill(0xf08080, 0.45).fillEllipse(12, 18, 3.5, 2).fillEllipse(23, 18, 3, 2);
      look.front?.(p);
    },
  };
}

const SKIN = 0xf4cca0;

export const HERO_ART: Record<string, ArtDef> = {
  /** Aldo: brown spiky hair, blue tunic, amber belt, the village sword on his back. */
  'player.aldo': chibi({
    skin: SKIN,
    hair: 0x6a3a1a,
    body: 0x3a78c8,
    trim: 0xe8b840,
    legs: 0x2c3c80,
    back: (p) => p.poly([22, 4, 25, 3, 13, 27, 10, 26], 0xcbd8ec).rrect(21, 2, 6, 4, 1.5, 0x9a6232),
    head: (p) =>
      p
        .ellipse(16, 8, 22, 11, 0x6a3a1a)
        .poly([6, 10, 8, 3, 12, 6, 15, 1, 19, 5, 23, 2, 25, 8, 26, 12, 22, 9, 17, 10, 11, 9], 0x6a3a1a),
  }),
  /** Lyra: purple pointed hat with a gold band, purple robe, gold trim. */
  'player.lyra': chibi({
    skin: SKIN,
    hair: 0x9a6232,
    body: 0x72308e,
    trim: 0xf0d860,
    legs: 0x40145a,
    back: (p) => p.rrect(24, 12, 2.5, 20, 1, 0x9a6232).circle(25.2, 11, 3, 0xf0d860),
    head: (p) =>
      p
        .ellipse(16, 11, 22, 10, 0x9a6232)
        .poly([4, 9, 28, 9, 24, 5, 21, -2, 15, -5, 18, 1, 9, 5], 0xa84ad8)
        .rrect(5, 7, 22, 3.5, 1.5, 0xf0d860),
  }),
  /** Teo: white hood with green trim, a holy pendant. */
  'player.teo': chibi({
    skin: SKIN,
    hair: 0xd8a478,
    body: 0xe8eff8,
    trim: 0x4ad08a,
    legs: 0x3a9a6a,
    head: (p) =>
      p
        .poly([5, 15, 6, 6, 11, 2, 21, 2, 26, 6, 27, 15, 24, 9, 16, 7, 8, 9], 0xe8eff8)
        .ellipse(16, 8, 14, 5, 0xd8a478),
    front: (p) => {
      p.fill(0x4ad08a).fillRect(5.5, 9, 2, 6).fillRect(24.5, 9, 2, 6);
      p.fill(0xf0d860).fillCircle(16, 22.5, 2.2);
    },
  }),
  /** Andilla: black hood, red scarf, a silver dagger in hand. */
  'player.andilla': chibi({
    skin: SKIN,
    hair: 0x7a1a24,
    body: 0x26202e,
    trim: 0xa8323e,
    legs: 0x26202e,
    back: (p) => p.poly([22, 22, 30, 17, 31, 19, 24, 25], 0xcbd8ec).rrect(20, 22, 5, 3.5, 1, 0x55555e),
    head: (p) =>
      p
        .poly([5, 16, 5, 7, 10, 2, 22, 2, 27, 7, 27, 16, 23, 10, 16, 8, 9, 10], 0x26202e)
        .ellipse(16, 9, 13, 5, 0x7a1a24)
        .rrect(8, 19, 16, 4, 2, 0xa8323e),
    front: (p) => p.shine(10, 7, 4, 2.5, 0.2),
  }),
};
