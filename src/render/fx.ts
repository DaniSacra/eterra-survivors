import type Phaser from 'phaser';
import type { World } from '../core/world';
import { WEAPONS, type AuraLevel, type OrbitLevel, type WeaponDef, type WeaponId } from '../data/weapons';
import { bladeRadius, isElo, orbitAngle, weaponStats } from '../core/weapons';
import { wardReady } from '../core/elos';
import { config } from '../data/config';
import { BossAct, CLEAVE_SHOW, bossAbility } from '../core/bosses';
import { CHARGE } from '../core/behaviours';
import type { Enemy } from '../core/enemies';
import type { Bolt, Slash } from '../core/effects';
import type { Projectile } from '../core/projectiles';
import type { Zone } from '../core/zones';
import { INK } from './art/pen';
import { ELEMENT_COLOR, SUMMON_COLOR, SUMMON_EDGE, SUMMON_SHADE, UI } from './ui';
import { ENEMIES, type EnemyDef, type EnemyId } from '../data/enemies';
import type { EnemyShot } from '../core/enemyShots';
import { fxSprites } from './fxSprites';
import { VFX, vfxKey } from './vfx';
import { AREA_HIT, HIT_SPARK, star } from './sparks';
import { arcLine, band, disc, oval, ovalRing, ring } from './shapes';
import type { CharacterId } from '../data/characters';

/** Identity color of each hero, for the light under their feet (so the eye finds them in a crowd). */
export const HERO_COLOR: Record<CharacterId, number> = {
  aldo: 0xe8b840,
  lyra: 0xa84ad8,
  teo: 0x4ad08a,
  andilla: 0xe86a7a,
};
/**
 * How each swing looks: blade color, edge color, the inner radius of its crescent (a fraction of the reach: the
 * middle stays clear so enemies near the hero show), and its ground mark after the hit.
 */
interface SwingStyle {
  fill: number;
  edge: number;
  band: number;
  fillAlpha: number;
  mark: 'none' | 'shock' | 'crack';
  /** Drawn as this pixel sprite (render/vfx.ts) instead of code: the crescent cut, or Fúria's full spin. */
  sprite?: 'slash' | 'furySpin';
}
const SWING_PLAIN: SwingStyle = { fill: 0xe8f0ff, edge: 0x9ad8ff, band: 0.5, fillAlpha: 0.4, mark: 'none' };
const SWING_STYLE: Partial<Record<WeaponId, SwingStyle>> = {
  blade: { fill: 0xf0f4ff, edge: HERO_COLOR.aldo, band: 0.5, fillAlpha: 0.4, mark: 'none', sprite: 'slash' },
  fury: {
    fill: 0xffe4dc,
    edge: ELEMENT_COLOR.fury,
    band: 0.62,
    fillAlpha: 0.45,
    mark: 'none',
    sprite: 'furySpin',
  },
};
/** The Black Knight's Corte Brutal landing: a white blade with a coral edge. */
const CLEAVE_STYLE: SwingStyle = {
  fill: 0xffffff,
  edge: UI.dangerHex,
  band: 0.35,
  fillAlpha: 0.4,
  mark: 'shock',
};
/** Fraction of a swing's life spent sweeping; the rest the trail catches up and fades. */
const SWEEP = 0.55;
/** Elos get warmer, brighter versions of their base colors. */
const AURA_COLOR = 0xffc040;
const FLAME_COLOR = ELEMENT_COLOR.holy;
/** The ring of the bolt sprite, in art px: the sprite is scaled so the ring is the hit radius. */
const BOLT_RING = 40;
/** The same for the fire burst sprite. */
const BLAST_RING = 44;
/** Frost patch radius that one crystal sprite (about 66 art px wide) suits. */
const ICE_SPAN = 80;
/** Burning patch radius that a flame at its own size suits. */
const EMBER_SPAN = 70;
/** The aura ring sprite's outer ring, art px from the centre. */
const AURA_RING = 57;
/** The shock wave sprite's outer ring, art px from the centre. */
const SHOCK_RING = 50;
/** The pulse sprite's outer ring, art px from the centre. */
const PULSE_RING = 90;
/** The slash sprite's edge, art px from the centre. */
const SLASH_REACH = 92;
/** Espada de Fogo's burning ground: the flames' light orange. */
const EMBER = 0xffb040;
/** How each orbit weapon's pieces look: cartoon swords pointing the way they spin, or round shields. */
interface OrbitStyle {
  color: number;
  dark: number;
  blade: boolean;
}
const ORBIT_STYLE: Partial<Record<WeaponId, OrbitStyle>> = {
  vigil: { color: 0xfff6e0, dark: ELEMENT_COLOR.holy, blade: true },
};
const SWORDS: OrbitStyle = { color: 0xcbd8ec, dark: 0x9a6232, blade: true };
/** Frost patches in the ice family (white-lilac), never the gems' cyan; Nevasca keeps a strong blue edge. */
const FROST_COLOR = 0xd8d2f0;
const BLIZZARD_COLOR = ELEMENT_COLOR.ice;
const BLIZZARD_EDGE = 0x4a8ad8;
/** How long a frost patch takes to land (ring opening, shards flying), and to break up at the end, seconds. */
const ZONE_LAND = 0.15;
const ZONE_BREAK = 0.4;
/**
 * How each strike weapon falls from the sky. Lightning (default, Lyra's): bolt color and its outline width, and
 * `branches` for Tempestade. Fire: a fireball, or a burning sword (`sword`) that plants itself.
 */
interface BoltStyle {
  color: number;
  core: number;
  width: number;
  fire: boolean;
  sword: boolean;
  branches: number;
  /** Not from the sky: an orb bursting where it struck (Cajado de Lyra). */
  burst?: boolean;
  /** The burst throws ice shards out to its edge (Nevasca's shatter). */
  shards?: boolean;
}
const BOLT_PLAIN: BoltStyle = {
  color: 0xc890ff,
  core: 0xffffff,
  width: 5,
  fire: false,
  sword: false,
  branches: 0,
};
const BOLT_STYLE: Partial<Record<WeaponId, BoltStyle>> = {
  storm: { color: ELEMENT_COLOR.storm, core: 0xffffff, width: 7, fire: false, sword: false, branches: 2 },
  fire: { color: 0xffa83a, core: 0xffe070, width: 5, fire: true, sword: false, branches: 0 },
  fireSword: { color: ELEMENT_COLOR.fire, core: 0xfff0a0, width: 7, fire: true, sword: true, branches: 0 },
  staff: { color: 0xb070f0, core: 0xf4e8ff, width: 3, fire: false, sword: false, branches: 0, burst: true },
  /** Nevasca's shatter: an enemy bursting into ice. */
  blizzard: {
    color: ELEMENT_COLOR.ice,
    core: 0xffffff,
    width: 3,
    fire: false,
    sword: false,
    branches: 0,
    burst: true,
    shards: true,
  },
  lyraStar: {
    color: ELEMENT_COLOR.arcane,
    core: 0xfff6c0,
    width: 4,
    fire: false,
    sword: false,
    branches: 0,
    burst: true,
  },
};
/** Mace blows: the dust, the dent where the head lands, pebbles, and the Elo's glow. */
const DUST_LIGHT = 0xe8dcc8;
const DENT = 0x3a2a24;
const SLAM_GLOW: Partial<Record<WeaponId, number>> = { jointBreaker: ELEMENT_COLOR.earth };
/** The burning sword of Espada de Fogo, drawn with the orbit swords' shape. */
const FIRE_SWORD: OrbitStyle = { color: 0xffd890, dark: 0xff6a20, blade: true };
/** Part of a strike's life spent falling, before the burst on the ground (short: it lands with the damage, NF-09). */
const FALL = 0.12;
const PUFF_COLOR = 0xf4f6fb;
const PUFF_SHADE = 0xb8c0d8;
/** Death puffs this big are bosses (radius 30 and up; elites are 18 to 26). */
export const BOSS_PUFF = 30;
export const ELITE_PUFF = 18;
const GEM_GLINT = UI.xp;
const ITEM_GLINT = 0xffd870;
/**
 * Tints of enemies: hit (a white fill), frozen by Sopro de Geada, slowed by frost (white-lilac frost on top, never
 * the gems' cyan). And the hero's hurt wash.
 */
export const TINT = {
  hit: 0xffffff,
  frozen: 0xd0cae8,
  /** Top of a frozen enemy (the frost on it): the bottom gets `frozen`. */
  frost: 0xf4f6ff,
  slowed: 0xe2def2,
  /** Bleeding (Leque de Facas): the shadow element's emerald; burning (Espada de Fogo): ember orange. */
  bleed: 0xe0f4e8,
  burn: 0xffd8c0,
  heroHurt: 0xffd0d0,
  /** The hero's outline while invulnerable, and the snow under the menu's party. */
  blink: 0xffffff,
  snow: 0xe8eff8,
};
/** Damage numbers: normal and strong hits. */
export const DAMAGE_TEXT = { color: '#ffffff', strong: '#ffd870', stroke: '#1a1424' };
/** Pixel dust clouds drawn at once in a mass death. */
const DUST_SHOWN = 28;
/**
 * The level-up ring (PF-06): a ring of gold light from the hero's feet out to 64 px, with motes, played once the
 * choice is made (never under the overlay). Held back while the forge moment's slow motion plays.
 */
function drawLevelRing(world: World, m: Moments): void {
  const age = world.time - m.level;
  if (age < 0 || age >= LEVEL_SHOW) return;
  const r = VFX.levelRing;
  const p = world.player;
  fxSprites.putFrame(
    vfxKey('levelRing'),
    Math.min(r.frames - 1, Math.floor((age / LEVEL_SHOW) * r.frames)),
    r.anchor[0],
    r.anchor[1],
    p.x,
    p.y + 20,
    64 / LEVEL_RING,
    0.85,
  );
}

/** Segments of Tempestade's jump line. */
const CHAIN_SEGS = 5;
/** Lightning layers: width factor, color (-1 = the bolt's color), alpha. Preallocated. */
const BOLT_LAYERS: readonly [number, number, number][] = [
  [1.6, INK, 0.9],
  [1, -1, 1],
  [0.35, 0xffffff, 1],
];
/**
 * Enemy danger (boss attacks): coral pink with stripes and a marching white dashed edge, so it never reads as the
 * player's own fire (orange-gold). Same hue as the UI's danger color.
 */
const WARN_COLOR = UI.dangerHex;
const WARN_EDGE = 0xffffff;
/** Length of a dash and of the gap after it on danger edges, world px. */
const DASH = 9;

/** The ice family (white and white-lilac, never the gems' cyan): Sopro de Geada's wave and frosted screen edges. */
const ICE = 0xe8e2f4;
/** Big moments the render keeps track of: match time when they happened (-Infinity = never). */
export interface Moments {
  /** A chest was opened; `elo` if it formed an Elo. */
  chest: number;
  elo: boolean;
  /** Badalada (bomb) and Sopro de Geada (freeze) were picked up. */
  bomb: number;
  frost: number;
  /** The hero's life went up (Luz Sagrada's kills, a chest, food). */
  heal: number;
  /** The moment a level-up ring started (after the choice, PF-06). */
  level: number;
  /** The last Ossada em Brasa blasts (CF-02), a ring of slots reused in turn. */
  bursts: { t: number; x: number; y: number; r: number }[];
  nextBurst: number;
}
const BURST_SLOTS = 6;
/** How long a blast shows: the flash, rays and smoke are quick, the scorch on the ground stays for `BURST_SCORCH`. */
const BURST_SCORCH = 2;
export const newMoments = (): Moments => ({
  bursts: Array.from({ length: BURST_SLOTS }, () => ({ t: -Infinity, x: 0, y: 0, r: 0 })),
  nextBurst: 0,
  chest: -Infinity,
  elo: false,
  bomb: -Infinity,
  frost: -Infinity,
  heal: -Infinity,
  level: -Infinity,
});
/** Regeneration is green, never the life bar's red (a red rise reads as losing life). */
/** No ground zone is filled more opaque than this: the ring says where it ends, the fill only tints. */
export const ZONE_FILL_MAX = 0.35;
/** Texture width of the shield sprite (art px). */
/** Width of the shield art and length of the sword art, in art px. */
const SWORD_ART = 40;
/** The ring of light after a level-up, seconds (8 frames at 14 fps). */
export const LEVEL_SHOW = 0.57;
/** The ring sprite's outer edge, art px. */
const LEVEL_RING = 70;
export const HEAL_COLOR = 0x7ae890;
/** How long the chest moment lasts (rays, ring and the reward's icon rising), seconds. */
export const CHEST_SHOW = 1.3;

/**
 * Redraws the transient shapes each frame: on the ground (under everyone) the hero light, frost and auras;
 * on top (over the enemies) orbiting pieces, slashes and bolts, so they never vanish in a crowd.
 */
