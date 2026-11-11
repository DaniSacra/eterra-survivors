import { INK, shade } from './pen';
import type { ArtDef } from './types';

/**
 * Enemies facing right. Threat ladder: common ones are funny (big eyes), story ones are serious (glowing eyes),
 * bosses are big and menacing (light from below).
 */

/** `eyes`: the glow color of a story skeleton, or null for a common one's funny cartoon eyes. */
function skeleton(bone: number, eyes: number | null, s = 1): ArtDef {
  return {
    w: Math.round(26 * s),
    h: Math.round(30 * s),
    draw(p) {
      const d = shade(bone, 0.62);
      p.g.save();
      p.g.scaleCanvas(s, s);
      p.shadow(13, 27, 16, 5);
      p.rrect(9, 20, 3, 7, 1.5, bone).rrect(14.5, 20, 3, 7, 1.5, bone); // legs
      p.rrect(7.5, 12, 12, 9, 3, bone); // ribcage
      p.rrect(2, 13, 5, 3, 1.5, bone).rrect(19, 13, 5, 3, 1.5, bone); // arms
      p.circle(14, 8, 7, bone); // skull
      p.rrect(10, 11, 9, 4, 2, bone); // jaw
      p.ink();
      p.fill(d).fillRect(9.5, 14, 8, 1.2).fillRect(9.5, 16.5, 8, 1.2).fillRect(13, 12.5, 1.4, 7);
      p.fill(INK).fillEllipse(12.2, 8, 3.6, 4).fillEllipse(17.4, 8, 3.6, 4).fillRect(12, 12.6, 6, 1);
      if (eyes === null) p.eye(12.4, 8, 1.5).eye(17.6, 8, 1.5);
      else p.glow(12.6, 8.2, 0.9, eyes).glow(17.8, 8.2, 0.9, eyes);
      p.shine(11, 5, 4, 2.5, 0.35);
      p.g.restore();
    },
  };
}

/** A rat: the big brown ones of the crypt, or the small grey ones of the graveyard. */
function rat(fur: number, s: number): ArtDef {
  return {
    w: Math.round(34 * s),
    h: Math.round(24 * s),
    draw(p) {
      p.g.save();
      p.g.scaleCanvas(s, s);
      p.shadow(17, 21, 22, 5);
      p.line(6, 15, 1, 9, 2.6, INK).line(6, 15, 1, 9, 1.2, 0xe8a0a8); // tail
      p.rrect(9, 16, 4, 5, 2, fur).rrect(19, 16, 4, 5, 2, fur); // legs
      p.ellipse(15, 13, 22, 14, fur); // body: about 2 x radius, so it reads bigger than a bat
      p.poly([20, 6, 32, 11, 31.5, 15, 20, 19], fur); // head and snout
      p.circle(21, 5, 4.2, fur); // ear
      p.ink();
      p.fill(0xe8a0a8).fillCircle(21, 5, 2.2).fillCircle(32, 12.5, 1.5);
      p.fill(shade(fur, 1.25)).fillEllipse(14, 17, 14, 4.5);
      p.eye(25, 10.5, 2.4);
      p.fill(0xffffff).fillRect(29, 15, 1.5, 2.2);
      p.shine(10, 9, 6, 3, 0.3);
      p.g.restore();
    },
  };
}

function winged(body: number, wing: number, kind: 'bat' | 'crow'): ArtDef {
  return {
    w: 28,
    h: 22,
    draw(p) {
      p.shadow(14, 20, 12, 3.5);
      p.poly([13, 10, 2, 3, 1, 9, 4, 13, 7, 11, 9, 15], wing); // back wing
      p.poly([15, 10, 26, 2, 27, 9, 24, 13, 21, 11, 19, 15], wing); // front wing
      p.ellipse(14, 11, 12, 10, body);
      if (kind === 'bat') p.poly([9, 7, 10, 1, 13, 6], body).poly([15, 6, 18, 1, 19, 7], body);
      else p.poly([19, 9, 25, 11, 19, 13], 0xf0c850);
      p.ink();
      if (kind === 'bat') {
        p.eye(12, 10, 2).eye(16.5, 10, 2);
        p.fill(0xffffff).fillTriangle(12.5, 13, 13.5, 13, 13, 14.6).fillTriangle(15, 13, 16, 13, 15.5, 14.6);
      } else {
        p.eye(16, 9.5, 1.8);
      }
      p.shine(11, 8, 4, 2.5, 0.3);
    },
  };
}

