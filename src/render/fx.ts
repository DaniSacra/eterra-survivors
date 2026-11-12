import type Phaser from 'phaser';
import type { World } from '../core/world';
import { WEAPONS, type AuraLevel, type OrbitLevel, type WeaponDef } from '../data/weapons';
import { bladeRadius, isElo, orbitAngle, weaponStats } from '../core/weapons';
import { config } from '../data/config';
import { ELEMENT_COLOR, UI } from './ui';
import { fxSprites } from './fxSprites';
import { VFX, vfxKey } from './vfx';
import { star } from './sparks';
import { band, disc, ovalRing, ring } from './shapes';
import { HERO_COLOR, ICE, type Moments, SWORD_ART, drawSword, shard } from './fxparts/common';
import {
  EMBER_FILLS,
  FLAME_BUDGET,
  FROST_FILLS,
  ORBIT_STYLE,
  PULSE_RING,
  SWING_PLAIN,
  SWING_STYLE,
  SWORDS,
  TRAIL,
  drawAura,
  drawBolt,
  drawEmbers,
  drawGlow,
  drawIce,
  drawShock,
  drawSmash,
  drawSouls,
  drawSwing,
  drawTrail,
  drawVerb,
  drawWard,
  drawWaveCount,
  drawZone,
  flames,
} from './fxparts/weapons';
import {
  drawArenaWalls,
  drawBossWarning,
  drawBursts,
  drawCharges,
  drawEnemyShots,
  drawFoes,
  drawLeaps,
  drawMarks,
  drawPatches,
  drawPushes,
  drawSlime,
  drawStuns,
} from './fxparts/enemies';
export { HERO_COLOR, type Moments, newMoments, ZONE_FILL_MAX, HEAL_COLOR } from './fxparts/common';
export { PILE_SHAKE, type ShotStyle, SHOT_PLAIN, shotStyleOf, shotStyle } from './fxparts/enemies';

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

/** The ring of light after a level-up, seconds (8 frames at 14 fps). */
export const LEVEL_SHOW = 0.57;

/** The ring sprite's outer edge, art px. */
const LEVEL_RING = 70;

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
        // Aura de Yah: how long its window has been open (-1 = dark), its length and its ticks.
        wdef.burst && w.burst > 0 ? wdef.burst.window - w.burst : -1,
        wdef.burst ? wdef.burst.window : 0,
        wdef.burst ? wdef.burst.ticks : 1,
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

/** The most effect lights a frame may ask of the light map (flames, auras, bolts: the budget of NF-02). */
export const FX_LIGHTS = 8;

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