export function drawFx(
  ground: Phaser.GameObjects.Graphics,
  top: Phaser.GameObjects.Graphics,
  world: World,
  m: Moments,
  glow?: Phaser.GameObjects.Graphics,
  calm = false,
): void {
  let g = ground;
  g.clear();
  top.clear();
  if (glow) {
    glow.clear();
    drawGlow(glow, world, m, calm);
  }
  const p = world.player;
  const hero = HERO_COLOR[world.character];
  drawIce(g, world);
  drawSlime(g, world);
  drawPatches(g, world);
  drawMoments(g, top, world, m, hero);
  drawBursts(g, top, world.time, m);
  drawLevelRing(world, m);
  drawCharges(g, world);
  drawLeaps(g, world);
  drawPushes(g, world);
  if (world.boss) drawBossWarning(g, top, world.boss, world.time);
  drawArenaWalls(top, world);
  // Many patches stacked (Espada de Fogo, Nevasca) must not wash the screen: the fills share a budget (NF-02).
  let frosts = 0;
  let burns = 0;
  for (let iZ = 0; iZ < world.zones.active.length; iZ++)
    if ((world.zones.active[iZ] as (typeof world.zones.active)[number]).slows) frosts++;
    else burns++;
  const frostK = Math.min(1, FROST_FILLS / Math.max(1, frosts));
  const burnK = Math.min(1, EMBER_FILLS / Math.max(1, burns));
  const fewFlames = burns > 8;
  // Flames share one budget per frame, handed to the newest patches first (the array's tail); old ones keep the ring.
  flames.left = FLAME_BUDGET;
  for (let iZ = world.zones.active.length - 1; iZ >= 0; iZ--) {
    const z = world.zones.active[iZ] as (typeof world.zones.active)[number];
    if (z.slows) drawZone(g, z, world.time, frostK, frosts > 8);
    else drawEmbers(g, z, world.time, burnK, fewFlames);
  }
  for (let iW = 0; iW < world.weapons.length; iW++) {
    const w = world.weapons[iW] as (typeof world.weapons)[number];
    const kind = WEAPONS[w.id].kind;
    const wdef = WEAPONS[w.id] as WeaponDef;
    if (wdef.swell && w.stacks > 0 && w.stackTime > world.time)
      drawSouls(top, world, w.stacks, w.stackTime - world.time);
    // The mace counts its blows to the wave: amber pips at the hero's feet light up one per blow (NF-03).
    if (wdef.kind === 'slam' && (wdef.waveEvery ?? 0) > 1)
      drawWaveCount(g, world, w.swings % (wdef.waveEvery ?? 1), (wdef.waveEvery ?? 1) - 1);
    if (kind === 'aura') {
      const st = weaponStats(w) as AuraLevel;
      const pulse = (WEAPONS[w.id] as WeaponDef).pulse;
      drawAura(
        g,
        top,
        world,
        st.radius * p.stats.area,
        1 - w.timer / (st.cooldown * p.stats.cooldown),
        isElo(w.id),
        // Chama de Yah heats up towards its wave: 0 just after one, 1 on the tick before the next.
        pulse ? (w.swings % pulse.every) / (pulse.every - 1) : 0,
        pulse ? pulse.radius : 0,
      );
    } else if (kind === 'orbit') {
      const s = weaponStats(w) as OrbitLevel;
      const count = s.count + p.stats.amount;
      const orbitR = s.orbitRadius * p.stats.area;
      const r = s.radius * p.stats.area;
      const style = ORBIT_STYLE[w.id] ?? SWORDS;
      const elo = isElo(w.id);
      if (elo) {
        // The guarded circle (Vigília: a gold ring with the four paladins' marks turning on it).
        top.lineStyle(2, style.dark, style.blade ? 0.6 : 0.35);
        ring(top, p.x, p.y, orbitR);
        if (style.blade)
          for (let i = 0; i < 4; i++) {
            const a = world.time * 0.5 + (i * Math.PI) / 2;
            const mx = p.x + Math.cos(a) * orbitR;
            const my = p.y + Math.sin(a) * orbitR;
            top.fillStyle(style.dark, 0.9).fillTriangle(mx - 4, my, mx, my - 6, mx + 4, my);
            top.fillTriangle(mx - 4, my, mx, my + 6, mx + 4, my);
          }
      }
      // Swords leave a trail along their circle, so the turn reads even in a still frame.
      const trail = elo ? 1 : 1.1;
      const dir = s.spin >= 0 ? 1 : -1;
      for (let i = 0; i < count; i++) {
        const a = orbitAngle(world.time, s.spin, i, count);
        // Vigília's swords dart out toward the nearest enemy and back.
        const br = bladeRadius(w, a, orbitR);
        const x = p.x + Math.cos(a) * br;
        const y = p.y + Math.sin(a) * br;
        if (br > orbitR + 1) {
          top.lineStyle(r * 0.9, ITEM_GLINT, 0.35);
          top.lineBetween(p.x + Math.cos(a) * orbitR, p.y + Math.sin(a) * orbitR, x, y);
        }
        if (style.blade) {
          const tc = elo ? ITEM_GLINT : style.color;
          // A thin cut that fades behind the blade: a pale band and a bright edge line at its tip.
          top.fillStyle(tc, elo ? 0.16 : 0.2);
          band(
            top,
            p.x,
            p.y,
            orbitR - r * (elo ? 0.6 : 0.3),
            orbitR + r * (elo ? 0.6 : 0.3),
            dir > 0 ? a - trail : a,
            dir > 0 ? a : a + trail,
          );
          top.fillStyle(tc, elo ? 0.28 : 0.45);
          band(
            top,
            p.x,
            p.y,
            orbitR - r * (elo ? 0.4 : 0.15),
            orbitR + r * (elo ? 0.4 : 0.15),
            dir > 0 ? a - trail * 0.4 : a,
            dir > 0 ? a : a + trail * 0.4,
          );
          if (!elo) {
            top.lineStyle(2, 0xffffff, 0.8);
            top.beginPath();
            top.arc(p.x, p.y, orbitR, dir > 0 ? a - trail * 0.5 : a, dir > 0 ? a : a + trail * 0.5);
            top.strokePath();
          }
          // Vigília: a white-gold glow exactly the size of the hit.
          if (elo) {
            top.fillStyle(0xfff6d0, 0.3);
            disc(top, x, y, r);
            top.lineStyle(1.5, ITEM_GLINT, 0.7);
            ring(top, x, y, r);
          }
          if (elo) drawSword(top, x, y, a + (dir * Math.PI) / 2, r, style);
          // The pixel sword points the way it turns (its tip is up in the art).
          else fxSprites.put('fx.sword', x, y, a + (dir * Math.PI) / 2 + Math.PI / 2, (r * 6) / SWORD_ART);
        }
      }
    }
  }
  drawWard(top, world);
  drawStuns(top, world);
  drawMarks(top, world);
  drawEnemyShots(top, world);
  drawFoes(g, top, world);
  g = top;
  // A chest on the ground twinkles: a soft gold ring around it and a star that blinks on its lid.
  for (let iIt = 0; iIt < world.pickups.active.length; iIt++) {
    const it = world.pickups.active[iIt] as (typeof world.pickups.active)[number];
    if (it.type !== 'chest') continue;
    const tw = Math.sin(world.time * 5 + it.x) * 0.5 + 0.5;
    ground.lineStyle(2, ITEM_GLINT, 0.35 + 0.3 * tw);
    ovalRing(ground, it.x, it.y + 9, 34 + 4 * tw, 11 + 1.5 * tw);
    const k = Math.max(0, Math.sin(world.time * 3 + it.y)) ** 4; // mostly off, then a quick twinkle
    if (k > 0.05) star(g, it.x + 6, it.y - 9, 3 + 6 * k, 0xffffff, k);
  }
  for (let iPr = 0; iPr < world.projectiles.active.length; iPr++) {
    const pr = world.projectiles.active[iPr] as (typeof world.projectiles.active)[number];
    const tr = pr.source ? TRAIL[pr.source.id] : undefined;
    if (tr) drawTrail(g, pr, tr, world.time);
    if (pr.source) drawVerb(g, pr, WEAPONS[pr.source.id] as WeaponDef, world.time);
  }
  let dust = 0;
  for (let iF = 0; iF < world.puffs.active.length; iF++) {
    const f = world.puffs.active[iF] as (typeof world.puffs.active)[number];
    const k = f.ttl / config.effects.puffTtl; // 1 -> 0
    if (f.kind === 'death') {
      // A cartoon poof: a white pop, then three little clouds puffing out and shrinking. (Bosses get their
      // own send-off from the sparks.)
      if (f.r >= BOSS_PUFF) continue;
      const r = f.r;
      if (r < ELITE_PUFF) {
        // The common death: a pixel dust cloud with a few gold stars (PF-05). Decoration, so it gives way first
        // when the sprite pool is full, and at most DUST_SHOWN a frame in a mass death.
        if (dust < DUST_SHOWN) {
          dust++;
          const d = VFX.dust;
          fxSprites.putFrame(
            vfxKey('dust'),
            Math.min(d.frames - 1, Math.floor((1 - k) * d.frames)),
            d.anchor[0],
            d.anchor[1],
            f.x,
            f.y,
            Math.max(0.7, r / 12),
            1,
            0,
            true,
          );
        }
        continue;
      }
      // Elites keep the big cartoon poof: a white pop, then three little clouds puffing out and shrinking.
      if (k > 0.7) {
        g.fillStyle(0xffffff, (k - 0.7) * 2);
        disc(g, f.x, f.y, r * (1.1 - k * 0.4));
      }
      const out = 1 - k;
      for (let i = 0; i < 3; i++) {
        const a = i * 2.1 + f.x * 0.37;
        const cx = f.x + Math.cos(a) * r * (0.2 + 0.8 * out);
        const cy = f.y + Math.sin(a) * r * (0.2 + 0.6 * out) - r * 0.4 * out;
        const cr = r * (0.5 - 0.15 * i) * (0.5 + k * 0.7);
        g.fillStyle(PUFF_SHADE, 0.75 * k);
        disc(g, cx + cr * 0.15, cy + cr * 0.2, cr);
        g.fillStyle(PUFF_COLOR, 0.9 * k);
        disc(g, cx, cy, cr);
      }
    } else if (f.kind === 'shade') {
      // A shadow snapping shut: a dark disc pulled in to a point, with a thin red ring at its edge.
      g.fillStyle(0x120818, 0.8 * k);
      disc(g, f.x, f.y, f.r * (0.3 + k * 0.7));
      g.lineStyle(2, 0xff3a3a, k);
      ring(g, f.x, f.y, f.r * (0.4 + k * 0.6));
    } else {
      const r = f.r * (1.6 - k * 0.8);
      const c = f.kind === 'gem' ? GEM_GLINT : ITEM_GLINT;
      g.lineStyle(2, c, k);
      ring(g, f.x, f.y, r);
    }
  }
  // Once the run is over the world stops: swings and bolts frozen mid-air would only look stuck.
  if (world.state === 'won' || world.state === 'lost') return;
  for (let iS = 0; iS < world.slashes.active.length; iS++) {
    const s = world.slashes.active[iS] as (typeof world.slashes.active)[number];
    if (s.form === 'smash') {
      drawSmash(ground, top, s, 1 - s.ttl / config.effects.smashTtl);
      continue;
    }
    if (s.form === 'shock') {
      drawShock(ground, top, s, 1 - s.ttl / config.effects.shockTtl);
      continue;
    }
    if (s.form === 'pulse') {
      // Chama de Yah's wave: the pixel ring of holy fire runs out to exactly the pulse radius, with a faint glow
      // on the ground behind it.
      const k = 1 - s.ttl / config.effects.pulseTtl;
      const grow = 1 - (1 - k) * (1 - k);
      ground.fillStyle(ELEMENT_COLOR.holy, 0.1 * (1 - k));
      disc(ground, p.x, p.y, s.shock * grow);
      const wv = VFX.pulse;
      fxSprites.putFrame(
        vfxKey('pulse'),
        Math.min(wv.frames - 1, Math.floor(k * wv.frames)),
        wv.anchor[0],
        wv.anchor[1],
        p.x,
        p.y,
        s.shock / PULSE_RING,
        0.9,
      );
      continue;
    }
    const t = 1 - s.ttl / config.effects.slashTtl;
    drawSwing(
      g,
      ground,
      p.x,
      p.y,
      s.range,
      s.angle - s.arc / 2,
      s.angle + s.arc / 2,
      t,
      SWING_STYLE[s.weapon] ?? SWING_PLAIN,
    );
  }
  for (let iB = 0; iB < world.bolts.active.length; iB++) {
    const b = world.bolts.active[iB] as (typeof world.bolts.active)[number];
    drawBolt(ground, top, b, 1 - b.ttl / config.effects.boltTtl);
  }
}

/**
 * A projectile's trail (drawn under its sprite): a speed streak (`line`: wide color, then a thin bright core), or
 * a wavy row of fading lights (`dots`). `len` is seconds of flight it covers; `star` adds a twinkle at the head.
 */
interface Trail {
  color: number;
  core: number;
  width: number;
  len: number;
  dots: boolean;
  star: boolean;
}
const TRAIL: Partial<Record<WeaponId, Trail>> = {
  elunLight: { color: 0xf0d070, core: 0xfff6d0, width: 5, len: 0.06, dots: false, star: false },
  holyLight: { color: ELEMENT_COLOR.holy, core: 0xffffff, width: 6, len: 0.07, dots: false, star: true },
  daggers: { color: HERO_COLOR.andilla, core: 0xffffff, width: 3, len: 0.05, dots: false, star: false },
  fan: { color: ELEMENT_COLOR.shadow, core: 0xe0ffe8, width: 3, len: 0.05, dots: false, star: false },
  hammer: { color: 0xcbd8ec, core: 0xffffff, width: 10, len: 0.12, dots: false, star: false },
  shields: { color: 0x8aa8c8, core: 0xffffff, width: 9, len: 0.2, dots: false, star: false },
  valmorWall: { color: ELEMENT_COLOR.steel, core: 0xffffff, width: 11, len: 0.2, dots: false, star: false },
  forgeFury: { color: ELEMENT_COLOR.forge, core: 0xfff0a0, width: 12, len: 0.14, dots: false, star: false },
  wisps: { color: 0x8a7aff, core: 0xe4dcff, width: 4, len: 0.12, dots: true, star: false },
  soulProcession: { color: ELEMENT_COLOR.soul, core: 0xffffff, width: 5, len: 0.2, dots: true, star: false },
};

/** How long the mark of a turn (ricochet, return, far side of a loop) shows, seconds. */
const TURN_SHOW = 0.3;

/**
 * The Elo verbs of thrown shots that turn (PF-03): a ricochet leaves an emerald streak from the bounce to the new
 * target and a star where it bounced; the boomerang leaves a faint ghost of its way out and flares when it turns
 * home; a shield's loop shows the steel arc it still has to fly before it comes back, and flares at its far side.
 * All of it reads from the shot's own turn marks (`turnAt`, `turnX`, `turnY`, `fromX`, `fromY`): no state here.
 */
function drawVerb(g: Phaser.GameObjects.Graphics, pr: Projectile, def: WeaponDef, time: number): void {
  const since = time - pr.turnAt;
  const flare = since >= 0 && since < TURN_SHOW ? 1 - since / TURN_SHOW : 0;
  if (def.ricochet && flare > 0) {
    const c = ELEMENT_COLOR.shadow;
    g.lineStyle(4, c, 0.7 * flare).lineBetween(pr.turnX, pr.turnY, pr.x, pr.y);
    g.lineStyle(1.5, 0xe0ffe8, 0.9 * flare).lineBetween(pr.turnX, pr.turnY, pr.x, pr.y);
    star(g, pr.turnX, pr.turnY, 5 + 9 * flare, 0xe0ffe8, flare);
  } else if (def.boomerang && pr.home) {
    // The way out stays as a faint ghost until the hammer is caught.
    g.lineStyle(5, ELEMENT_COLOR.forge, 0.16).lineBetween(pr.fromX, pr.fromY, pr.turnX, pr.turnY);
    if (flare > 0) {
      g.lineStyle(3 * flare + 1, 0xfff0a0, flare);
      ring(g, pr.turnX, pr.turnY, 10 + 26 * (1 - flare));
      star(g, pr.turnX, pr.turnY, 6 + 10 * flare, 0xffffff, flare);
    }
  } else if (def.loop) {
    if (flare > 0) {
      g.lineStyle(3 * flare + 1, 0xffffff, 0.9 * flare);
      ring(g, pr.turnX, pr.turnY, 8 + 24 * (1 - flare));
      star(g, pr.turnX, pr.turnY, 5 + 8 * flare, ELEMENT_COLOR.steel, flare);
    }
    if (pr.back > 0 && pr.curve !== 0) {
      // The circle it flies: centre to the side it turns toward; the arc ahead, up to the far side.
      const rs = pr.speed / pr.curve;
      const cx = pr.x - Math.sin(pr.angle) * rs;
      const cy = pr.y + Math.cos(pr.angle) * rs;
      const t0 = Math.atan2(pr.y - cy, pr.x - cx);
      const sweep = pr.curve * (pr.ttl - pr.back);
      g.lineStyle(2, ELEMENT_COLOR.steel, 0.38);
      if (sweep > 0) arcLine(g, cx, cy, Math.abs(rs), t0, t0 + sweep);
      else arcLine(g, cx, cy, Math.abs(rs), t0 + sweep, t0);
    }
  }
}

