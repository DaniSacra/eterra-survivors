import { INK, shade } from './pen';
import type { ArtDef } from './types';

/**
 * Enemies facing right. Threat ladder: common ones are funny (big eyes), story ones are serious (glowing eyes),
 * bosses are big and menacing (light from below).
 */

function skeleton(bone: number, eyes: number, w = 26, h = 30): ArtDef {
  return {
    w,
    h,
    draw(p) {
      const d = shade(bone, 0.62);
      p.shadow(13, 27, 16, 5);
      p.rrect(9, 20, 3, 7, 1.5, bone).rrect(14.5, 20, 3, 7, 1.5, bone); // legs
      p.rrect(7.5, 12, 12, 9, 3, bone); // ribcage
      p.rrect(2, 13, 5, 3, 1.5, bone).rrect(19, 13, 5, 3, 1.5, bone); // arms
      p.circle(14, 8, 7, bone); // skull
      p.rrect(10, 11, 9, 4, 2, bone); // jaw
      p.ink();
      p.fill(d).fillRect(9.5, 14, 8, 1.2).fillRect(9.5, 16.5, 8, 1.2).fillRect(13, 12.5, 1.4, 7);
      p.fill(INK).fillEllipse(12.2, 8, 3.6, 4).fillEllipse(17.4, 8, 3.6, 4).fillRect(12, 12.6, 6, 1);
      p.glow(12.6, 8.2, 0.9, eyes).glow(17.8, 8.2, 0.9, eyes);
      p.shine(11, 5, 4, 2.5, 0.35);
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
  'enemy.skeleton': skeleton(0xe8e0c8, 0x8ac0f0),
  'enemy.spider': {
    w: 30,
    h: 24,
    draw(p) {
      p.shadow(15, 21, 22, 5);
      const leg = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => {
        p.line(x1, y1, x2, y2, 4.5, INK).line(x2, y2, x3, y3, 4.5, INK);
        p.line(x1, y1, x2, y2, 2, 0x72308e).line(x2, y2, x3, y3, 2, 0x72308e);
      };
      leg(12, 14, 5, 8, 2, 20);
      leg(13, 15, 8, 10, 6, 21);
      leg(18, 15, 23, 10, 25, 21);
      leg(19, 14, 26, 8, 29, 20);
      p.ellipse(12, 13, 15, 12, 0x72308e).circle(21, 13, 5.5, 0x8a4ab8);
      p.ink();
      p.fill(0xa84ad8).fillEllipse(10, 12, 6, 4);
      p.glow(22, 11.5, 1, 0xe86a7a).glow(24.5, 12.5, 0.9, 0xe86a7a).glow(20.5, 14, 0.7, 0xe86a7a);
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
  'enemy.bones': skeleton(0xa4b8da, 0xe86a7a),
  'enemy.bat': winged(0x7a5a9a, 0x55406e, 'bat'),
  'enemy.ghost': {
    w: 30,
    h: 34,
    draw(p) {
      p.shadow(15, 31, 14, 4);
      p.poly(
        [4, 27, 4, 13, 8, 5, 15, 2, 22, 5, 26, 13, 26, 27, 22, 24, 19, 28, 15, 24, 11, 28, 8, 24],
        0xcbe4f4,
      );
      p.inkColor = 0x2a4a6a;
      p.ink();
      p.inkColor = INK;
      p.fill(0x8ac0f0, 0.5).fillEllipse(17, 21, 16, 8);
      p.fill(0x2a4a6a).fillEllipse(12.5, 12.5, 4.5, 6).fillEllipse(19.5, 12.5, 4.5, 6);
      p.glow(13, 13, 1, 0x80ffff).glow(20, 13, 1, 0x80ffff);
      p.fill(0x2a4a6a).fillEllipse(16, 19.5, 4, 3);
      p.shine(10, 7, 5, 3, 0.6);
    },
  },

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

  // ---- Elites ----
  'enemy.goblin': {
    w: 42,
    h: 42,
    draw(p) {
      p.shadow(19, 39, 26, 7);
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
      p.shadow(28, 52, 42, 9);
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
      p.poly([18, 30, 62, 30, 70, 78, 10, 78], 0x7a1a24); // cape
      p.poly([60, 10, 64, 8, 68, 66, 63, 67], 0xcbd8ec); // greatsword blade
      p.rrect(55, 44, 18, 5, 2, 0x55555e); // guard
      p.rrect(26, 58, 11, 20, 4, 0x2a2a36).rrect(43, 58, 11, 20, 4, 0x2a2a36); // legs
      p.rrect(20, 30, 40, 32, 9, 0x3a3a4a); // breastplate
      p.circle(20, 34, 8, 0x4a4a5a).circle(60, 34, 8, 0x4a4a5a); // pauldrons
      p.rrect(27, 6, 26, 26, 9, 0x3a3a4a); // helm
      p.poly([40, 6, 44, -2, 47, 7], 0xa8323e); // plume
      p.ink();
      p.outline = 2;
      p.fill(0x141418).fillRect(30, 17, 20, 4);
      p.glow(35, 19, 1.8, 0xff2020).glow(45, 19, 1.8, 0xff2020);
      p.fill(0x80809a, 0.7).fillEllipse(32, 38, 12, 5).fillEllipse(33, 12, 8, 4);
      p.line(40, 32, 40, 58, 1.5, 0x141418);
      p.fill(0xa8323e, 0.6).fillCircle(40, 45, 4);
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
  'enemy.oldWolf': wolf(0x8a8a96, 0xa2a2ac, 0xff4050, 2, true),
};