function wolf(fur: number, belly: number, eyes: number, scale: number, scar = false): ArtDef {
  const s = scale;
  return {
    w: Math.round(38 * s),
    h: Math.round(30 * s),
    draw(p) {
      p.g.save();
      p.g.scaleCanvas(s, s);
      p.shadow(19, 27, 28, 6);
      p.poly([4, 12, 0, 6, 2, 4, 8, 11], fur); // tail
      p.rrect(8, 19, 4, 8, 2, fur)
        .rrect(13, 19, 4, 8, 2, fur)
        .rrect(21, 19, 4, 8, 2, fur)
        .rrect(26, 19, 4, 8, 2, fur);
      p.ellipse(18, 15, 24, 13, fur); // body
      p.circle(29, 11, 7, fur); // head
      p.poly([32, 9, 38, 12, 37, 15, 31, 15], fur); // snout
      p.poly([25, 6, 26, 0, 29, 5], fur).poly([29, 5, 32, 0, 33, 6], fur); // ears
      p.ink();
      p.fill(belly).fillEllipse(18, 18.5, 16, 5);
      p.fill(INK).fillCircle(37.2, 12.3, 1.2);
      if (eyes === 0xffffff) p.eye(30.5, 10, 1.8);
      else p.glow(31, 10.5, 1.2, eyes);
      if (scar) p.line(28, 6, 32.5, 13, 1.2, 0xe86a7a);
      p.shine(22, 11, 8, 3, 0.3);
      p.g.restore();
    },
  };
}