function drawTrail(g: Phaser.GameObjects.Graphics, pr: Projectile, tr: Trail, time: number): void {
  const len = pr.speed * tr.len;
  const ux = Math.cos(pr.angle);
  const uy = Math.sin(pr.angle);
  if (tr.dots) {
    for (let i = 1; i <= 3; i++) {
      const d = (len * i) / 3;
      const wob = Math.sin(time * 8 + i * 1.3 + pr.poolIndex) * 3;
      const x = pr.x - ux * d - uy * wob;
      const y = pr.y - uy * d + ux * wob;
      g.fillStyle(tr.color, 0.5 - i * 0.12);
      disc(g, x, y, tr.width * (1 - i * 0.2));
    }
    return;
  }
  g.lineStyle(tr.width, tr.color, 0.35).lineBetween(pr.x, pr.y, pr.x - ux * len, pr.y - uy * len);
  g.lineStyle(tr.width * 0.4, tr.core, 0.8).lineBetween(
    pr.x,
    pr.y,
    pr.x - ux * len * 0.55,
    pr.y - uy * len * 0.55,
  );
  if (tr.star) star(g, pr.x, pr.y, 9 + 2 * Math.sin(time * 10 + pr.poolIndex), 0xffffff, 0.8);
}

/** A cheap hash of a point in [0, 1): the same bolt keeps the same zigzag, and every bolt gets its own. */
const hash = (x: number, y: number, k: number): number => {
  const v = Math.sin(x * 12.9898 + y * 78.233 + k * 37.719) * 43758.5453;
  return v - Math.floor(v);
};

/**
 * Something falling from the sky (`u` 0 -> 1 over its life). The damage area is marked on the ground (`g`), never
 * as a disc over the enemies. Lightning: a zigzag of its own (outline, Lyra's purple, white core) and a scorch
 * mark; Tempestade adds branches and a cloud shadow. Fire: a fireball dropping, then a flower of flame petals out to
 * the exact radius; Espada de Fogo plants a burning sword in the middle.
 */
function drawBolt(
  g: Phaser.GameObjects.Graphics,
  top: Phaser.GameObjects.Graphics,
  b: Bolt,
  u: number,
): void {
  const st = BOLT_STYLE[b.weapon] ?? BOLT_PLAIN;
  const fade = 1 - u;
  const r = b.radius;
  if (b.link) {
    // Tempestade's jump: a violet zigzag from enemy to enemy in whole 2 px steps (cold halo, outline, colour, white
    // core), its shape re-rolled a few times over its life like a live arc, and a star of lightning where it lands.
    const dx = b.x - b.fromX;
    const dy = b.y - b.fromY;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const roll = Math.floor(u * 6);
    let px = b.fromX;
    let py = b.fromY;
    for (let seg = 1; seg <= CHAIN_SEGS; seg++) {
      const f = seg / CHAIN_SEGS;
      const off = seg === CHAIN_SEGS ? 0 : (hash(b.x + seg, b.y, 7 + roll) - 0.5) * Math.min(26, len * 0.35);
      const qx = Math.round((b.fromX + dx * f + nx * off) / 2) * 2;
      const qy = Math.round((b.fromY + dy * f + ny * off) / 2) * 2;
      top.lineStyle(st.width * 1.5, st.color, 0.18 * fade);
      top.lineBetween(px, py, qx, qy);
      for (let i = 0; i < BOLT_LAYERS.length; i++) {
        const L = BOLT_LAYERS[i] as readonly [number, number, number];
        top.lineStyle(st.width * 0.85 * L[0], L[1] === -1 ? st.color : L[1], L[2] * fade);
        top.lineBetween(px, py, qx, qy);
      }
      px = qx;
      py = qy;
    }
    const hit = VFX.chainHit;
    fxSprites.putFrame(
      vfxKey('chainHit'),
      Math.min(hit.frames - 1, Math.floor(u * hit.frames)),
      hit.anchor[0],
      hit.anchor[1],
      b.x,
      b.y,
      0.8,
    );
    return;
  }
  if (st.burst) {
    // An orb bursting: a flash, a soft disc filling the blast, and a bright ring running out to its edge.
    const grow = 1 - (1 - u) * (1 - u);
    g.fillStyle(st.color, 0.3 * fade);
    disc(g, b.x, b.y, r * grow);
    top.lineStyle(st.width * fade + 1, st.core, 0.9 * fade);
    ring(top, b.x, b.y, r * grow);
    top.lineStyle(2, st.color, 0.8 * fade);
    ring(top, b.x, b.y, r * grow * 0.75);
    if (u < 0.3) {
      top.fillStyle(0xffffff, 0.9 * (1 - u / 0.3));
      disc(top, b.x, b.y, 5 + r * 0.35 * (u / 0.3));
    }
    if (st.shards)
      // The frozen enemy breaking: ice shards flung out to the edge of what the shatter hits.
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 + hash(b.x, b.y, 4) * 2;
        const d = r * (0.25 + 0.75 * grow);
        shard(top, b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, a, 7 * fade + 2, fade);
      }
    return;
  }
  if (st.fire) {
    if (u < FALL) {
      // The fall: a fireball (or the sword, point first) coming down from up and to the left.
      const fk = u / FALL;
      const x = b.x - 50 * (1 - fk);
      const y = b.y - 150 * (1 - fk);
      if (st.sword) drawSword(top, x, y - 24, Math.PI / 2 - 0.3 * (1 - fk), 16, FIRE_SWORD);
      else {
        // A small flame falling, flickering as it comes.
        const fl = VFX.flame;
        fxSprites.putFrame(
          vfxKey('flame'),
          Math.floor(u * 40) % fl.frames,
          fl.anchor[0],
          fl.anchor[1],
          x,
          y + 18,
          0.8,
        );
      }
      return;
    }
    const bk = (u - FALL) / (1 - FALL); // 0 -> 1 over the burst
    // The burst: the pixel fireball, its ring running out to exactly the blast radius.
    const blast = VFX.blast;
    fxSprites.putFrame(
      vfxKey('blast'),
      Math.min(blast.frames - 1, Math.floor(bk * blast.frames)),
      blast.anchor[0],
      blast.anchor[1],
      b.x,
      b.y,
      r / BLAST_RING,
    );
    if (st.sword) drawSword(top, b.x, b.y - 24, Math.PI / 2, 16, FIRE_SWORD);
    return;
  }
  // Lightning: the pixel bolt strikes from above and leaves a ring of force exactly as wide as the hit.
  const bolt = VFX.bolt;
  const f = Math.min(bolt.frames - 1, Math.floor(u * bolt.frames));
  fxSprites.putFrame(vfxKey('bolt'), f, bolt.anchor[0], bolt.anchor[1], b.x, b.y, r / BOLT_RING);
}

/**
 * A swing that sweeps from `a0` to `a1` around (cx, cy): a crescent band trailing behind a bright edge, so the
 * direction reads in a single frame. `t` goes 0 -> 1 over the swing's life. Heavy swings leave a mark on the
 * ground (`under`): a shock ring opening out along the arc, or cracks at its ends.
 */
function drawSwing(
  g: Phaser.GameObjects.Graphics,
  under: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  range: number,
  a0: number,
  a1: number,
  t: number,
  st: SwingStyle,
): void {
  if (st.sprite) {
    // The pixel crescent: centred on the swing, scaled so its edge is the weapon's reach.
    const cut = VFX[st.sprite];
    fxSprites.putFrame(
      vfxKey(st.sprite),
      Math.max(0, Math.min(cut.frames - 1, Math.floor(t * cut.frames))),
      cut.anchor[0],
      cut.anchor[1],
      cx,
      cy,
      range / SLASH_REACH,
      1,
      // The spin is a whole ring: nothing to turn.
      st.sprite === 'furySpin' ? 0 : (a0 + a1) / 2,
    );
    return;
  }
  const span = a1 - a0;
  const sk = Math.min(1, t / SWEEP);
  const lead = a0 + span * (1 - (1 - sk) * (1 - sk));
  const tail = Math.max(a0, lead - span * 0.7, a0 + span * Math.max(0, (t - SWEEP) / (1 - SWEEP)));
  const fade = t < SWEEP ? 1 : 1 - (t - SWEEP) / (1 - SWEEP);
  const inner = range * st.band;
  const mid = (range + inner) / 2;
  if (lead > tail + 0.01) {
    // The trail: a soft wide band, then a brighter one close behind the edge.
    g.fillStyle(st.fill, st.fillAlpha * fade);
    band(g, cx, cy, inner, range, tail, lead);
    g.fillStyle(st.edge, 0.3 * fade);
    band(g, cx, cy, mid, range, lead - (lead - tail) * 0.35, lead);
    g.lineStyle(3, 0xffffff, 0.95 * fade);
    arcLine(g, cx, cy, range, tail, lead);
    g.lineStyle(2.5, st.edge, 0.9 * fade);
    arcLine(g, cx, cy, range + 2.5, tail, lead);
  }
  if (t < SWEEP) {
    // The blade itself, leading the sweep.
    const ux = Math.cos(lead);
    const uy = Math.sin(lead);
    g.lineStyle(5, st.edge, 0.8).lineBetween(
      cx + ux * inner,
      cy + uy * inner,
      cx + ux * (range + 2),
      cy + uy * (range + 2),
    );
    g.lineStyle(2.5, 0xffffff, 1).lineBetween(
      cx + ux * inner,
      cy + uy * inner,
      cx + ux * range,
      cy + uy * range,
    );
    // A bright square glint on the tip, in whole pixels like the rest of the art.
    g.fillStyle(0xffffff, 1).fillRect(
      Math.round((cx + ux * range) / 2) * 2 - 3,
      Math.round((cy + uy * range) / 2) * 2 - 3,
      6,
      6,
    );
    g.fillStyle(st.edge, 0.9).fillRect(
      Math.round((cx + ux * range) / 2) * 2 - 1,
      Math.round((cy + uy * range) / 2) * 2 - 1,
      2,
      2,
    );
  }
  if (st.mark === 'none' || t < SWEEP * 0.8) return;
  const mk = (t - SWEEP * 0.8) / (1 - SWEEP * 0.8);
  // A shock ring opening out along the arc: "it shoves".
  under.lineStyle(5 * (1 - mk) + 1, 0xf0e8d8, 0.55 * (1 - mk));
  arcLine(under, cx, cy, range * (0.95 + 0.25 * mk), a0, a1);
  if (st.mark !== 'crack') return;
  // Cracks in the ground at both ends of the swing.
  under.lineStyle(2.5, 0x3a2a24, 0.7 * (1 - mk * mk));
  for (let e = 0; e < 2; e++) {
    const a = e ? a1 : a0;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    let x = cx + ux * range * 0.75;
    let y = cy + uy * range * 0.75;
    for (let i = 1; i <= 3; i++) {
      const side = (i % 2 ? 1 : -1) * 6;
      const nx = cx + ux * range * (0.75 + i * 0.12) - uy * side;
      const ny = cy + uy * range * (0.75 + i * 0.12) + ux * side;
      under.lineBetween(x, y, nx, ny);
      x = nx;
      y = ny;
    }
  }
}

/**
 * A mace blow landing at (s.x, s.y), facing `s.angle`, `t` 0 -> 1: the iron head's shadow drops in for a moment,
 * then a dusty half-moon of impact opens to exactly the radius it hits, its front rim bright, and fades. The Elo's
 * rim glows in its element's colour.
 */
function drawSmash(
  under: Phaser.GameObjects.Graphics,
  top: Phaser.GameObjects.Graphics,
  s: Slash,
  t: number,
): void {
  const r = s.shock;
  const glow = SLAM_GLOW[s.weapon];
  // The impact starts on the frame of the damage (NF-03): no drop before it.
  const k = t;
  const open = 1 - (1 - k) * (1 - k) * (1 - k);
  const fade = 1 - k * k;
  const a0 = s.angle - Math.PI * 0.6;
  const a1 = s.angle + Math.PI * 0.6;
  under.fillStyle(DUST_LIGHT, ZONE_FILL_MAX * fade);
  disc(under, s.x, s.y, r * open);
  under.fillStyle(DENT, 0.35 * fade);
  disc(under, s.x, s.y, r * 0.28);
  // A dark ring on the ground at the exact reach of the blow.
  under.lineStyle(3, INK, 0.45 * fade);
  ring(under, s.x, s.y, r);
  // Quebra-Junta's rim is its element's amber, with the dust only as a thread inside; the mace's is dust.
  top.lineStyle(7 * fade + 2, glow ?? DUST_LIGHT, 0.95 * fade);
  arcLine(top, s.x, s.y, r * open, a0, a1);
  top.lineStyle(2, glow ? DUST_LIGHT : 0xffffff, 0.9 * fade);
  arcLine(top, s.x, s.y, r * open * 0.93, a0 + 0.15, a1 - 0.15);
  if (k < HEAD_SHOWN) drawMaceHead(s, k / HEAD_SHOWN);
  // Pebbles thrown out from the front half, falling back.
  top.fillStyle(DUST_LIGHT, 0.9 * fade);
  for (let i = 0; i < 5; i++) {
    const a = a0 + ((a1 - a0) * (i + 0.5)) / 5;
    const d = r * (0.6 + 0.5 * open);
    disc(top, s.x + Math.cos(a) * d, s.y + Math.sin(a) * d - Math.sin(k * Math.PI) * 14, 2.5);
  }
}

/** Part of a blow's life the mace head stays on the ground (~0.15 s). */
const HEAD_SHOWN = 0.375;

/**
 * The mace head driven into the ground where it struck, on the frame of the damage: it squashes and fades (`q` 0 -> 1).
 * The blow that brings the shock wave has a white-hot head ("pá, pá, BUM").
 */
function drawMaceHead(s: Slash, q: number): void {
  // The pixel head with its haft, turned the way the blow goes; it swells a little as it lands, then fades.
  fxSprites.put('fx.maceHead', s.x, s.y - 6, s.angle, 1 + 0.25 * q, 1 - q * q);
}

/**
 * A mace's shock wave running out from (s.x, s.y) to `s.shock`: a thick dusty ring with a bright inner edge and
 * pebbles riding it, over a faint dust disc. Quebra-Junta's glows in its element's colour.
 */
function drawShock(
  under: Phaser.GameObjects.Graphics,
  top: Phaser.GameObjects.Graphics,
  s: Slash,
  t: number,
): void {
  const grow = 1 - (1 - t) * (1 - t);
  const r = s.shock * (0.2 + 0.8 * grow);
  const fade = (1 - t) * (s.echo ? 0.5 : 1);
  const glow = SLAM_GLOW[s.weapon];
  under.fillStyle(DUST_LIGHT, 0.12 * fade);
  disc(under, s.x, s.y, r);
  // Quebra-Junta's element shows as one thin amber thread on the wave front (no wide halo: the skeletons inside
  // keep their outline, PF-02).
  if (glow) {
    top.lineStyle(2, glow, 0.7 * fade);
    ring(top, s.x, s.y, r);
  }
  // The pixel rings of force: the outer one runs out to exactly the wave's radius. The aftershock is fainter.
  const wave = VFX.shock;
  fxSprites.putFrame(
    vfxKey('shock'),
    Math.min(wave.frames - 1, Math.floor(t * wave.frames)),
    wave.anchor[0],
    wave.anchor[1],
    s.x,
    s.y,
    s.shock / SHOCK_RING,
    s.echo ? 0.45 : 0.85,
  );
}

