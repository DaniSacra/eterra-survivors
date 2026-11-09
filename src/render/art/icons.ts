import { INK, type Pen } from './pen';
import type { ArtDef } from './types';

/**
 * Upgrade icons for the level-up cards: a round badge (weapons gold-rimmed, Elos with a glowing rim,
 * passives in their own color) with a simple symbol. 28 x 28 world px.
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

const WEAPON_BG = 0x2a3048;
const ELO_BG = 0x3a2a48;
const RIM = 0xd8a040;
const ELO_RIM = 0xffd870;
const weapon = (sym: (p: Pen) => void) => badge(WEAPON_BG, RIM, sym);
const elo = (sym: (p: Pen) => void) => badge(ELO_BG, ELO_RIM, sym, 0xffd870);
const passive = (bg: number, sym: (p: Pen) => void) => badge(bg, 0xe8e2d0, sym);

// ---- Symbols ----

const sword =
  (steel: number, hilt: number) =>
  (p: Pen): void => {
    p.outline = 1.2;
    p.poly([19, 6, 21, 8, 11, 18, 9, 16], steel);
    p.rrect(7, 15, 7, 2.5, 1, hilt);
    p.rrect(6, 18, 3, 3, 1, hilt);
    p.ink();
  };
const twoSwords =
  (steel: number) =>
  (p: Pen): void => {
    p.outline = 1.2;
    p.poly([8, 6, 10, 6, 15, 18, 13, 19], steel).poly([18, 6, 20, 6, 15, 19, 13, 18], steel);
    p.ink();
    p.g.lineStyle(1.5, 0xffffff, 0.6).strokeCircle(C, C, 8);
  };
const orb =
  (core: number, halo: number, n = 1) =>
  (p: Pen): void => {
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? C : C - 4 + (i * 8) / (n - 1);
      const y = n === 1 ? C : C + (i % 2 ? -3 : 3);
      p.fill(halo, 0.5).fillCircle(x, y, n === 1 ? 6 : 4.5);
      p.fill(core).fillCircle(x, y, n === 1 ? 3.5 : 2.6);
    }
  };
const ring =
  (c: number, flames = false) =>
  (p: Pen): void => {
    p.g.lineStyle(3, c, 1).strokeCircle(C, C, 6.5);
    p.fill(c, 0.35).fillCircle(C, C, 6.5);
    if (flames)
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4;
        p.fill(k % 2 ? 0xffd870 : 0xff6a3a).fillCircle(C + Math.cos(a) * 8.5, C + Math.sin(a) * 8.5, 1.8);
      }
  };
const knife =
  (steel: number, n: number) =>
  (p: Pen): void => {
    p.outline = 1;
    for (let i = 0; i < n; i++) {
      const a = (i - (n - 1) / 2) * (n > 3 ? 0.62 : 0.45) - 0.6;
      const ux = Math.cos(a);
      const uy = Math.sin(a);
      const bx = C - ux * 7;
      const by = C - uy * 7 + 3;
      const hw = 2.2;
      p.poly([bx - uy * hw, by + ux * hw, bx + ux * 15, by + uy * 15, bx + uy * hw, by - ux * hw], steel);
    }
    p.ink();
  };
const flake =
  (c: number, big = false) =>
  (p: Pen): void => {
    const r = big ? 9 : 7;
    for (let k = 0; k < 3; k++) {
      const a = (k * Math.PI) / 3;
      const dx = Math.cos(a) * r;
      const dy = Math.sin(a) * r;
      p.line(C - dx, C - dy, C + dx, C + dy, 3.5, INK).line(C - dx, C - dy, C + dx, C + dy, 1.8, c);
    }
    p.fill(0xffffff).fillCircle(C, C, 1.8);
  };
const bolt =
  (c: number, n = 1) =>
  (p: Pen): void => {
    for (let i = 0; i < n; i++) {
      const o = n === 1 ? 0 : (i - 0.5) * 7;
      p.outline = 1.2;
      p.poly(
        [C + 2 + o, 5, C - 4 + o, C + 1, C + o, C + 1, C - 2 + o, 23, C + 5 + o, C - 2, C + 1 + o, C - 2],
        c,
      );
      p.ink();
    }
  };
const hammer =
  (head: number) =>
  (p: Pen): void => {
    p.outline = 1.2;
    p.poly([8, 20, 10, 22, 18, 14, 16, 12], 0x9a6232);
    p.rrect(13, 5, 11, 8, 2, head);
    p.ink();
  };
const mace =
  (head: number, spikes: number) =>
  (p: Pen): void => {
    p.outline = 1.2;
    p.poly([7, 21, 9, 23, 17, 15, 15, 13], 0x9a6232);
    p.circle(18, 10, 5.5, head);
    p.ink();
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2 + 0.4;
      p.fill(spikes).fillCircle(18 + Math.cos(a) * 6, 10 + Math.sin(a) * 6, 1.6);
    }
  };
const flame =
  (outer: number, inner: number, sword = false) =>
  (p: Pen): void => {
    if (sword) p.line(C, 4, C, 20, 4.5, INK).line(C, 4, C, 20, 2.2, 0xe8eff8);
    p.outline = 1.2;
    p.poly([C, 6, C + 6, C + 2, C + 6, C + 7, C, 23, C - 6, C + 7, C - 6, C + 2], outer);
    p.ink();
    p.fill(inner).fillEllipse(C, C + 5, 6, 8);
  };
const wisp =
  (c: number, n: number) =>
  (p: Pen): void => {
    for (let i = 0; i < n; i++) {
      const x = C - 5 + (i * 10) / Math.max(1, n - 1);
      const y = C + (i % 2 ? -4 : 3);
      p.fill(c, 0.5).fillEllipse(x - 2, y, 9, 6);
      p.fill(0xffffff).fillCircle(x, y, 2.2);
    }
  };
const bell =
  (c: number, rings = false) =>
  (p: Pen): void => {
    p.outline = 1.2;
    p.poly([8, 19, 9.5, 10, C, 6, 18.5, 10, 20, 19], c);
    p.ink();
    p.fill(INK).fillCircle(C, 20.5, 1.6);
    if (rings) p.g.lineStyle(1.5, 0xffd870, 0.9).strokeCircle(C, 13, 11);
  };

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
  // Weapons
  'icon.blade': weapon(sword(0xe8eff8, 0x9a6232)),
  'icon.elunLight': weapon(orb(0xfff6c0, 0xf0d860)),
  'icon.yahAura': weapon(ring(0xffc040)),
  'icon.daggers': weapon(knife(0xe8eff8, 2)),
  'icon.paladinSwords': weapon(twoSwords(0xcbd8ec)),
  'icon.frost': weapon(flake(0x9ad8ff)),
  'icon.lightning': weapon(bolt(0xfff6a0)),
  'icon.hammer': weapon(hammer(0x8a8a96)),
  'icon.wisps': weapon(wisp(0x40e0d8, 2)),
  'icon.bells': weapon(bell(0xc89040)),
  'icon.mace': weapon(mace(0x8a8a96, 0xcbd8ec)),
  'icon.fire': weapon(flame(0xff8a3a, 0xffd060)),
  // Elos
  'icon.fury': elo(sword(0xffe8a0, 0xa8323e)),
  'icon.holyLight': elo(orb(0xffffff, 0xfff6c0, 3)),
  'icon.yahFlame': elo(ring(0xff6a3a, true)),
  'icon.fan': elo(knife(0xffd8e0, 5)),
  'icon.vigil': elo(twoSwords(0xffe8a0)),
  'icon.blizzard': elo(flake(0xe8f6ff, true)),
  'icon.storm': elo(bolt(0xd8b8ff, 2)),
  'icon.forgeFury': elo(hammer(0xffa040)),
  'icon.soulProcession': elo(wisp(0x8ac0f0, 3)),
  'icon.funeralToll': elo(bell(0xe8b860, true)),
  'icon.jointBreaker': elo(mace(0xc86a3a, 0xffe8a0)),
  'icon.fireSword': elo(flame(0xff5a2a, 0xffe080, true)),
  // Passives
  'icon.vigor': passive(0x8a2a3a, (p) => {
    p.outline = 1.2;
    p.circle(C - 3.5, C - 2, 4.5, 0xe84a5a).circle(C + 3.5, C - 2, 4.5, 0xe84a5a);
    p.poly([C - 8, C, C + 8, C, C, C + 8], 0xe84a5a);
    p.ink();
  }),
  'icon.swiftness': passive(0x2a5a7a, (p) => {
    p.outline = 1.2;
    p.poly([6, 18, 20, 6, 22, 9, 10, 20], 0xe8eff8);
    p.ink();
    p.line(4, 12, 10, 12, 1.5, 0xe8eff8).line(6, 16, 11, 16, 1.5, 0xe8eff8);
  }),
  'icon.might': passive(0x7a3a2a, (p) => {
    p.outline = 1.2;
    p.poly([C, 5, C + 7, 13, C + 3, 13, C + 3, 22, C - 3, 22, C - 3, 13, C - 7, 13], 0xff8a4a);
    p.ink();
  }),
  'icon.haste': passive(0x4a3a6a, (p) => {
    p.outline = 1.2;
    p.poly([8, 6, 20, 6, 15, C, 20, 22, 8, 22, 13, C], 0xe8e0c8);
    p.ink();
    p.fill(0xf0d860).fillTriangle(10, 21, 18, 21, C, 16).fillTriangle(10.5, 7.5, 17.5, 7.5, C, 11);
  }),
  'icon.reach': passive(0x2a5a4a, (p) => {
    p.g.lineStyle(2, 0x9be35a, 1).strokeCircle(C, C, 3).strokeCircle(C, C, 6.5).strokeCircle(C, C, 9.5);
  }),
  'icon.attraction': passive(0x2a3a6a, (p) => {
    p.outline = 1.2;
    p.poly([7, 7, 11, 7, 11, 14, C, 17, 17, 14, 17, 7, 21, 7, 21, 15, C, 21, 7, 15], 0xd84a4a);
    p.rrect(7, 5, 4, 3.5, 1, 0xd8e0ec).rrect(17, 5, 4, 3.5, 1, 0xd8e0ec);
    p.ink();
  }),
  'icon.recovery': passive(0x2a6a3a, (p) => {
    p.outline = 1.2;
    p.rrect(C - 2.5, 6, 5, 16, 1.5, 0x9be35a).rrect(6, C - 2.5, 16, 5, 1.5, 0x9be35a);
    p.ink();
  }),
  'icon.armor': passive(0x3a4a5a, (p) => {
    p.outline = 1.2;
    p.poly([7, 7, C, 4, 21, 7, 20, 15, C, 23, 8, 15], 0xa8b8c8);
    p.ink();
    p.fill(0xffffff, 0.4).fillTriangle(9, 8, C, 6, C, 18);
  }),
  'icon.amount': passive(0x5a3a5a, (p) => {
    knife(0xe8eff8, 3)(p);
    p.fill(0xffd870).fillRect(18, 5, 6, 2).fillRect(20, 3, 2, 6);
  }),
  'icon.growth': passive(0x5a5a2a, (p) => {
    p.outline = 1.2;
    const pts: number[] = [];
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const r = k % 2 ? 4 : 9;
      pts.push(C + Math.cos(a) * r, C + 1 + Math.sin(a) * r);
    }
    p.poly(pts, 0xffd870);
    p.ink();
  }),
};