export const ENEMY_ART: Record<string, ArtDef> = {
  // ---- Arredores de Valmor ----
  'enemy.skeleton': skeleton(0xe8e0c8, 0xa8d8ff, 1.3), // the sturdy dead of the graveyard: bigger, cold glowing eyes
  'enemy.spider': {
    w: 30,
    h: 24,
    draw(p) {
      p.shadow(15, 21, 22, 5);
      const leg = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => {
        p.line(x1, y1, x2, y2, 4.5, INK).line(x2, y2, x3, y3, 4.5, INK);
        p.line(x1, y1, x2, y2, 2, 0x6e4a32).line(x2, y2, x3, y3, 2, 0x6e4a32);
      };
      leg(12, 14, 5, 8, 2, 20);
      leg(13, 15, 8, 10, 6, 21);
      leg(18, 15, 23, 10, 25, 21);
      leg(19, 14, 26, 8, 29, 20);
      p.ellipse(12, 13, 15, 12, 0x6e4a32).circle(21, 13, 5.5, 0x8a5e3e);
      p.ink();
      p.fill(0xa87a52).fillEllipse(10, 12, 6, 4);
      // A common enemy: big funny eyes (glowing ones belong to the story enemies), plus a little third one.
      p.eye(19.6, 11.6, 2).eye(23.8, 12, 2).eye(22.6, 15.6, 1.1);
    },
  },
  'enemy.slime': {
    w: 36,
    h: 30,
    draw(p) {
      p.shadow(18, 27, 30, 6);
      p.poly([3, 26, 2, 18, 6, 9, 13, 4, 23, 4, 30, 9, 34, 18, 33, 26, 26, 27.5, 10, 27.5], 0x4ad08a);
      p.ink();
      p.fill(0x3a9a6a).fillEllipse(20, 23, 24, 7);
      p.shine(11, 10, 8, 5, 0.6);
      p.eye(15, 16, 3).eye(23.5, 16, 3);
      p.g
        .lineStyle(1.5, INK, 1)
        .beginPath()
        .arc(19.5, 20, 3.2, 0.2, Math.PI - 0.2)
        .strokePath();
    },
  },

  // ---- Cripta da Igreja Velha ----
  // Grey-lilac bones (the gems keep the blue), eyes a hot red that isn't Andilla's colour (NA-07).
  'enemy.bones': skeleton(0xb8b4cc, 0xff5a6a),
  /** Ossada em Brasa (provisional): darker bones, an orange glow burning in the chest and the eyes (FT-14). */
  'enemy.emberBones': {
    w: 26,
    h: 30,
    draw(p) {
      const sk = skeleton(0x8a7a78, 0xff9a2a);
      sk.draw(p);
      p.glow(13.5, 16, 3.2, 0xff7a2a);
      p.glow(13.5, 16, 1.6, 0xffd060);
    },
  },
  /** A pile of bones: what an Ossada leaves for three seconds, eyes still lit (FT-15). */
  'enemy.bonePile': {
    w: 26,
    h: 16,
    draw(p) {
      p.shadow(13, 13, 20, 4);
      p.rrect(3, 8, 20, 4, 2, 0xb8b4cc).rrect(6, 5, 14, 4, 2, 0xa8a4bc);
      p.rrect(2, 4, 8, 2.5, 1.2, 0xb8b4cc).rrect(16, 3, 8, 2.5, 1.2, 0xb8b4cc);
      p.circle(15, 6, 4.2, 0xc8c4dc); // the skull on top
      p.ink();
      p.glow(14, 6, 0.8, 0xff5a6a).glow(16.5, 6, 0.8, 0xff5a6a);
    },
  },
  'enemy.bat': winged(0x5e6a84, 0x434c62, 'bat'), // grey-blue: Lyra keeps purple
  'enemy.vampireBat': winged(0x7a3a4e, 0x52283a, 'bat'),
  /** Espírito Gélido (provisional): a small pale-blue spirit, a ball of cold in its hands (FT-16). */
  'enemy.coldSpirit': {
    w: 26,
    h: 30,
    draw(p) {
      p.shadow(13, 27, 12, 3.5);
      p.poly(
        [4, 24, 4, 12, 8, 5, 13, 2, 18, 5, 22, 12, 22, 24, 19, 22, 16, 26, 13, 22, 10, 26, 7, 22],
        0xb8d8ee,
      );
      p.inkColor = 0x2a4058;
      p.ink();
      p.inkColor = INK;
      p.fill(0x2a4058).fillEllipse(10.5, 11, 4, 5.5).fillEllipse(16.5, 11, 4, 5.5);
      p.glow(11, 11.5, 1, 0xe8f8ff).glow(16.5, 11.5, 1, 0xe8f8ff);
      p.glow(13, 19, 2.4, 0x9ad8f8); // the orb of cold
      p.shine(9, 6, 4, 2.5, 0.5);
    },
  },
  'enemy.ghost': {
    w: 30,
    h: 34,
    draw(p) {
      p.shadow(15, 31, 14, 4);
      p.poly(
        [4, 27, 4, 13, 8, 5, 15, 2, 22, 5, 26, 13, 26, 27, 22, 24, 19, 28, 15, 24, 11, 28, 8, 24],
        0xe4e0f2,
      );
      p.inkColor = 0x3a3458;
      p.ink();
      p.inkColor = INK;
      p.fill(0xb0a8d8, 0.5).fillEllipse(17, 21, 16, 8);
      p.fill(0x3a3458).fillEllipse(12.5, 12.5, 4.5, 6).fillEllipse(19.5, 12.5, 4.5, 6);
      // Pale gold eyes: serious, and never the gems' cyan glint.
      p.glow(13, 13, 1, 0xfff0b0).glow(20, 13, 1, 0xfff0b0);
      p.fill(0x3a3458).fillEllipse(16, 19.5, 4, 3);
      p.shine(10, 7, 5, 3, 0.6);
    },
  },

  'enemy.rat': rat(0x8a7a6e, 1),
  'enemy.graveRat': rat(0x8a8a94, 0.75), // Rato de Cova: the small grey rats of the graveyard

  // ---- Estrada do Sul ----
  'enemy.hooded': {
    w: 26,
    h: 32,
    draw(p) {
      p.shadow(13, 29, 16, 5);
      p.poly([4, 28, 7, 14, 19, 14, 22, 28], 0x6a4a30); // cloak
      p.poly([6, 15, 7, 6, 13, 2, 19, 6, 20, 15], 0x7a5a3a); // hood
      p.ink();
      p.fill(0x1e140a).fillEllipse(14, 11, 9, 8);
      p.glow(12.5, 11, 0.9, 0xf0d860).glow(16, 11, 0.9, 0xf0d860);
      // The mark on the chest: an eye cut in half.
      p.fill(0xe8e0c8).fillEllipse(13, 20.5, 6, 3.2);
      p.fill(0x7a1a24).fillCircle(13, 20.5, 1.1);
      p.line(10, 23, 16, 18, 1.1, 0x1e140a);
      p.shine(9, 7, 3, 3, 0.2);
    },
  },
  'enemy.crow': winged(0x34343e, 0x26262e, 'crow'),
  'enemy.frostWolf': wolf(0xe8eff8, 0xcbd8ec, 0xffffff, 1),

  /** Javali da Geada (provisional name): low and wide, a frosted mane, pale tusks and small cold eyes (FT-07). */
  'enemy.frostBoar': {
    w: 46,
    h: 34,
    draw(p) {
      p.shadow(22, 31, 34, 6);
      const fur = 0x4e586c;
      p.rrect(9, 22, 5, 9, 2, fur)
        .rrect(15, 23, 5, 8, 2, fur)
        .rrect(26, 23, 5, 8, 2, fur)
        .rrect(32, 22, 5, 9, 2, fur);
      p.ellipse(21, 18, 32, 18, fur); // body
      p.circle(36, 18, 9, fur); // head
      p.poly([40, 15, 46, 18, 45, 23, 39, 23], 0x5c667a); // snout
      p.poly([8, 10, 14, 4, 18, 9, 23, 3, 27, 9, 32, 5, 33, 12, 8, 13], 0xdce8f4); // frosted mane
      p.ink();
      p.poly([41, 21, 44, 15, 43, 22], 0xf4f0e0).poly([37, 22, 39, 16, 40, 23], 0xf4f0e0); // tusks
      p.glow(37, 15, 1.3, 0xa8d8ff);
      p.fill(0xdce8f4, 0.6).fillEllipse(20, 13, 16, 4); // frost on the back
      p.shine(18, 12, 9, 3, 0.25);
    },
  },
  /** The war banner (provisional): a pole with a torn black cloth and a brazier on top, one of the road's lights. */
  'enemy.warBanner': {
    w: 32,
    h: 66,
    draw(p) {
      p.shadow(16, 63, 22, 5);
      p.rrect(14.5, 8, 3, 56, 1.5, 0x5a3a1e); // pole
      p.rrect(9, 58, 14, 5, 2, 0x3a3a40); // foot
      p.poly([17, 14, 31, 16, 29, 24, 31, 31, 26, 34, 28, 42, 17, 40], 0x16161c); // torn cloth
      p.rrect(9, 4, 14, 6, 2, 0x3a3a40); // brazier
      p.ink();
      p.fill(0xff7a2a).fillEllipse(16, 3, 11, 6);
      p.fill(0xffd060).fillEllipse(16, 3, 6, 3.5);
      p.line(20, 22, 27, 21, 1.4, 0x7a1a24).line(20, 30, 26, 31, 1.4, 0x7a1a24); // red marks on the cloth
    },
  },

  /** Ninho de Aranha (provisional): a web bundle on the ground with pale sacs glowing a sick acid yellow-green (FT-09). */
  'enemy.spiderNest': {
    w: 40,
    h: 36,
    draw(p) {
      p.shadow(20, 32, 32, 6);
      p.ellipse(20, 20, 34, 22, 0xb8b4a8); // the bundle of web
      p.circle(12, 17, 7, 0xd8d4c4).circle(26, 14, 8, 0xd8d4c4).circle(22, 24, 7, 0xc8c4b4); // sacs
      p.ink();
      p.line(3, 24, 37, 12, 1, 0x7a766a).line(6, 12, 34, 28, 1, 0x7a766a).line(20, 5, 20, 33, 1, 0x7a766a);
      p.glow(12, 17, 2.4, 0xc8e040).glow(26, 14, 2.8, 0xc8e040).glow(22, 24, 2.2, 0xc8e040);
      p.shine(14, 9, 10, 3, 0.3);
    },
  },

  /** Rato Ladrão (provisional): a thin rat in a kerchief with a sack on its back; the gems glow out of its mouth (FT-10). */
  'enemy.thiefRat': {
    w: 32,
    h: 24,
    draw(p) {
      const fur = 0x7a6a5e;
      p.shadow(16, 21, 20, 5);
      p.line(6, 15, 0, 10, 2.4, INK).line(6, 15, 0, 10, 1.1, 0xe8a0a8); // tail
      p.rrect(10, 16, 3.5, 5, 1.8, fur).rrect(19, 16, 3.5, 5, 1.8, fur); // legs
      p.ellipse(15, 13, 19, 12, fur); // lean body
      p.poly([20, 7, 31, 12, 30.5, 15, 20, 18], fur); // head and snout
      p.circle(21, 5.5, 3.6, fur); // ear
      p.ellipse(9, 8, 12, 11, 0x6a4a2a); // the sack
      p.ink();
      p.fill(0xe8a0a8).fillCircle(21, 5.5, 1.9).fillCircle(31, 12.5, 1.3);
      p.poly([18, 9, 24, 9, 22, 12, 19, 12], 0xb0343c); // kerchief
      p.eye(24, 10.5, 2);
      p.glow(9, 3.5, 1.6, 0x8fe8ff); // the stolen gems, the one cyan thing on it
      p.shine(10, 9, 5, 3, 0.25);
    },
  },

  /** Ovo de Aranha (provisional): a pale sac in a cradle of web, a faint light inside (FT-12). */
  'enemy.spiderEgg': {
    w: 22,
    h: 24,
    draw(p) {
      p.shadow(11, 21, 18, 4);
      p.line(2, 20, 11, 12, 1.2, 0xb8b4a8).line(20, 20, 11, 12, 1.2, 0xb8b4a8); // web
      p.ellipse(11, 12, 15, 17, 0xe8e4d4); // the sac
      p.ink();
      p.fill(0xc8c4b0, 0.7).fillEllipse(11, 16, 11, 6);
      p.glow(10, 10, 1.6, 0xc8e040);
      p.shine(8, 6, 5, 3, 0.5);
    },
  },

  /**
   * Mãe-Aranha (provisional): huge, dark, a pale mark on the abdomen, eight eyes that glow, light from below (FT-12).
   */
  'enemy.spiderMother': {
    w: 84,
    h: 70,
    draw(p) {
      p.shadow(42, 62, 70, 10);
      const leg = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => {
        p.line(x1, y1, x2, y2, 7, INK).line(x2, y2, x3, y3, 7, INK);
        p.line(x1, y1, x2, y2, 4, 0x3a2a30).line(x2, y2, x3, y3, 4, 0x3a2a30);
      };
      leg(34, 36, 18, 14, 4, 52);
      leg(36, 40, 12, 32, 6, 60);
      leg(40, 44, 20, 50, 14, 66);
      leg(46, 46, 36, 56, 30, 68);
      leg(52, 36, 66, 12, 80, 50);
      leg(50, 40, 74, 30, 78, 60);
      leg(46, 44, 64, 50, 70, 66);
      p.ellipse(32, 36, 42, 32, 0x2a1e26); // abdomen
      p.ellipse(54, 38, 24, 22, 0x3a2a34); // head
      p.ink();
      // The pale mark that lights before each ability.
      p.poly([32, 24, 38, 36, 32, 50, 26, 36], 0xd8d0c0);
      p.fill(0x7a1a24).fillCircle(32, 36, 3);
      for (let i = 0; i < 4; i++) {
        p.glow(58 + (i % 2) * 5, 30 + i * 3.5, 1.4, 0xff4a3a);
        p.glow(52 + (i % 2) * 5, 31 + i * 3.5, 1.1, 0xff4a3a);
      }
      p.fill(0xe8e4d4).fillTriangle(62, 46, 64, 46, 63, 53).fillTriangle(55, 47, 57, 47, 56, 54);
      p.shine(24, 22, 14, 5, 0.25);
    },
  },

  /**
   * Bruxa do Caldeirão (provisional): a stout hunched old woman in a dark shawl, long nose and hands lit from below
   * by the iron cauldron's sick acid glow (FT-11).
   */
  /** Coveiro (provisional): a hunched man in a long dark coat and a brim hat, a shovel over the shoulder (FT-16). */
  'enemy.gravedigger': {
    w: 40,
    h: 46,
    draw(p) {
      p.shadow(20, 42, 28, 6);
      p.rrect(26, 8, 3, 32, 1.5, 0x6a4a2a); // shovel handle
      p.poly([23, 4, 33, 4, 31, 12, 25, 12], 0x8a8a94); // blade
      p.poly([10, 18, 28, 18, 31, 41, 7, 41], 0x3a3438); // long coat
      p.rrect(11, 38, 7, 5, 2, 0x2a2428).rrect(21, 38, 7, 5, 2, 0x2a2428); // boots
      p.circle(19, 13, 6.5, 0xb89a80); // head
      p.rrect(8, 8, 22, 3.5, 1.5, 0x2a2428).rrect(12, 3, 14, 7, 3, 0x2a2428); // hat
      p.ink();
      p.fill(0x4a4448).fillRect(17, 22, 3, 18);
      p.eye(16.5, 14, 1.6).eye(21.5, 14, 1.6);
      p.shine(14, 6, 6, 2, 0.3);
    },
  },
  'enemy.witch': {
    w: 46,
    h: 46,
    draw(p) {
      p.shadow(23, 42, 38, 7);
      p.ellipse(14, 31, 16, 14, 0x2a2a30); // cauldron
      p.rrect(7, 22, 14, 4, 2, 0x44444c); // rim
      p.ellipse(14, 24, 11, 4, 0xa8d030); // brew
      p.poly([20, 40, 18, 22, 28, 12, 40, 24, 42, 40], 0x3a2a4a); // shawl
      p.circle(32, 14, 8, 0xc8b898); // head
      p.poly([36, 14, 45, 17, 37, 19], 0xc8b898); // long nose
      p.poly([24, 9, 30, 1, 38, 6, 40, 10, 28, 12], 0x2a1e38); // hood
      p.rrect(22, 24, 8, 5, 2.5, 0xc8b898); // hand stirring
      p.ink();
      p.glow(34, 12.5, 1.1, 0xc8e040);
      p.fill(0x1e1424).fillRect(33, 17.5, 5, 1.2);
      p.line(14, 24, 24, 26, 2, 0x6a4a2a); // spoon
      p.glow(14, 24, 2.6, 0xc8e040);
      p.shine(30, 10, 5, 3, 0.25);
    },
  },

  // ---- Elites ----
  /** Goblin Lanceiro: since FT-03 a common thrower (no elite ring); the long spear says it throws. */
  'enemy.goblin': {
    w: 42,
    h: 42,
    draw(p) {
      p.shadow(19, 38.5, 26, 6);
      p.poly([30, 2, 33, 1, 33, 38, 31, 38], 0x9a6232); // spear shaft
      p.poly([29, 4, 31.5, -1, 34, 4, 31.5, 8], 0xcbd8ec); // spear tip
      p.rrect(11, 28, 6, 10, 3, 0x3a9a6a).rrect(20, 28, 6, 10, 3, 0x3a9a6a);
      p.rrect(8, 18, 21, 14, 6, 0x6a3a1a); // leather
      p.circle(18, 13, 11, 0x6aa040);
      p.poly([6, 10, -1, 5, 8, 15], 0x6aa040).poly([28, 9, 37, 4, 29, 15], 0x6aa040); // ears
      p.rrect(26, 20, 7, 5, 2.5, 0x6aa040); // hand on the spear
      p.ink();
      p.glow(15.5, 12, 1.4, 0xffe040).glow(22, 12, 1.4, 0xffe040);
      p.fill(INK).fillRect(14, 17.5, 10, 1.6);
      p.fill(0xffffff)
        .fillTriangle(15, 17.5, 16.6, 17.5, 15.8, 19.6)
        .fillTriangle(21, 17.5, 22.6, 17.5, 21.8, 19.6);
      p.shine(13, 7, 6, 3, 0.35);
      p.fill(0xf0d860).fillCircle(18.5, 24, 2);
    },
  },
  'enemy.golem': {
    w: 56,
    h: 56,
    draw(p) {
      p.outline = 2.5;
      p.eliteRing(28, 51.5, 48, 10);
      p.rrect(14, 38, 11, 14, 3, 0x7a7266).rrect(31, 38, 11, 14, 3, 0x7a7266);
      p.rrect(1, 18, 12, 24, 4, 0x8a8276).rrect(43, 18, 12, 24, 4, 0x8a8276); // arms
      p.rrect(10, 14, 36, 28, 6, 0x9a9286); // torso
      p.rrect(18, 3, 20, 15, 5, 0x9a9286); // head
      p.ink();
      p.outline = 2;
      const crack = 0x55504a;
      p.line(16, 20, 22, 28, 1.4, crack).line(22, 28, 20, 35, 1.4, crack).line(38, 18, 34, 26, 1.4, crack);
      p.fill(0x3a9a6a).fillEllipse(15, 15, 9, 4).fillEllipse(44, 19, 7, 3).fillEllipse(24, 4, 8, 3);
      p.glow(24, 10, 2, 0xffa020).glow(32, 10, 2, 0xffa020);
      p.glow(28, 28, 3, 0xffa020);
      p.shine(19, 19, 10, 4, 0.2);
    },
  },

  // ---- Bosses ----
  'enemy.blackKnight': {
    w: 80,
    h: 86,
    draw(p) {
      p.outline = 3;
      p.shadow(40, 81, 56, 12);
      p.poly([18, 30, 62, 30, 70, 78, 10, 78], 0x8a2430); // cape
      p.poly([60, 10, 64, 8, 68, 66, 63, 67], 0xcbd8ec); // greatsword blade
      p.rrect(55, 44, 18, 5, 2, 0x55555e); // guard
      p.rrect(26, 58, 11, 20, 4, 0x34343f).rrect(43, 58, 11, 20, 4, 0x34343f); // legs
      p.rrect(20, 30, 40, 32, 9, 0x44465a); // breastplate
      p.circle(20, 34, 8, 0x55586c).circle(60, 34, 8, 0x55586c); // pauldrons
      p.rrect(27, 6, 26, 26, 9, 0x44465a); // helm
      p.poly([40, 6, 44, -2, 47, 7], 0xa8323e); // plume
      p.ink();
      p.outline = 2;
      p.fill(0x141418).fillRect(30, 17, 20, 4);
      p.glow(35, 19, 1.8, 0xff2020).glow(45, 19, 1.8, 0xff2020);
      p.fill(0x80809a, 0.7).fillEllipse(32, 38, 12, 5).fillEllipse(33, 12, 8, 4);
      p.line(40, 32, 40, 58, 1.5, 0x141418);
      p.fill(0xa8323e, 0.6).fillCircle(40, 45, 4);
      // Boss lighting: moonlight on the top edges and a warm glow from below, so he never melts into the night.
      p.fill(0xcbd8ec, 0.55).fillEllipse(40, 8.5, 20, 3).fillEllipse(19, 28, 9, 3).fillEllipse(61, 28, 9, 3);
      p.fill(0xff9a5a, 0.35).fillEllipse(40, 60, 34, 6).fillEllipse(31, 76, 10, 3).fillEllipse(49, 76, 10, 3);
      p.fill(0xff9a5a, 0.25).fillEllipse(40, 77, 56, 5);
    },
  },
  'enemy.bellRinger': {
    w: 74,
    h: 80,
    draw(p) {
      p.outline = 3;
      p.shadow(37, 75, 54, 11);
      p.poly([12, 74, 18, 34, 36, 22, 54, 34, 62, 74], 0x4a3a2a); // robe
      p.poly([22, 34, 24, 14, 36, 6, 48, 14, 50, 34], 0x5a4632); // hood
      p.poly([46, 40, 60, 30, 70, 44, 72, 60, 50, 60, 48, 46], 0xc89c38); // the bronze bell
      p.rrect(56, 24, 6, 9, 2, 0x8a5418); // bell handle
      p.ink();
      p.outline = 2;
      // Light from below on the bell and the face (boss lighting).
      p.fill(0xf0d860, 0.8).fillEllipse(60, 56, 18, 6);
      p.fill(0x8a5418).fillRect(49, 58, 23, 2.5);
      p.fill(0xe8e0c8).fillEllipse(36, 24, 13, 15);
      p.fill(INK).fillEllipse(32.5, 22, 4, 5).fillEllipse(39.5, 22, 4, 5).fillRect(32, 29, 8, 1.5);
      p.glow(33, 22.5, 1.3, 0xf0d860).glow(40, 22.5, 1.3, 0xf0d860);
      p.fill(0xf0d860, 0.18).fillEllipse(37, 40, 34, 22);
      p.line(36, 40, 36, 72, 1.5, 0x2a1e14);
    },
  },
  /** Lobo Velho: the old pack leader, hunched, shaggy mane, white muzzle, a scar over one eye. */
  'enemy.oldWolf': {
    w: 78,
    h: 62,
    draw(p) {
      p.outline = 3;
      p.shadow(38, 58, 60, 10);
      p.poly([10, 26, 0, 14, 3, 10, 9, 15, 16, 22], 0x6e6e7a); // bushy tail
      p.rrect(16, 38, 8, 18, 4, 0x6e6e7a)
        .rrect(26, 40, 8, 16, 4, 0x6e6e7a)
        .rrect(44, 40, 8, 16, 4, 0x7a7a86)
        .rrect(54, 38, 8, 18, 4, 0x7a7a86); // legs
      p.ellipse(36, 32, 50, 26, 0x7a7a86); // body
      // Shaggy mane over the shoulders.
      p.poly([44, 14, 48, 8, 52, 14, 56, 9, 58, 16, 62, 13, 62, 26, 46, 34, 40, 24], 0x5e5e6a);
      p.circle(60, 22, 12, 0x8a8a96); // head
      p.poly([64, 18, 78, 24, 76, 30, 63, 30], 0x8a8a96); // snout
      p.poly([52, 12, 53, 1, 59, 10], 0x7a7a86).poly([59, 10, 64, 2, 66, 12], 0x7a7a86); // ears
      p.ink();
      p.outline = 2;
      p.fill(0xe8e0d0).fillEllipse(70, 27, 14, 6); // white old muzzle
      p.fill(0xa2a2ac).fillEllipse(36, 38, 34, 8); // belly
      p.fill(INK).fillCircle(77, 24.5, 2);
      p.fill(0xffffff).fillTriangle(66, 30, 68, 30, 67, 33.5).fillTriangle(71, 30, 73, 30, 72, 33); // fangs
      p.fill(0x4a4a56).fillTriangle(61, 2.5, 63, 4, 62, 7); // torn ear notch
      p.glow(64, 19.5, 1.8, 0xff6040); // the good eye
      p.line(57, 15, 61, 22, 1.5, INK); // the closed eye under the scar
      p.line(55, 12, 63, 25, 2, 0xe86a7a); // the scar
      p.shine(30, 24, 18, 5, 0.25);
      // Boss lighting: a warm glow from below.
      p.fill(0xff9a5a, 0.3).fillEllipse(36, 45, 40, 6);
    },
  },
};