/** `lit` of `n` amber pips under the hero: the blows already struck towards the mace's next shock wave. */
function drawWaveCount(g: Phaser.GameObjects.Graphics, world: World, lit: number, n: number): void {
  const p = world.player;
  for (let i = 0; i < n; i++) {
    const x = p.x + (i - (n - 1) / 2) * 12;
    const y = p.y + 44;
    g.fillStyle(INK, 0.6);
    disc(g, x, y, 4.5);
    g.fillStyle(i < lit ? ELEMENT_COLOR.earth : 0x4a3a28, i < lit ? 1 : 0.8);
    disc(g, x, y, 3);
  }
}

/**
 * Procissão: the souls it has gathered (one per kill, up to its cap; each adds a wisp to the next volley) circle the
 * hero as small lights, blinking in their last second before they go (NF-08).
 */
function drawSouls(g: Phaser.GameObjects.Graphics, world: World, n: number, left: number): void {
  const p = world.player;
  const t = world.time;
  const a = left < 1 ? 0.45 + 0.45 * Math.sin(t * 24) : 0.9;
  // A pale halo round the hero that grows and brightens with every soul gathered: the swell, readable at a glance.
  const swell = Math.min(1, n / ((WEAPONS.soulProcession as WeaponDef).swell?.cap ?? 4));
  g.fillStyle(ELEMENT_COLOR.soul, (0.05 + 0.1 * swell) * a);
  disc(g, p.x, p.y - 6, 24 + 16 * swell);
  g.lineStyle(2, ELEMENT_COLOR.soul, (0.2 + 0.4 * swell) * a);
  ring(g, p.x, p.y - 6, 24 + 16 * swell);
  for (let i = 0; i < n; i++) {
    const ang = t * 2.2 + (i * Math.PI * 2) / n;
    const x = p.x + Math.cos(ang) * 30;
    const y = p.y - 6 + Math.sin(ang) * 12 + Math.sin(t * 5 + i) * 2;
    g.fillStyle(ELEMENT_COLOR.soul, 0.35 * a);
    disc(g, x, y, 6);
    g.fillStyle(0xffffff, a);
    disc(g, x, y, 2.5);
  }
}

/** The most effect lights a frame may ask of the light map (flames, auras, bolts: the budget of NF-02). */
export const FX_LIGHTS = 8;
/** The most burning bodies drawn with flames in a frame. */
const BURNING_SHOWN = 14;
/** Rims of area hits drawn per frame, and the colour of a weapon with no spark colour of its own. */
const HIT_RIMS = 48;
const HIT_RIM_PLAIN = 0xffe6b0;
const FLAME_OUTER = 0xff5a14;
const FLAME_MID = 0xffa030;
const FLAME_CORE = 0xfff2c0;
const HEAL_FLASH = 3;

/** A soft pool of light: nested ovals on the additive layer, brighter in the middle. */
function softPool(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: number,
  alpha: number,
): void {
  for (let i = 0; i < 4; i++) {
    const f = 1 - i * 0.24;
    g.fillStyle(color, alpha * 0.28);
    oval(g, x, y, rx * f, ry * f);
  }
}

/** One tongue of fire: a teardrop of three nested layers whose tip sways and flickers. */
function tongue(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  t: number,
  seed: number,
  a: number,
): void {
  const sway = Math.sin(t * 9 + seed * 1.7) * w * 0.5;
  const flick = 0.82 + 0.18 * Math.sin(t * 17 + seed * 2.3);
  const hh = h * flick;
  g.fillStyle(FLAME_OUTER, 0.5 * a);
  disc(g, x, y, w);
  g.fillTriangle(x - w, y, x + w, y, x + sway, y - hh);
  g.fillStyle(FLAME_MID, 0.6 * a);
  disc(g, x, y, w * 0.65);
  g.fillTriangle(x - w * 0.65, y, x + w * 0.65, y, x + sway * 0.8, y - hh * 0.72);
  g.fillStyle(FLAME_CORE, 0.8 * a);
  g.fillTriangle(x - w * 0.3, y, x + w * 0.3, y, x + sway * 0.5, y - hh * 0.42);
}

/**
 * The additive layer: light that adds to what is below. A burning body (the Ossada em Brasa, anything with a burn)
 * wears real flames, several tongues climbing from the shoulders and trembling, over a pool of orange light on the
 * ground that also washes its neighbours. The aura breathes light; orbiting blades carry a glint; a heal glows green.
 * The calm screen holds flames steady and dims the pools.
 */
function drawGlow(g: Phaser.GameObjects.Graphics, world: World, m: Moments, calm: boolean): void {
  const t = calm ? 0 : world.time;
  const dim = calm ? 0.6 : 1;
  const p = world.player;
  const foes = world.enemies.active;
  let shown = 0;
  for (let i = 0; i < foes.length && shown < BURNING_SHOWN; i++) {
    const e = foes[i] as (typeof foes)[number];
    const ember = !!e.def.burst && e.pile <= 0;
    if (e.dead || !(ember || (e.dot > 0 && e.dotKind !== 'bleed'))) continue;
    shown++;
    const r = e.def.radius;
    const pulse = 0.85 + 0.15 * Math.sin(t * 7 + e.uid);
    softPool(g, e.x, e.y + r * 0.6, r * 3.4 * pulse, r * 2.2 * pulse, FLAME_OUTER, 0.5 * dim);
    softPool(g, e.x, e.y + r * 0.5, r * 1.6, r * 1.0, FLAME_MID, 0.4 * dim);
    const n = ember ? (calm ? 3 : 5) : 3;
    const big = ember ? 1 : 0.6;
    for (let k = 0; k < n; k++) {
      const u = k / (n - 1) - 0.5; // -0.5 .. 0.5 across the shoulders
      const hk = 1 - Math.abs(u) * 0.9;
      tongue(
        g,
        e.x + u * r * 1.5,
        e.y + r * (0.15 - 0.2 * hk),
        (4.2 + 2.6 * hk) * big,
        (20 + 16 * hk) * big,
        t,
        e.uid + k * 1.9,
        dim > 0.9 ? 1 : 0.8,
      );
    }
  }
  // Who was hit by an area weapon (no white flash for those): a thin rim of the weapon's own light that fades with
  // the hit, added over the body (PF-01). The calm screen keeps it, only dimmer.
  let rims = 0;
  for (let i = 0; i < foes.length && rims < HIT_RIMS; i++) {
    const e = foes[i] as (typeof foes)[number];
    if (e.dead || e.flash <= 0 || !e.hitBy || !AREA_HIT[e.hitBy]) continue;
    rims++;
    const f = Math.min(1, e.flash / config.enemies.hitFlash);
    const c = HIT_SPARK[e.hitBy]?.[1] ?? HIT_RIM_PLAIN;
    const r = e.def.radius;
    g.fillStyle(c, 0.16 * f * dim);
    oval(g, e.x, e.y - r * 0.2, r * 1.1, r * 1.25);
    g.lineStyle(2, c, 0.7 * f * dim);
    ovalRing(g, e.x, e.y - r * 0.2, r * 1.15, r * 1.3);
  }
  for (let iW = 0; iW < world.weapons.length; iW++) {
    const w = world.weapons[iW] as (typeof world.weapons)[number];
    const def = WEAPONS[w.id] as WeaponDef;
    if (def.kind === 'aura') {
      const st = weaponStats(w) as AuraLevel;
      const r = st.radius * p.stats.area;
      const k = 1 - w.timer / (st.cooldown * p.stats.cooldown);
      const flare = Math.max(0, 1 - k * 3);
      const c = isElo(w.id) ? 0xff9a30 : 0xffd060;
      softPool(g, p.x, p.y, r * 0.9, r * 0.8, c, (0.22 + 0.4 * flare) * dim);
      g.lineStyle(3, 0xfff0c0, (0.15 + 0.5 * flare) * dim);
      ring(g, p.x, p.y, r);
    } else if (def.kind === 'orbit') {
      const s = weaponStats(w) as OrbitLevel;
      const count = s.count + p.stats.amount;
      const orbitR = s.orbitRadius * p.stats.area;
      const r = s.radius * p.stats.area;
      const elo = isElo(w.id);
      for (let i = 0; i < count; i++) {
        const a = orbitAngle(world.time, s.spin, i, count);
        const br = bladeRadius(w, a, orbitR);
        const bx = p.x + Math.cos(a) * br;
        const by = p.y + Math.sin(a) * br;
        g.fillStyle(elo ? 0xfff0b0 : 0xcfe4ff, 0.14 * dim);
        disc(g, bx, by, r * 1.3);
        g.fillStyle(0xffffff, 0.3 * dim);
        disc(g, bx, by, r * 0.4);
      }
    }
  }
  // Healing: a soft green glow around the hero's body for a few seconds after the last heal, fading out
  // (regeneration keeps renewing it). The life bar itself stays as it is.
  const healed = world.time - m.heal;
  if (healed < HEAL_FLASH) {
    const hk = Math.min(1, (HEAL_FLASH - healed) / 1.2);
    const beat = 0.75 + 0.25 * Math.sin(world.time * 5);
    softPool(g, p.x, p.y - 12, 36, 44, HEAL_COLOR, 0.34 * hk * beat * dim);
  }
}

/**
 * Aura de Yah: warm light around the hero that beats with its damage. `k` is the tick phase (0 right at a tick,
 * 1 just before the next): each tick a wave runs out to exactly the damage radius and the rim lights up. Motes of
 * light drift up inside. Chama de Yah: a white-hot core, round flame tongues on the rim and rising embers, over a
 * very faint disc (its 150 px would cover the crowd).
 */
function drawAura(
  g: Phaser.GameObjects.Graphics,
  top: Phaser.GameObjects.Graphics,
  world: World,
  r: number,
  k: number,
  elo: boolean,
  heat = 0,
  pulseR = 0,
): void {
  const p = world.player;
  const t = world.time;
  const c = elo ? FLAME_COLOR : AURA_COLOR;
  // Chama de Yah, the tick before its wave: a thin ring where the wave will reach, fading in (NF-08).
  if (pulseR > 0 && heat >= 1) {
    top.lineStyle(2, 0xffd080, 0.25 + 0.5 * k);
    ring(top, p.x, p.y, r * pulseR);
  }
  if (elo) {
    g.fillStyle(c, 0.06);
    disc(g, p.x, p.y, r);
  }
  // One soft glow at the heart (the wide pools it used to have cluttered the field).
  g.fillStyle(elo ? 0xfff0c0 : c, 0.12);
  disc(g, p.x, p.y, r * 0.3);
  // The rim flares on the tick and rests between ticks.
  const flare = Math.max(0, 1 - k * 3);
  // The pixel ring of light, turning, out at the exact edge of the aura.
  const halo = VFX.aura;
  fxSprites.putFrame(
    vfxKey('aura'),
    Math.floor(t * halo.fps) % halo.frames,
    halo.anchor[0],
    halo.anchor[1],
    p.x,
    p.y,
    r / AURA_RING,
    // It charges with the tick: dim right after a hit, slowly brighter, flaring on the next one.
    Math.min(1, 0.05 + 0.65 * k ** 2.5 + 0.35 * flare + 0.25 * heat),
  );
  if (elo) {
    g.lineStyle(2 + 2 * flare + 3 * heat, heat > 0.5 ? 0xffd080 : c, 0.35 + 0.55 * flare + 0.3 * heat);
    ring(g, p.x, p.y, r);
  }
  // The beat: a wave from the core out to the exact edge (over the crowd, thin, so it is seen but hides nothing).
  if (k < 0.45) {
    const wk = k / 0.45;
    const wr = r * (0.3 + 0.7 * (1 - (1 - wk) ** 2));
    top.lineStyle(4 - 3 * wk, elo ? 0xffc060 : 0xfff0a0, 0.7 * (1 - wk));
    ring(top, p.x, p.y, wr);
  }
  // Motes of light (embers for the Chama) drifting up inside the radius, more with each level.
  const motes = elo ? 5 : 2;
  for (let i = 0; i < motes; i++) {
    const ph = (t * (elo ? 0.9 : 0.5) + i * 0.37) % 1;
    const a = i * 2.4 + Math.floor(t * (elo ? 0.9 : 0.5) + i * 0.37) * 1.3;
    const d = r * (0.2 + 0.7 * ((i * 0.618) % 1));
    const mx = p.x + Math.cos(a) * d;
    const my = p.y + Math.sin(a) * d - ph * (elo ? 30 : 18);
    const ma = Math.sin(ph * Math.PI);
    top.fillStyle(elo ? (i % 2 ? FLAME_COLOR : 0xffd060) : 0xfff0a0, 0.75 * ma);
    disc(top, mx, my, elo ? 2 : 2.2);
    if (!elo) {
      top.fillStyle(0xffffff, 0.8 * ma);
      disc(top, mx, my, 1);
    }
  }
  if (!elo) return;
  // Ten real flames standing on the rim, taller as the wave comes near.
  const n = 10;
  const fl = VFX.flame;
  for (let i = 0; i < n; i++) {
    const a = (i * Math.PI * 2) / n + t * 0.4;
    fxSprites.putFrame(
      vfxKey('flame'),
      Math.floor(t * fl.fps + i * 3) % fl.frames,
      fl.anchor[0],
      fl.anchor[1],
      p.x + Math.cos(a) * r,
      p.y + Math.sin(a) * r + 6,
      0.7 + 0.15 * flare + 0.25 * heat,
    );
  }
}

/**
 * A patch of frost (Geada; Nevasca when it comes from the Elo). It lands with a ring opening out and shards flying;
 * every damage tick a ring of frost runs from the middle to the edge and the crystals pulse; at the end its rim
 * breaks into pieces. Nevasca adds falling snowflakes.
 */
function drawZone(
  g: Phaser.GameObjects.Graphics,
  z: Zone,
  time: number,
  fillK: number,
  crowded: boolean,
): void {
  const elo = !!z.source && isElo(z.source.id);
  const age = z.duration - z.ttl;
  const fade = Math.min(1, z.ttl / ZONE_BREAK);
  const land = Math.min(1, age / ZONE_LAND);
  const r = z.radius * (1 - (1 - land) * (1 - land));
  const tk = 1 - z.tick / config.zones.tick; // 0 right at a tick
  g.fillStyle(elo ? BLIZZARD_COLOR : FROST_COLOR, 0.22 * fade * fillK);
  disc(g, z.x, z.y, r);
  // The rim: a ring of pixel blocks, thinning out as the patch melts away (thinner still when many overlap).
  const blocks = Math.max(10, Math.round(r / 3));
  g.fillStyle(elo ? BLIZZARD_EDGE : 0xffffff, (crowded ? 0.55 : 0.85) * fade);
  for (let i = 0; i < blocks; i++) {
    if (z.ttl <= ZONE_BREAK && hash(z.x, z.y, i) > fade) continue;
    const a = (i / blocks) * Math.PI * 2;
    g.fillRect(
      Math.round((z.x + Math.cos(a) * r) / 2) * 2 - 1,
      Math.round((z.y + Math.sin(a) * r) / 2) * 2 - 1,
      3,
      3,
    );
  }
  if (tk < 0.5) {
    // The tick: a ring of frost from the middle to the edge.
    const wk = tk / 0.5;
    g.lineStyle(3 - 2 * wk, 0xffffff, 0.7 * (1 - wk) * fade);
    ring(g, z.x, z.y, r * (0.25 + 0.75 * wk));
  }
  // Ice crystals standing in the patch: they rise, shimmer and melt over its whole life.
  const ice = VFX.ice;
  const n = elo ? 5 : 3;
  const life = age / z.duration;
  for (let i = 0; i < n; i++) {
    const ang = (i * Math.PI * 2) / n + z.x * 0.01;
    const f = Math.min(ice.frames - 1, Math.floor(Math.max(0, life - i * 0.03) * ice.frames));
    fxSprites.putFrame(
      vfxKey('ice'),
      f,
      ice.anchor[0],
      ice.anchor[1],
      z.x + Math.cos(ang) * r * 0.55,
      z.y + Math.sin(ang) * r * 0.4 + 8,
      (r / ICE_SPAN) * (elo ? 1.1 : 1),
      1,
      0,
      true,
    );
  }
  if (!elo) return;
  // Nevasca: snowflakes falling through the patch, each on its own column.
  for (let i = 0; i < 6; i++) {
    const ph = (time * 0.6 + i * 0.29) % 1;
    const fx = z.x + (((i * 0.618 + z.x * 0.001) % 1) - 0.5) * r * 1.4;
    const fy = z.y - r * 0.7 + ph * r * 1.4;
    g.fillStyle(0xffffff, 0.8 * Math.sin(ph * Math.PI) * fade);
    disc(g, fx + Math.sin(time * 3 + i) * 3, fy, 2);
  }
}

/**
 * Espada de Fogo's burning ground: a glowing patch with a rim of embers and flame tongues flickering up from it,
 * fading out as it cools. Whoever walks in catches fire (the orange tint).
 */
function drawEmbers(
  g: Phaser.GameObjects.Graphics,
  z: Zone,
  time: number,
  fillK: number,
  fewFlames: boolean,
): void {
  const fade = Math.min(1, z.ttl / ZONE_BREAK);
  const r = z.radius;
  // Light fills: patches overlap a lot under a crowd, and stacked they must never hide who walks in them.
  g.fillStyle(0x3a1408, 0.18 * fade * fillK);
  disc(g, z.x, z.y, r);
  g.fillStyle(ELEMENT_COLOR.fire, 0.14 * fade * fillK);
  disc(g, z.x, z.y, r * 0.8);
  g.lineStyle(2, EMBER, 0.6 * fade);
  ring(g, z.x, z.y, r);
  // Real flames standing on the patch, each at its own point of the loop.
  const flame = VFX.flame;
  const n = Math.min(fewFlames ? 3 : 6, flames.left);
  flames.left -= n;
  for (let i = 0; i < n; i++) {
    const a = (i * Math.PI * 2) / n + z.y * 0.01;
    const d = r * (0.2 + 0.55 * ((i * 0.618) % 1));
    fxSprites.putFrame(
      vfxKey('flame'),
      Math.floor(time * flame.fps + i * 3) % flame.frames,
      flame.anchor[0],
      flame.anchor[1],
      z.x + Math.cos(a) * d,
      z.y + Math.sin(a) * d * 0.7,
      (r / EMBER_SPAN) * fade,
      1,
      0,
      true,
    );
  }
}

/** Flame sprites all burning patches may place in one frame (PB-01). */
const FLAME_BUDGET = 36;
const flames = { left: FLAME_BUDGET };

/** How many stacked patches' worth of fill the screen takes: past it, each patch's fill fades (NF-02). */
const FROST_FILLS = 5;
const EMBER_FILLS = 6;

/** Radius of Muralha de Valmor's guard around the hero (just outside the sprite and its light). */
const WARD_R = 32;

/**
 * Muralha de Valmor's guard. Up: a silver bubble of six steel plates (ink outline, white glint running round) that
 * will take the next hit. Down: a thin arc filling back around the hero as it recharges, so the player sees when the
 * next block comes.
 */
function drawWard(g: Phaser.GameObjects.Graphics, world: World): void {
  const p = world.player;
  const up = wardReady(world);
  if (!up) {
    for (let iW = 0; iW < world.weapons.length; iW++) {
      const w = world.weapons[iW] as (typeof world.weapons)[number];
      const ward = (WEAPONS[w.id] as WeaponDef).ward;
      if (!ward) continue;
      const k = 1 - Math.max(0, w.stackTime - world.time) / ward.every;
      const a0 = -Math.PI / 2;
      g.lineStyle(4, INK, 0.35);
      arcLine(g, p.x, p.y, WARD_R, a0, a0 + Math.PI * 2 * k);
      g.lineStyle(2, ELEMENT_COLOR.steel, 0.6);
      arcLine(g, p.x, p.y, WARD_R, a0, a0 + Math.PI * 2 * k);
      return;
    }
    return;
  }
  const t = world.time;
  const wr = WARD_R + Math.sin(t * 3) * 1.5;
  g.fillStyle(ELEMENT_COLOR.steel, 0.1);
  disc(g, p.x, p.y, wr);
  for (let i = 0; i < 6; i++) {
    const a = t * 0.8 + (i * Math.PI) / 3;
    g.lineStyle(6, INK, 0.7);
    arcLine(g, p.x, p.y, wr, a, a + Math.PI / 3 - 0.22);
    g.lineStyle(3.5, ELEMENT_COLOR.steel, 1);
    arcLine(g, p.x, p.y, wr, a, a + Math.PI / 3 - 0.22);
  }
  // A glint sliding round the plates, and a twinkle on top now and then: "polished, ready".
  const ga = -t * 2.2;
  g.lineStyle(2, 0xffffff, 0.9);
  arcLine(g, p.x, p.y, wr, ga, ga + 0.35);
  const tw = Math.max(0, Math.sin(t * 2.5)) ** 6;
  if (tw > 0.05) star(g, p.x + wr * 0.6, p.y - wr * 0.8, 3 + 5 * tw, 0xffffff, tw);
}

/** Two little stars circling the head of each stunned enemy (a slam), at most this many a frame. */
const STUN_SHOWN = 48;
function drawStuns(g: Phaser.GameObjects.Graphics, world: World): void {
  const list = world.enemies.active;
  const t = world.time;
  let n = 0;
  for (let i = 0; i < list.length && n < STUN_SHOWN; i++) {
    const e = list[i] as Enemy;
    if (e.stun <= 0 || e.def.boss) continue;
    n++;
    const r = e.def.radius;
    const y = e.y - r - 5;
    for (let k = 0; k < 2; k++) {
      const a = t * 7 + e.uid + k * Math.PI;
      const front = Math.sin(a) > 0;
      star(
        g,
        e.x + Math.cos(a) * r * 0.7,
        y + Math.sin(a) * 2.5,
        front ? 4.5 : 3.5,
        0xfff0a0,
        front ? 1 : 0.7,
      );
    }
  }
}

/**
 * Spawn marks (FT-02): the ground cracks in a circle the size of who is coming, with a faint coral glow growing
 * until they rise. Enemy things are drawn solid (no additive light), above the darkness.
 */
function drawMarks(g: Phaser.GameObjects.Graphics, world: World): void {
  const list = world.marks.active;
  for (let i = 0; i < list.length; i++) {
    const m = list[i] as (typeof list)[number];
    if (m.kind === 'burst') {
      // The embers swelling to the exact size of the blast.
      const bk = 1 - m.ttl / m.total;
      g.fillStyle(WARN_COLOR, 0.1 + 0.15 * bk);
      disc(g, m.x, m.y, m.radius);
      g.fillStyle(0xff8a3a, 0.2 + 0.3 * bk + 0.12 * Math.sin(world.time * (10 + 30 * bk)));
      disc(g, m.x, m.y, m.radius * bk);
      g.lineStyle(2.5, WARN_EDGE, 0.6 + 0.4 * bk);
      dashedArc(g, m.x, m.y, m.radius, 0, Math.PI * 2, (world.time * (30 + 50 * bk)) % (DASH * 2));
      continue;
    }
    if (m.kind !== 'spawn') continue;
    // Bone, not coral (CF-04): a rising grave calls the dead and hurts no one by itself.
    const k = 1 - m.ttl / m.total; // 0 -> 1
    const r = m.radius * (0.6 + 0.6 * k);
    // A thief rat's mark is gold (the coins it is after), not bone.
    const thief = (ENEMIES[m.enemy] as EnemyDef).flee !== undefined;
    g.fillStyle(thief ? THIEF_MARK : SUMMON_COLOR, 0.12 + 0.25 * k);
    oval(g, m.x, m.y + 2, r * 2.2, r * 1.1);
    g.lineStyle(2, INK, 0.7);
    for (let c = 0; c < 4; c++) {
      const a = c * 1.57 + m.x * 0.03;
      const cx = Math.cos(a) * r;
      const cy = Math.sin(a) * r * 0.5;
      g.lineBetween(m.x + cx * 0.2, m.y + 2 + cy * 0.2, m.x + cx, m.y + 2 + cy);
    }
    g.lineStyle(thief ? 2.5 : 1.5, thief ? THIEF_MARK : SUMMON_EDGE, 0.5 + 0.5 * k);
    ovalRing(g, m.x, m.y + 2, r * 2.2, r * 1.1);
    if ((ENEMIES[m.enemy] as EnemyDef).reassemble) tomb(g, m.x, m.y - 2, 12 + 6 * k, 0.7 + 0.3 * k);
  }
}

const THIEF_MARK = 0xffe14a;

/** A small gravestone standing on its patch of earth, `h` px tall (the summon marker of CF-04). */
function tomb(g: Phaser.GameObjects.Graphics, x: number, y: number, h: number, a: number): void {
  const w = h * 0.62;
  const top = y - h / 2 + w / 2;
  g.fillStyle(SUMMON_SHADE, 0.5 * a);
  oval(g, x, y + h / 2, w * 1.9, w * 0.7);
  g.fillStyle(INK, a);
  g.fillRect(x - w / 2 - 1.5, top, w + 3, y + h / 2 - top + 1);
  disc(g, x, top, w / 2 + 1.5);
  g.fillStyle(SUMMON_COLOR, a);
  g.fillRect(x - w / 2, top, w, y + h / 2 - top);
  disc(g, x, top, w / 2);
  g.lineStyle(1.5, INK, 0.7 * a);
  g.lineBetween(x, top - w * 0.2, x, top + w * 0.5);
  g.lineBetween(x - w * 0.22, top + w * 0.1, x + w * 0.22, top + w * 0.1);
}

/** Rallied enemies shown with their ember, per frame. */
const RALLY_SHOWN = 40;
const RALLY_EMBER = 0xff8a3a;

/**
 * The new enemies' tells: a thrower winding up lights its spear tip coral (FT-03); a banner's reach is a faint red
 * glow on the ground (FT-06); a rallied enemy carries a small ember over its head.
 */
function drawFoes(under: Phaser.GameObjects.Graphics, g: Phaser.GameObjects.Graphics, world: World): void {
  const list = world.enemies.active;
  const t = world.time;
  let rallied = 0;
  let piles = 0;
  for (let i = 0; i < list.length; i++) {
    const e = list[i] as Enemy;
    if (e.dead) continue;
    if (e.def.banner) {
      under.fillStyle(0xa02a1a, 0.08 + 0.03 * Math.sin(t * 3 + e.uid));
      disc(under, e.x, e.y, e.def.banner.radius);
      under.lineStyle(1.5, 0xc0402a, 0.3);
      ring(under, e.x, e.y, e.def.banner.radius);
    }
    // The Coveiro planting the shovel: the ring where the graves open fills up, in bone (it calls, it doesn't hurt).
    if (e.def.dig && e.stir > 0) {
      const k = 1 - e.stir / e.def.dig.windup;
      under.fillStyle(SUMMON_COLOR, 0.08 + 0.14 * k);
      disc(under, e.x, e.y, e.def.dig.radius + 14);
      under.lineStyle(4, INK, 0.5);
      ring(under, e.x, e.y, e.def.dig.radius);
      under.lineStyle(2, SUMMON_EDGE, 0.5 + 0.4 * k);
      dashedArc(under, e.x, e.y, e.def.dig.radius, 0, Math.PI * 2, (t * 40) % (DASH * 2));
      // The graves, where the core will raise them (aimX is the ring's start angle), growing from the first frame.
      for (let c = 0; c < e.def.dig.count; c++) {
        const a = e.aimX + (c * Math.PI * 2) / e.def.dig.count;
        tomb(
          under,
          e.x + Math.cos(a) * e.def.dig.radius,
          e.y + Math.sin(a) * e.def.dig.radius,
          12 + 4 * k,
          0.55 + 0.45 * k,
        );
      }
    }
    // The witch stirring: the reach of the brew lights up on the ground, filling until it goes off (FT-11).
    if (e.def.brew && e.stir > 0) {
      const k = 1 - e.stir / e.def.brew.windup;
      under.fillStyle(0xa8c030, 0.08 + 0.12 * k);
      disc(under, e.x, e.y, e.def.brew.radius * (0.4 + 0.6 * k));
      under.lineStyle(2, WARN_EDGE, 0.5 + 0.4 * k);
      dashedArc(under, e.x, e.y, e.def.brew.radius, 0, Math.PI * 2, (t * 40) % (DASH * 2));
    }
    if (e.def.move === 'shoot' && e.act === BossAct.Windup) {
      const sh = e.def.shoot as NonNullable<EnemyDef['shoot']>;
      const st = shotStyleOf(sh.radius, sh.speed);
      if (st !== SHOT_PLAIN) {
        // The orb condenses in the hand while the flakes close in (CF-05): the shot is announced before it flies.
        const k = 1 - Math.max(0, e.actT) / sh.windup;
        const hx = e.x + (world.player.x < e.x ? -e.def.radius * 0.7 : e.def.radius * 0.7);
        const hy = e.y - e.def.radius * 0.2;
        const orb = 1.5 + (sh.radius + 1) * k;
        g.fillStyle(st.halo, 0.3 + 0.2 * k);
        disc(g, hx, hy, orb + 4);
        g.fillStyle(INK, 1);
        disc(g, hx, hy, orb + 1.5);
        g.fillStyle(st.core, 1);
        disc(g, hx, hy, orb);
        for (let f = 0; f < 3; f++) {
          const a = t * 5 + f * 2.1;
          const d = 6 + 16 * (1 - k);
          star(g, hx + Math.cos(a) * d, hy + Math.sin(a) * d * 0.7, 3.5, st.halo, 0.9);
        }
      } else {
        const tipX = e.x + (world.player.x < e.x ? -6 : 6);
        const tipY = e.y - e.def.radius - 6;
        g.fillStyle(INK, 1);
        disc(g, tipX, tipY, 5);
        g.fillStyle(WARN_COLOR, 1);
        disc(g, tipX, tipY, 3.5 + Math.sin(t * 30) * 0.8);
      }
    }
    // The embers in an Ossada em Brasa's chest throb before it falls (CF-02).
    if (e.def.burst) {
      const beat = 0.5 + 0.5 * Math.sin(t * 6 + e.uid);
      const cy = e.y - e.def.radius * 0.1;
      g.fillStyle(0xff8a3a, 0.25 + 0.25 * beat);
      disc(g, e.x, cy, 4 + 2.5 * beat);
      g.fillStyle(0xfff0a0, 0.8);
      disc(g, e.x, cy, 1.6 + beat);
    }
    // A pile of bones counts down to standing up again (CF-01): a thin ring of bone that closes into ember.

    if (e.pile > 0 && piles < PILES_SHOWN) {
      piles++;
      drawPileClock(g, e, t);
    }
    if (e.rally > 0 && rallied < RALLY_SHOWN) {
      rallied++;
      const y = e.y - e.def.radius - 8 + Math.sin(t * 6 + e.uid) * 1.5;
      g.fillStyle(INK, 0.9);
      disc(g, e.x, y, 3.5);
      g.fillStyle(RALLY_EMBER, 1);
      disc(g, e.x, y, 2.4);
    }
  }
}

/**
 * The blast of an Ossada em Brasa (CF-02): a hot white disc running out to the exact radius in 0.08 s, short rays,
 * pale smoke for 0.6 s, and a scorch on the ground that fades in `BURST_SCORCH` s. Still, no shake.
 */
function drawBursts(
  ground: Phaser.GameObjects.Graphics,
  top: Phaser.GameObjects.Graphics,
  time: number,
  m: Moments,
): void {
  for (let i = 0; i < m.bursts.length; i++) {
    const b = m.bursts[i] as (typeof m.bursts)[number];
    const age = time - b.t;
    if (age < 0 || age > BURST_SCORCH) continue;
    const fade = 1 - age / BURST_SCORCH;
    ground.fillStyle(0x140c10, ZONE_FILL_MAX * fade);
    disc(ground, b.x, b.y, b.r * 0.9);
    ground.fillStyle(0xff6a20, 0.25 * Math.max(0, 1 - age / 0.7));
    disc(ground, b.x, b.y, b.r * 0.6);
    if (age < 0.3) {
      const k = age / 0.3;
      const hot = Math.min(1, age / 0.08);
      top.fillStyle(0xfff4d0, 0.8 * (1 - k) * (1 - k));
      disc(top, b.x, b.y, b.r * hot);
      top.lineStyle(3 * (1 - k) + 1, 0xffffff, 0.9 * (1 - k));
      ring(top, b.x, b.y, b.r * hot);
      top.lineStyle(3, 0xffb050, 0.9 * (1 - k));
      for (let a = 0; a < 8; a++) {
        const ang = a * (Math.PI / 4) + 0.3;
        const r0 = b.r * (0.4 + 0.5 * k);
        top.lineBetween(
          b.x + Math.cos(ang) * r0,
          b.y + Math.sin(ang) * r0,
          b.x + Math.cos(ang) * (r0 + 9),
          b.y + Math.sin(ang) * (r0 + 9),
        );
      }
    }
    if (age < 0.6) {
      const k = age / 0.6;
      top.fillStyle(0xd8d0e0, 0.26 * (1 - k));
      for (let c = 0; c < 3; c++)
        disc(top, b.x + (c - 1) * b.r * 0.4, b.y - b.r * (0.2 + 0.7 * k) - c * 3, b.r * (0.22 + 0.2 * k));
    }
  }
}

/** Piles of bones that show their clock per frame. */
const PILES_SHOWN = 24;
const PILE_EMBER = 0xffa040;

/**
 * The clock of a pile (CF-01): a thin bone ring around it closing in `reassemble.delay` s, turning to ember for the
 * last second while its eyes light up. Never coral: standing up hurts no one.
 */
function drawPileClock(g: Phaser.GameObjects.Graphics, e: Enemy, t: number): void {
  const re = e.def.reassemble as NonNullable<EnemyDef['reassemble']>;
  const left = e.pile / re.delay; // 1 -> 0
  const last = e.pile < 1;
  const shake = e.pile < PILE_SHAKE ? Math.sin(t * 60 + e.uid) * 1.5 : 0;
  const x = e.x + shake;
  const r = e.def.radius + 15;
  g.lineStyle(6, INK, 0.85);
  ring(g, x, e.y, r);
  g.lineStyle(3.5, last ? PILE_EMBER : SUMMON_EDGE, 1);
  arcLine(g, x, e.y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left);
  if (last) {
    const glow = 0.5 + 0.5 * Math.sin(t * 24 + e.uid);
    g.fillStyle(PILE_EMBER, 0.55 + 0.4 * glow);
    disc(g, x - 3, e.y - 3, 1.8);
    disc(g, x + 3, e.y - 3, 1.8);
  }
}
/** The last seconds of a pile it trembles, and bones fly back to it (GameScene reads the same). */
export const PILE_SHAKE = 0.6;

/** How an enemy's shot is drawn (CF-05): the plain coral shot, or one in its shooter's own colour. */
export interface ShotStyle {
  core: number;
  halo: number;
  /** Frost flakes trailing behind, and a faint light. */
  flakes: boolean;
}
export const SHOT_PLAIN: ShotStyle = { core: 0xffd8c8, halo: WARN_COLOR, flakes: false };
const COLD_SHOT: ShotStyle = { core: 0xffffff, halo: 0x7ac8ff, flakes: true };
/** Shooters with their own colour. A shot does not name its shooter, so it is matched by radius and speed. */
const SHOT_STYLE: Partial<Record<EnemyId, ShotStyle>> = { coldSpirit: COLD_SHOT };
const SHOT_KEYS: { radius: number; speed: number; style: ShotStyle }[] = [];
for (const id of Object.keys(SHOT_STYLE) as EnemyId[]) {
  const sh = (ENEMIES[id] as EnemyDef).shoot;
  if (sh) SHOT_KEYS.push({ radius: sh.radius, speed: sh.speed, style: SHOT_STYLE[id] as ShotStyle });
}
export function shotStyleOf(radius: number, speed: number): ShotStyle {
  for (let i = 0; i < SHOT_KEYS.length; i++) {
    const k = SHOT_KEYS[i] as (typeof SHOT_KEYS)[number];
    if (k.radius === radius && Math.abs(k.speed - speed) < 1) return k.style;
  }
  return SHOT_PLAIN;
}
export const shotStyle = (s: EnemyShot): ShotStyle => shotStyleOf(s.radius, Math.hypot(s.vx, s.vy));

/** Enemy shots (FT-03): a pale core with a dark outline and a short trail behind, in its shooter's colour. */
function drawEnemyShots(g: Phaser.GameObjects.Graphics, world: World): void {
  const list = world.enemyShots.active;
  for (let i = 0; i < list.length; i++) {
    const s = list[i] as (typeof list)[number];
    const sp = Math.hypot(s.vx, s.vy) || 1;
    const tail = Math.min(22, s.age * sp);
    const st = shotStyleOf(s.radius, sp);
    const bx = s.x - (s.vx / sp) * tail;
    const by = s.y - (s.vy / sp) * tail;
    g.lineStyle(s.radius * 1.4, st.halo, 0.45);
    g.lineBetween(s.x, s.y, bx, by);
    if (st.flakes) {
      // Flakes lagging behind, drifting sideways, and a soft halo.
      for (let f = 1; f <= 3; f++) {
        const d = f * 8 + Math.sin(world.time * 9 + f) * 2;
        const side = Math.sin(world.time * 7 + f * 2 + s.x * 0.1) * 4;
        star(
          g,
          s.x - (s.vx / sp) * d - (s.vy / sp) * side,
          s.y - (s.vy / sp) * d + (s.vx / sp) * side,
          6 - f * 1,
          st.halo,
          0.85,
        );
      }
      g.fillStyle(st.halo, 0.4);
      disc(g, s.x, s.y, s.radius + 8);
      g.fillStyle(st.halo, 0.25);
      disc(g, s.x, s.y, s.radius + 13);
    }
    g.fillStyle(INK, 1);
    disc(g, s.x, s.y, s.radius + 2);
    g.fillStyle(st.core, 1);
    disc(g, s.x, s.y, s.radius);
  }
}

const PUSH_SHOWN = 40;
/** A push faster than this (px/s) leaves dust (a 600 push stays above it ~0.13 s): slower ones read as walking anyway. */
const PUSH_DUST = 150;
const DUST = 0xcbbba0;

/**
 * A pushed enemy slides back on its heels: two short dust streaks on the ground behind it, along the push, longer and
 * brighter the harder it was thrown (NF-04), so a push reads even on a still frame.
 */
function drawPushes(g: Phaser.GameObjects.Graphics, world: World): void {
  const list = world.enemies.active;
  let n = 0;
  for (let i = 0; i < list.length && n < PUSH_SHOWN; i++) {
    const e = list[i] as Enemy;
    const kb = Math.hypot(e.kbx, e.kby);
    if (kb < PUSH_DUST || e.def.boss) continue;
    n++;
    const ux = e.kbx / kb;
    const uy = e.kby / kb;
    const r = e.def.radius;
    const k = Math.min(1, kb / 700);
    const len = 10 + 26 * k;
    // The heels: the side of the enemy the push came from, at its feet.
    const hx = e.x - ux * r * 0.5;
    const hy = e.y + r * 0.55 - uy * r * 0.3;
    for (let side = -1; side <= 1; side += 2) {
      const ox = -uy * r * 0.35 * side;
      const oy = ux * r * 0.35 * side;
      g.lineStyle(3 + 2 * k, DUST, 0.25 + 0.35 * k);
      g.lineBetween(hx + ox, hy + oy, hx + ox - ux * len, hy + oy - uy * len);
    }
  }
}

/** Common chargers (Encapuzado, Rato, Goblin) winding up: a coral arrow on the ground shows where they will run. */
function drawCharges(g: Phaser.GameObjects.Graphics, world: World): void {
  const list = world.enemies.active;
  const time = world.time;
  for (let i = 0; i < list.length; i++) {
    const e = list[i] as Enemy;
    if (e.act !== BossAct.Windup) continue;
    if (e.def.move === 'leap') {
      drawLeapMark(g, e, time);
      continue;
    }
    if (e.def.move !== 'charge') continue;
    const c = e.def.charge ?? CHARGE;
    // How far a dash runs (world px per second of base speed): the lane on the ground is exactly where it passes.
    const reach = c.speedMult * c.dash * world.stage.mult.speed;
    const k = 1 - Math.max(0, e.actT) / c.windup; // 0 -> 1 as the dash comes
    const ux = e.aimX;
    const uy = e.aimY;
    const w = e.def.radius * 2;
    const len = e.def.speed * reach + e.def.radius;
    // A lane as wide as the body and as long as the dash: translucent, filling up toward its end as the dash
    // comes, with a light dashed edge (FT-17 / AR-03).
    const vx = (-uy * w) / 2;
    const vy = (ux * w) / 2;
    const ex = e.x + ux * len;
    const ey = e.y + uy * len;
    g.fillStyle(WARN_COLOR, 0.1 + 0.1 * k);
    quad(g, e.x + vx, e.y + vy, ex + vx, ey + vy, ex - vx, ey - vy, e.x - vx, e.y - vy);
    const fx = e.x + ux * len * k;
    const fy = e.y + uy * len * k;
    g.fillStyle(WARN_COLOR, 0.28);
    quad(g, e.x + vx, e.y + vy, fx + vx, fy + vy, fx - vx, fy - vy, e.x - vx, e.y - vy);
    g.lineStyle(2, WARN_EDGE, 0.5 + 0.4 * k);
    const march = (time * (30 + 50 * k)) % (DASH * 2);
    dashedLine(g, e.x + vx, e.y + vy, ex + vx, ey + vy, march);
    dashedLine(g, e.x - vx, e.y - vy, ex - vx, ey - vy, march);
    dashedLine(g, ex + vx, ey + vy, ex - vx, ey - vy, march);
  }
}

/**
 * A leap's landing (FT-04), from the crouch until it lands: a coral circle on the marked spot filling from the
 * middle out, with the dashed edge and the leaper's shadow growing in it. (Drawn for the crouch here and for the
 * flight by `drawLeaps`.)
 */
function drawLeapMark(g: Phaser.GameObjects.Graphics, e: Enemy, time: number): void {
  const lp = e.def.leap;
  if (!lp) return;
  const total = lp.windup + lp.air;
  const left = e.act === BossAct.Windup ? e.actT + lp.air : e.actT;
  const k = Math.min(1, Math.max(0, 1 - left / total));
  const r = lp.radius;
  g.fillStyle(WARN_COLOR, 0.12);
  disc(g, e.aimX, e.aimY, r);
  g.fillStyle(WARN_COLOR, 0.3);
  disc(g, e.aimX, e.aimY, r * k);
  g.lineStyle(2, WARN_EDGE, 0.5 + 0.4 * k);
  // The rim and two inner rings of pixel dashes, the inner ones turning the other way (a landing target).
  dashedArc(g, e.aimX, e.aimY, r, 0, TAU_FX, (time * 40) % (DASH * 2));
  g.lineStyle(2, WARN_EDGE, 0.3 + 0.3 * k);
  dashedArc(g, e.aimX, e.aimY, r * 0.62, 0, TAU_FX, (-time * 30) % (DASH * 2));
  dashedArc(g, e.aimX, e.aimY, r * 0.3, 0, TAU_FX, (time * 20) % (DASH * 2));
  g.fillStyle(INK, 0.15 + 0.3 * k);
  oval(g, e.aimX, e.aimY + 2, e.def.radius * 2 * (0.4 + 0.6 * k), e.def.radius * (0.4 + 0.6 * k));
}

/** Leapers in the air: their landing mark keeps filling until they land. */
function drawLeaps(g: Phaser.GameObjects.Graphics, world: World): void {
  const list = world.enemies.active;
  for (let i = 0; i < list.length; i++) {
    const e = list[i] as Enemy;
    if (e.def.move === 'leap' && e.act === BossAct.Active) drawLeapMark(g, e, world.time);
  }
}

const TAU_FX = Math.PI * 2;

/** A filled four-sided shape (no allocation). */
function quad(
  g: Phaser.GameObjects.Graphics,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
): void {
  g.fillTriangle(x0, y0, x1, y1, x2, y2);
  g.fillTriangle(x0, y0, x2, y2, x3, y3);
}

/** Chest, Badalada and Sopro de Geada: shapes that say what happened, instead of a full-screen flash. */
function drawMoments(
  g: Phaser.GameObjects.Graphics,
  top: Phaser.GameObjects.Graphics,
  world: World,
  m: Moments,
  hero: number,
): void {
  const p = world.player;
  const t = world.time;
  // Half the view's diagonal: a ring this big has reached every edge of the screen.
  const edge = Math.hypot(world.view.w, world.view.h) / 2;
  const chest = t - m.chest;
  if (chest < CHEST_SHOW) {
    // Rays of light turning behind the hero (two crossed sets for an Elo), a ring in the hero's color and,
    // for an Elo, stars flying out.
    const k = chest / CHEST_SHOW;
    const fade = Math.min(1, chest * 8) * (1 - k);
    const sets = m.elo ? 2 : 1;
    for (let s = 0; s < sets; s++) {
      const n = 6;
      const len = (m.elo ? 120 : 95) * (0.6 + 0.4 * Math.min(1, chest * 3));
      const spin = (s ? -0.9 : 1.2) * t + s * 0.5;
      const half = 0.13;
      g.fillStyle(s ? hero : ITEM_GLINT, 0.22 * fade);
      for (let i = 0; i < n; i++) {
        const a = spin + (i * Math.PI * 2) / n;
        g.fillTriangle(
          p.x,
          p.y,
          p.x + Math.cos(a - half) * len,
          p.y + Math.sin(a - half) * len,
          p.x + Math.cos(a + half) * len,
          p.y + Math.sin(a + half) * len,
        );
      }
    }
    g.fillStyle(0xffffff, 0.25 * fade);
    disc(g, p.x, p.y, 26);
    const rk = Math.min(1, chest / 0.5);
    if (rk < 1) {
      top.lineStyle(5 * (1 - rk) + 1, hero, 1 - rk);
      ring(top, p.x, p.y, 18 + 80 * (1 - (1 - rk) ** 3));
      top.lineStyle(2, 0xffffff, 0.8 * (1 - rk));
      ring(top, p.x, p.y, 14 + 70 * (1 - (1 - rk) ** 3));
    }
    if (m.elo && chest < 0.8) {
      const sk = chest / 0.8;
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 + 0.4;
        const d = 20 + 90 * (1 - (1 - sk) ** 2);
        star(
          top,
          p.x + Math.cos(a) * d,
          p.y + Math.sin(a) * d,
          7 * (1 - sk) + 2,
          i % 2 ? hero : 0xffffff,
          1 - sk,
        );
      }
    }
  }
  const bomb = t - m.bomb;
  if (bomb < 0.45) {
    // Badalada: a golden ring of sound from the hero to the edges of the screen (it hits everything on it).
    for (let i = 0; i < 2; i++) {
      const bk = Math.min(1, Math.max(0, (bomb - i * 0.07) / 0.32));
      if (bk <= 0) continue;
      const r = 20 + (edge - 20) * (1 - (1 - bk) ** 2);
      const a = bomb < 0.32 ? 1 : 1 - (bomb - 0.32) / 0.13;
      top.lineStyle(i ? 3 : 7, i ? 0xffffff : ITEM_GLINT, (i ? 0.6 : 0.85) * a);
      ring(top, p.x, p.y, r);
      if (!i) {
        g.lineStyle(26, ITEM_GLINT, 0.12 * a);
        ring(g, p.x, p.y, r - 10);
      }
    }
  }
  const frost = t - m.frost;
  if (frost < 0.5) {
    // Sopro de Geada: a wave of frost rolling out to the edges, with ice shards riding on it.
    const fk = Math.min(1, frost / 0.4);
    const r = 20 + (edge - 20) * (1 - (1 - fk) ** 2);
    const a = frost < 0.4 ? 1 : 1 - (frost - 0.4) / 0.1;
    g.lineStyle(30, ICE, 0.18 * a);
    ring(g, p.x, p.y, r - 14);
    top.lineStyle(4, 0xffffff, 0.85 * a);
    ring(top, p.x, p.y, r);
    for (let i = 0; i < 12; i++) {
      const sa = (i * Math.PI) / 6 + 0.2;
      shard(top, p.x + Math.cos(sa) * r, p.y + Math.sin(sa) * r, sa, 7, a);
    }
  }
  if (world.freeze > 0) {
    // Frost creeping on the edges of the screen while the world is frozen (blinking out in the last second).
    const fa = world.freeze < 1 ? 0.5 + 0.5 * Math.sin(t * 20) : 1;
    const vw = world.view.w / 2;
    const vh = world.view.h / 2;
    const th = 10;
    top.fillStyle(ICE, 0.22 * fa);
    top.fillRect(p.x - vw, p.y - vh, vw * 2, th).fillRect(p.x - vw, p.y + vh - th, vw * 2, th);
    top
      .fillRect(p.x - vw, p.y - vh + th, th, vh * 2 - th * 2)
      .fillRect(p.x + vw - th, p.y - vh + th, th, vh * 2 - th * 2);
    // Icicles along the top edge.
    top.fillStyle(0xffffff, 0.35 * fa);
    for (let x = -vw + 12; x < vw; x += 28) {
      const h = 8 + ((((x * 7919) % 9) + 9) % 9);
      top.fillTriangle(p.x + x - 5, p.y - vh + th, p.x + x + 5, p.y - vh + th, p.x + x, p.y - vh + th + h);
    }
  }
}

/**
 * The Lobo Velho's ice (FT-08), on the ground: while it forms, the danger colour filling from the centre with a
 * marching edge; formed, a frosted white-lilac patch with cracks and a faint cold rim, the exact size of the slow.
 */
function drawIce(g: Phaser.GameObjects.Graphics, world: World): void {
  const list = world.marks.active;
  for (let i = 0; i < list.length; i++) {
    const m = list[i] as (typeof list)[number];
    if (m.kind !== 'ice') continue;
    const r = m.radius;
    if (m.ttl > 0) {
      const k = 1 - m.ttl / m.total; // 0 -> 1
      g.fillStyle(WARN_COLOR, 0.12);
      disc(g, m.x, m.y, r);
      g.fillStyle(ICE, 0.18 + 0.3 * k);
      disc(g, m.x, m.y, r * k);
      g.lineStyle(2.5, WARN_EDGE, 0.6 + 0.4 * k);
      dashedArc(g, m.x, m.y, r, 0, Math.PI * 2, (world.time * (30 + 50 * k)) % (DASH * 2));
      continue;
    }
    g.fillStyle(ICE, 0.3);
    disc(g, m.x, m.y, r);
    g.fillStyle(0xffffff, 0.12);
    disc(g, m.x - r * 0.25, m.y - r * 0.25, r * 0.45);
    // Cracks: fixed by the patch's place, so they never crawl.
    g.lineStyle(1.5, 0x8a84a8, 0.6);
    for (let c = 0; c < 5; c++) {
      const a = c * 1.26 + (m.x + m.y) * 0.01;
      const l = r * (0.55 + 0.35 * (((c * 37 + Math.abs(m.y | 0)) % 7) / 7));
      const mx = m.x + Math.cos(a) * l * 0.5;
      const my = m.y + Math.sin(a) * l * 0.5;
      g.lineBetween(m.x, m.y, mx + Math.sin(a) * 4, my - Math.cos(a) * 4);
      g.lineBetween(mx + Math.sin(a) * 4, my - Math.cos(a) * 4, m.x + Math.cos(a) * l, m.y + Math.sin(a) * l);
    }
    const glow = 0.45 + 0.15 * Math.sin(world.time * 2 + m.x);
    g.lineStyle(2, ICE, glow);
    ring(g, m.x, m.y, r);
  }
}

/** Patch colours (FT-11): poison is a sick acid green-yellow, tar is dark amber; neither is Teo's green nor a gem's cyan. */
const POISON = 0xa8c030;
const TAR = 0x6a4a1a;
const WEB = 0xe4e4ec;
const SLIME = 0x3ab070;

/**
 * Patches an enemy leaves on the ground (poison, tar). In flight a potion arcs from the thrower to the marked spot
 * (the danger colour filling, the edge marching); landed, poison bubbles and tar shines, the exact size of the effect.
 */
function drawPatches(g: Phaser.GameObjects.Graphics, world: World): void {
  const list = world.marks.active;
  for (let i = 0; i < list.length; i++) {
    const m = list[i] as (typeof list)[number];
    if (m.kind !== 'poison' && m.kind !== 'tar' && m.kind !== 'web' && m.kind !== 'slime') continue;
    const r = m.radius;
    const color = m.kind === 'poison' ? POISON : m.kind === 'web' ? WEB : m.kind === 'slime' ? SLIME : TAR;
    if (m.kind === 'slime') continue;
    if (m.ttl > 0) {
      const k = 1 - m.ttl / m.total; // 0 -> 1
      g.fillStyle(WARN_COLOR, 0.1 + 0.2 * k);
      disc(g, m.x, m.y, r);
      g.lineStyle(2.5, WARN_EDGE, 0.6 + 0.4 * k);
      dashedArc(g, m.x, m.y, r, 0, Math.PI * 2, (world.time * (30 + 50 * k)) % (DASH * 2));
      if (m.kind === 'web') continue;
      // The flask in its arc.
      const fx = m.fromX + (m.x - m.fromX) * k;
      const fy = m.fromY + (m.y - m.fromY) * k - Math.sin(Math.PI * k) * 70;
      g.fillStyle(INK, 1);
      disc(g, fx, fy, 6.5);
      g.fillStyle(color === TAR ? 0xb07020 : POISON, 1);
      disc(g, fx, fy, 4.5);
      continue;
    }
    const fade = Math.min(1, m.life / 0.6);
    if (m.kind === 'web') {
      // Grey-white spokes and rings, a faint sheen: the exact size of the slow.
      g.fillStyle(WEB, 0.22 * fade);
      disc(g, m.x, m.y, r);
      g.lineStyle(1.5, WEB, 0.8 * fade);
      for (let s = 0; s < 8; s++) {
        const a = (s * Math.PI) / 4 + m.x * 0.01;
        g.lineBetween(m.x, m.y, m.x + Math.cos(a) * r, m.y + Math.sin(a) * r);
      }
      for (let k = 1; k <= 3; k++) ring(g, m.x, m.y, (r * k) / 3);
      continue;
    }
    g.fillStyle(color, (m.kind === 'tar' ? 0.7 : 0.5) * fade);
    disc(g, m.x, m.y, r);
    g.lineStyle(2, INK, 0.6 * fade);
    ring(g, m.x, m.y, r);
    if (m.kind === 'tar') {
      g.fillStyle(0xb07020, 0.3 * fade);
      disc(g, m.x - r * 0.3, m.y - r * 0.3, r * 0.35);
    } else {
      // Bubbles that rise and burst, fixed to the patch.
      for (let b = 0; b < 4; b++) {
        const ph = (world.time * 0.9 + b * 0.27 + m.x * 0.01) % 1;
        const bx = m.x + Math.cos(b * 2.3 + m.y) * r * 0.55;
        const by = m.y + Math.sin(b * 1.7 + m.x) * r * 0.4 - ph * 8;
        g.fillStyle(0xe8f0a0, (1 - ph) * 0.8 * fade);
        disc(g, bx, by, 2 + ph * 2);
      }
    }
  }
}

const SLIME_N = 16;
const BLOB_X = new Float32Array(SLIME_N);
const BLOB_Y = new Float32Array(SLIME_N);
const SLIME_RIM = 0x1b5238;
const SLIME_BODY = 0x35a56a;
const SLIME_WET = 0xb8ffd8;

/** A fan-filled organic blob: its edge wobbles between 0.82 and 1.0 of `r` (never past the true radius). */
function blob(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  r: number,
  seed: number,
  time: number,
): void {
  for (let i = 0; i < SLIME_N; i++) {
    const a = (i / SLIME_N) * Math.PI * 2;
    const w = 0.91 + 0.06 * Math.sin(seed * 1.3 + i * 2.1) + 0.03 * Math.sin(seed + i * 3.7 + time * 1.2);
    BLOB_X[i] = x + Math.cos(a) * r * w;
    BLOB_Y[i] = y + Math.sin(a) * r * w * 0.92;
  }
  for (let i = 0; i < SLIME_N; i++) {
    const j = (i + 1) % SLIME_N;
    g.fillTriangle(x, y, BLOB_X[i] as number, BLOB_Y[i] as number, BLOB_X[j] as number, BLOB_Y[j] as number);
  }
}

/**
 * Slime on the ground (the Gosma's slow): one clinging puddle with an irregular edge that fuses with its neighbours.
 * Three passes over all patches (rims, then bodies, then shine) so overlaps do not pile up transparency: wet gloss,
 * bubbles that swell and pop with a few droplets, all inside the exact slow radius.
 */
function drawSlime(g: Phaser.GameObjects.Graphics, world: World): void {
  const list = world.marks.active;
  const t = world.time;
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < list.length; i++) {
      const m = list[i] as (typeof list)[number];
      if (m.kind !== 'slime') continue;
      const r = m.radius;
      if (m.ttl > 0) {
        // The flask is still in the air: the warning (pass 0 only).
        if (pass > 0) continue;
        const k = 1 - m.ttl / m.total;
        g.fillStyle(WARN_COLOR, 0.1 + 0.2 * k);
        disc(g, m.x, m.y, r);
        g.lineStyle(2.5, WARN_EDGE, 0.6 + 0.4 * k);
        dashedArc(g, m.x, m.y, r, 0, Math.PI * 2, (t * (30 + 50 * k)) % (DASH * 2));
        const fx = m.fromX + (m.x - m.fromX) * k;
        const fy = m.fromY + (m.y - m.fromY) * k - Math.sin(Math.PI * k) * 70;
        g.fillStyle(INK, 1);
        disc(g, fx, fy, 6.5);
        g.fillStyle(SLIME, 1);
        disc(g, fx, fy, 4.5);
        continue;
      }
      const fade = Math.min(1, m.life / 0.6);
      const seed = m.x * 0.013 + m.y * 0.021;
      if (pass === 0) {
        g.fillStyle(SLIME_RIM, 0.92 * fade);
        blob(g, m.x, m.y, r, seed, t);
        // Lobes that bulge out and fuse with neighbours.
        for (let b = 0; b < 3; b++) {
          const a = seed * 7 + b * 2.1;
          disc(g, m.x + Math.cos(a) * r * 0.78, m.y + Math.sin(a) * r * 0.72, r * 0.2);
        }
      } else if (pass === 1) {
        g.fillStyle(SLIME_BODY, 0.95 * fade);
        blob(g, m.x, m.y, r * 0.88, seed + 1, t);
        g.fillStyle(0x2a8a58, 0.8 * fade);
        blob(g, m.x + r * 0.08, m.y + r * 0.1, r * 0.55, seed + 2, t);
      } else {
        // Wet gloss: a pale crescent and two glints.
        g.fillStyle(SLIME_WET, 0.35 * fade);
        oval(g, m.x - r * 0.28, m.y - r * 0.32, r * 0.34, r * 0.12);
        g.fillStyle(0xffffff, 0.6 * fade);
        disc(g, m.x - r * 0.42, m.y - r * 0.34, 1.6);
        disc(g, m.x + r * 0.3, m.y + r * 0.18, 1.2);
        // Bubbles that swell and pop, each with a few droplets.
        for (let b = 0; b < 3; b++) {
          const ph = (t * 0.55 + b * 0.33 + seed) % 1;
          const a = b * 2.4 + Math.floor(t * 0.55 + b * 0.33 + seed) * 1.7;
          const d = r * (0.2 + 0.45 * ((b * 0.37 + Math.floor(t * 0.55 + seed)) % 1));
          const bx = m.x + Math.cos(a) * d;
          const by = m.y + Math.sin(a) * d * 0.8;
          if (ph < 0.8) {
            const br = 1.5 + 4 * (ph / 0.8);
            g.fillStyle(SLIME_WET, 0.45 * fade);
            disc(g, bx, by, br);
            g.lineStyle(1, 0xffffff, 0.7 * fade);
            ring(g, bx, by, br);
            g.fillStyle(0xffffff, 0.8 * fade);
            disc(g, bx - br * 0.35, by - br * 0.35, br * 0.25);
          } else {
            // The pop: a ring and droplets flung out.
            const pk = (ph - 0.8) / 0.2;
            g.lineStyle(1.5, SLIME_WET, 0.8 * (1 - pk) * fade);
            ring(g, bx, by, 5.5 + 5 * pk);
            g.fillStyle(SLIME_WET, 0.8 * (1 - pk) * fade);
            for (let q = 0; q < 4; q++) {
              const qa = q * 1.57 + b;
              disc(g, bx + Math.cos(qa) * (4 + 7 * pk), by + Math.sin(qa) * (3 + 5 * pk) - 4 * pk, 1.4);
            }
          }
        }
      }
    }
  }
}

/** The arena's walls (FT-08): a row of tall ice crystals across the road at each end, over the crowd. */
function drawArenaWalls(g: Phaser.GameObjects.Graphics, world: World): void {
  const a = world.arena;
  if (!a.on) return;
  const layout = world.stage.layout;
  const half = layout.kind === 'corridor' ? layout.width / 2 + 40 : world.view.w / 2;
  const cx = layout.kind === 'corridor' ? 0 : world.player.x;
  for (let end = 0; end < 2; end++) {
    const y = end === 0 ? a.y0 : a.y1;
    g.fillStyle(ICE, 0.25);
    g.fillRect(cx - half, y - 6, half * 2, 12);
    for (let x = -half + 8; x < half; x += 18) {
      const h = 16 + ((((x * 7919) % 13) + 13) % 13);
      shard(g, cx + x, y - h * 0.4, -Math.PI / 2 + (((x * 31) % 5) - 2) * 0.08, h, 0.85);
    }
  }
}

/** An ice shard: a small white-lilac diamond pointing along `a`. */
function shard(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  a: number,
  r: number,
  alpha: number,
): void {
  const ux = Math.cos(a) * r;
  const uy = Math.sin(a) * r;
  const vx = -uy * 0.35;
  const vy = ux * 0.35;
  g.fillStyle(ICE, alpha).fillTriangle(x - ux, y - uy, x + vx, y + vy, x + ux, y + uy);
  g.fillStyle(0xffffff, alpha).fillTriangle(x - ux, y - uy, x - vx, y - vy, x + ux, y + uy);
}

/** The telegraph of a boss ability: where it will hit, filling up during the windup. */
function drawBossWarning(
  g: Phaser.GameObjects.Graphics,
  top: Phaser.GameObjects.Graphics,
  e: Enemy,
  time: number,
): void {
  const ab = bossAbility(e);
  if (!ab || e.act === BossAct.Idle) return;
  const aim = Math.atan2(e.aimY, e.aimX);
  if (e.act === BossAct.Active) {
    // The cleave landing: the same sweep as the hero's blades, in the danger colors.
    if (ab.kind === 'lunge') {
      // Speed lines streaming behind the running wolf.
      const r = e.def.radius;
      top.lineStyle(3, 0xffffff, 0.6);
      for (let i = -1; i <= 1; i++) {
        const sx = e.x - e.aimX * (r + 4) - e.aimY * i * r * 0.5;
        const sy = e.y - e.aimY * (r + 4) + e.aimX * i * r * 0.5;
        const l = 26 + 14 * (1 - Math.abs(i)) + 8 * Math.sin(time * 30 + i);
        top.lineBetween(sx, sy, sx - e.aimX * l, sy - e.aimY * l);
      }
    }
    if (ab.kind === 'cleave' && (ab.arc ?? 1) >= TAU_FX - 0.01) {
      drawToll(g, top, e, ab.range, 1 - Math.max(0, e.actT) / CLEAVE_SHOW);
    } else if (ab.kind === 'cleave') {
      const half = (ab.arc ?? 1) / 2;
      const t = 1 - Math.max(0, e.actT) / CLEAVE_SHOW;
      drawSwing(top, g, e.x, e.y, ab.range, aim - half, aim + half, t, CLEAVE_STYLE);
    }
    return;
  }
  const k = 1 - Math.max(0, e.actT) / ab.windup; // 0 -> 1 as the hit comes
  const fill = 0.1 + 0.16 * k;
  // The dashes march along the edge, faster as the hit comes.
  const march = (time * (30 + 50 * k)) % (DASH * 2);
  const edgeA = 0.6 + 0.4 * k;
  switch (ab.kind) {
    case 'cleave': {
      if ((ab.arc ?? 1) >= TAU_FX - 0.01) {
        // The Dobre Fúnebre (CF-03): a full ring, so no radial lines. Rings close in on the bell like sound
        // gathering, then three pulses in the last 0.6 s.
        g.fillStyle(WARN_COLOR, fill);
        disc(g, e.x, e.y, ab.range);
        for (let i = 0; i < 3; i++) {
          const q = (i / 3 + time * 1.2) % 1;
          g.lineStyle(4, WARN_COLOR, 0.15 + 0.4 * q);
          ring(g, e.x, e.y, ab.range * (1 - q) + e.def.radius * q);
        }
        g.fillStyle(WARN_COLOR, 0.3);
        disc(g, e.x, e.y, ab.range * k);
        const left = (1 - k) * ab.windup;
        if (left < 0.6) {
          const pulse = Math.max(0, Math.sin((left / 0.6) * Math.PI * 6)) ** 2;
          g.lineStyle(5, 0xffffff, 0.85 * pulse);
          ring(g, e.x, e.y, ab.range);
          g.fillStyle(0xffffff, 0.18 * pulse);
          disc(g, e.x, e.y, ab.range);
        }
        g.lineStyle(2.5, WARN_EDGE, edgeA);
        dashedArc(g, e.x, e.y, ab.range, 0, TAU_FX, march);
        break;
      }
      const half = (ab.arc ?? 1) / 2;
      const a0 = aim - half;
      const a1 = aim + half;
      g.fillStyle(WARN_COLOR, fill);
      band(g, e.x, e.y, 0, ab.range, a0, a1);
      // Stripes: bands rolling out toward the edge.
      g.lineStyle(5, WARN_COLOR, 0.3);
      for (let i = 0; i < 4; i++) {
        const r = ab.range * (((i + time * 1.5) % 4) / 4);
        if (r > 8) arcLine(g, e.x, e.y, r, a0, a1);
      }
      // An inner slice grows to the edge: when it touches, the sword falls.
      g.fillStyle(WARN_COLOR, 0.32);
      band(g, e.x, e.y, 0, ab.range * k, a0, a1);
      g.lineStyle(2.5, WARN_EDGE, edgeA);
      dashedArc(g, e.x, e.y, ab.range, a0, a1, march);
      dashedLine(g, e.x, e.y, e.x + Math.cos(a0) * ab.range, e.y + Math.sin(a0) * ab.range, march);
      dashedLine(g, e.x, e.y, e.x + Math.cos(a1) * ab.range, e.y + Math.sin(a1) * ab.range, march);
      break;
    }
    case 'lunge': {
      const w = e.def.radius * 2;
      const len = ab.range + e.def.radius;
      const ux = e.aimX;
      const uy = e.aimY;
      const vx = (-uy * w) / 2;
      const vy = (ux * w) / 2;
      const ex = e.x + ux * len;
      const ey = e.y + uy * len;
      g.fillStyle(WARN_COLOR, fill);
      g.beginPath();
      g.moveTo(e.x + vx, e.y + vy);
      g.lineTo(ex + vx, ey + vy);
      g.lineTo(ex - vx, ey - vy);
      g.lineTo(e.x - vx, e.y - vy);
      g.closePath();
      g.fillPath();
      // Stripes as chevrons pointing the way it will run, rolling forward.
      g.lineStyle(5, WARN_COLOR, 0.35);
      const step = w * 0.9;
      const n = Math.floor(len / step);
      const roll = ((time * 2) % 1) * step;
      for (let i = 0; i < n; i++) {
        const d = i * step + roll + w * 0.4;
        if (d > len - w * 0.2) continue;
        const cx = e.x + ux * d;
        const cy = e.y + uy * d;
        const bx = cx - ux * w * 0.35;
        const by = cy - uy * w * 0.35;
        g.lineBetween(bx + vx * 0.7, by + vy * 0.7, cx, cy);
        g.lineBetween(bx - vx * 0.7, by - vy * 0.7, cx, cy);
      }
      g.lineStyle(2.5, WARN_EDGE, edgeA);
      dashedLine(g, e.x + vx, e.y + vy, ex + vx, ey + vy, march);
      dashedLine(g, e.x - vx, e.y - vy, ex - vx, ey - vy, march);
      dashedLine(g, ex + vx, ey + vy, ex - vx, ey - vy, march);
      g.fillStyle(WARN_COLOR, 0.45);
      disc(g, e.x + ux * len * k, e.y + uy * len * k, w * 0.35);
      break;
    }
    case 'frost': {
      // The howl: cold rings rolling out from the wolf (the patches fill on the ground, drawIce).
      for (let i = 0; i < 3; i++) {
        const r = e.def.radius + 90 * ((i / 3 + time * 1.2) % 1);
        g.lineStyle(3, ICE, 0.6 * (1 - (r - e.def.radius) / 90));
        ring(g, e.x, e.y, r);
      }
      break;
    }
    case 'eggs':
    case 'toll': {
      // Bone, not coral (CF-04): the bell and the eggs call, they do not hurt. Rings of sound leave the bell on each
      // of its two beats, and the graves are there from the first frame, growing.
      const r = ab.range * (0.4 + 0.6 * k);
      g.fillStyle(SUMMON_COLOR, fill * 0.8);
      disc(g, e.x, e.y, r);
      g.lineStyle(4.5, INK, 0.45);
      ring(g, e.x, e.y, r);
      g.lineStyle(2.5, SUMMON_EDGE, edgeA);
      dashedArc(g, e.x, e.y, r, 0, Math.PI * 2, march);
      if (ab.kind === 'toll')
        for (let b = 0; b < 2; b++) {
          const q = (k - b * 0.45) / 0.45;
          if (q <= 0 || q >= 1) continue;
          g.lineStyle(5 * (1 - q) + 1, SUMMON_EDGE, 0.8 * (1 - q));
          ring(g, e.x, e.y - e.def.radius * 0.4, e.def.radius + ab.range * 1.1 * q);
        }
      const n = ab.count ?? 6;
      for (let i = 0; i < n; i++) {
        const a = (i * Math.PI * 2) / n;
        const mx = e.x + Math.cos(a) * ab.range;
        const my = e.y + Math.sin(a) * ab.range;
        if (ab.kind === 'toll') {
          tomb(g, mx, my, 12 + 4 * k, 0.5 + 0.5 * k);
          continue;
        }
        const mr = 6 + 6 * k;
        g.fillStyle(SUMMON_COLOR, 0.25 + 0.3 * k);
        disc(g, mx, my, mr);
        g.lineStyle(2, SUMMON_EDGE, edgeA);
        ring(g, mx, my, mr);
      }
      break;
    }
  }
}

/**
 * The Dobre Fúnebre landing (CF-03): a closed ring of shock running from the bell to the exact reach in
 * CLEAVE_SHOW s, a thick white edge on a coral wash. It hurts the whole ring, so it leaves no safe wedge.
 */
function drawToll(
  g: Phaser.GameObjects.Graphics,
  top: Phaser.GameObjects.Graphics,
  e: Enemy,
  range: number,
  t: number,
): void {
  const grow = 1 - (1 - t) ** 3;
  const r = range * grow;
  g.fillStyle(WARN_COLOR, 0.3 * (1 - t));
  disc(g, e.x, e.y, r);
  top.lineStyle(14 * (1 - t) + 3, WARN_COLOR, 0.55 * (1 - t));
  ring(top, e.x, e.y, Math.max(0, r - 5));
  top.lineStyle(7 * (1 - t) + 2, 0xffffff, 0.95 * (1 - t));
  ring(top, e.x, e.y, r);
}

/** Pixel size of a telegraph dash square (art px x ART_RES) and the gap its dark outline adds. */
const PIX = 4;

/**
 * One pixel-art dash square at (x, y), snapped to the 2 px grid: a dark outline square under a light one, in the
 * Graphics' current stroke colour and alpha (so every telegraph keeps its colour). `pass` 0 draws the outline, 1
 * the light square (two passes keep the outlines from cutting into neighbours).
 */
function pixelDash(g: Phaser.GameObjects.Graphics, x: number, y: number, pass: number): void {
  const sx = Math.round(x / 2) * 2;
  const sy = Math.round(y / 2) * 2;
  if (pass === 0)
    g.fillStyle(INK, g.defaultStrokeAlpha * 0.7).fillRect(
      sx - PIX / 2 - 1,
      sy - PIX / 2 - 1,
      PIX + 2,
      PIX + 2,
    );
  else g.fillStyle(g.defaultStrokeColor, g.defaultStrokeAlpha).fillRect(sx - PIX / 2, sy - PIX / 2, PIX, PIX);
}

/** A dashed arc made of pixel squares (current line colour), its dashes shifted `offset` px along it. */
function dashedArc(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  r: number,
  a0: number,
  a1: number,
  offset: number,
): void {
  const step = PIX / r;
  for (let pass = 0; pass < 2; pass++)
    for (let a = a0; a < a1; a += step) {
      // Dash on for DASH px, off for DASH px, marching with `offset`.
      if (((((a - a0) * r - offset) % (2 * DASH)) + 2 * DASH) % (2 * DASH) >= DASH) continue;
      pixelDash(g, x + Math.cos(a) * r, y + Math.sin(a) * r, pass);
    }
}

/** A dashed line of pixel squares (current line colour), its dashes shifted `offset` px along it. */
function dashedLine(
  g: Phaser.GameObjects.Graphics,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  offset: number,
): void {
  const len = Math.hypot(x1 - x0, y1 - y0);
  if (len < 1) return;
  const ux = (x1 - x0) / len;
  const uy = (y1 - y0) / len;
  for (let pass = 0; pass < 2; pass++)
    for (let d = 0; d < len; d += PIX) {
      if ((((d - offset) % (2 * DASH)) + 2 * DASH) % (2 * DASH) >= DASH) continue;
      pixelDash(g, x0 + ux * d, y0 + uy * d, pass);
    }
}

/** A cartoon sword centred on (x, y), its tip toward angle `a`, about 2.6 x `r` long. */
function drawSword(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  a: number,
  r: number,
  st: OrbitStyle,
): void {
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  const vx = -uy;
  const vy = ux;
  const bx = x - ux * r * 0.5;
  const by = y - uy * r * 0.5;
  const hw = r * 0.3;
  // Grip, then the blade, then the guard on top, all with the ink outline.
  g.lineStyle(r * 0.5, INK).lineBetween(bx, by, bx - ux * r * 0.7, by - uy * r * 0.7);
  g.lineStyle(r * 0.25, 0x6a3a1a).lineBetween(bx, by, bx - ux * r * 0.6, by - uy * r * 0.6);
  g.fillStyle(st.color).lineStyle(2, INK);
  g.beginPath();
  g.moveTo(x + ux * r * 1.5, y + uy * r * 1.5);
  g.lineTo(bx + vx * hw, by + vy * hw);
  g.lineTo(bx - vx * hw, by - vy * hw);
  g.closePath();
  g.fillPath();
  g.strokePath();
  g.lineStyle(1.5, 0xffffff, 0.7).lineBetween(bx + vx * hw * 0.3, by + vy * hw * 0.3, x + ux * r, y + uy * r);
  const gw = r * 0.7;
  const gt = r * 0.14;
  g.fillStyle(st.dark).lineStyle(2, INK);
  g.beginPath();
  g.moveTo(bx + vx * gw + ux * gt, by + vy * gw + uy * gt);
  g.lineTo(bx - vx * gw + ux * gt, by - vy * gw + uy * gt);
  g.lineTo(bx - vx * gw - ux * gt, by - vy * gw - uy * gt);
  g.lineTo(bx + vx * gw - ux * gt, by + vy * gw - uy * gt);
  g.closePath();
  g.fillPath();
  g.strokePath();
}
