import type Phaser from 'phaser';
import type { World } from '../../core/world';
import { BossAct, CLEAVE_SHOW, bossAbility } from '../../core/bosses';
import { CHARGE } from '../../core/behaviours';
import type { Enemy } from '../../core/enemies';
import { INK } from '../art/pen';
import { SUMMON_COLOR, SUMMON_EDGE, SUMMON_SHADE } from '../ui';
import { ENEMIES, type EnemyDef, type EnemyId } from '../../data/enemies';
import type { EnemyShot } from '../../core/enemyShots';
import { star } from '../sparks';
import { fxSprites } from '../fxSprites';
import { VFX, vfxKey } from '../vfx';
import { arcLine, band, disc, oval, ovalRing, ring } from '../shapes';
import { CLEAVE_STYLE, drawSwing } from './weapons';
import {
  BURST_SCORCH,
  DASH,
  ICE,
  type Moments,
  TAU_FX,
  WARN_COLOR,
  WARN_EDGE,
  ZONE_FILL_MAX,
  dashedArc,
  dashedLine,
  quad,
  shard,
} from './common';

/** Two little stars circling the head of each stunned enemy (a slam), at most this many a frame. */
export const STUN_SHOWN = 48;

export function drawStuns(g: Phaser.GameObjects.Graphics, world: World): void {
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
export function drawMarks(g: Phaser.GameObjects.Graphics, world: World): void {
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

export const THIEF_MARK = 0xffe14a;

/** A small gravestone standing on its patch of earth, `h` px tall (the summon marker of CF-04). */
export function tomb(g: Phaser.GameObjects.Graphics, x: number, y: number, h: number, a: number): void {
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
export const RALLY_SHOWN = 40;

export const RALLY_EMBER = 0xff8a3a;

/**
 * The new enemies' tells: a thrower winding up lights its spear tip coral (FT-03); a banner's reach is a faint red
 * glow on the ground (FT-06); a rallied enemy carries a small ember over its head.
 */
export function drawFoes(
  under: Phaser.GameObjects.Graphics,
  g: Phaser.GameObjects.Graphics,
  world: World,
): void {
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
export function drawBursts(
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
export const PILES_SHOWN = 24;

export const PILE_EMBER = 0xffa040;

/**
 * The clock of a pile (CF-01): a thin bone ring around it closing in `reassemble.delay` s, turning to ember for the
 * last second while its eyes light up. Never coral: standing up hurts no one.
 */
export function drawPileClock(g: Phaser.GameObjects.Graphics, e: Enemy, t: number): void {
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

export const COLD_SHOT: ShotStyle = { core: 0xffffff, halo: 0x7ac8ff, flakes: true };

/** Shooters with their own colour. A shot does not name its shooter, so it is matched by radius and speed. */
export const SHOT_STYLE: Partial<Record<EnemyId, ShotStyle>> = { coldSpirit: COLD_SHOT };

export const SHOT_KEYS: { radius: number; speed: number; style: ShotStyle }[] = [];
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
export function drawEnemyShots(g: Phaser.GameObjects.Graphics, world: World): void {
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

export const PUSH_SHOWN = 40;

/** A push faster than this (px/s) leaves dust (a 600 push stays above it ~0.13 s): slower ones read as walking anyway. */
export const PUSH_DUST = 150;

export const DUST = 0xcbbba0;

/**
 * A pushed enemy slides back on its heels: two short dust streaks on the ground behind it, along the push, longer and
 * brighter the harder it was thrown (NF-04), so a push reads even on a still frame.
 */
export function drawPushes(g: Phaser.GameObjects.Graphics, world: World): void {
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
export function drawCharges(g: Phaser.GameObjects.Graphics, world: World): void {
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
export function drawLeapMark(g: Phaser.GameObjects.Graphics, e: Enemy, time: number): void {
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
export function drawLeaps(g: Phaser.GameObjects.Graphics, world: World): void {
  const list = world.enemies.active;
  for (let i = 0; i < list.length; i++) {
    const e = list[i] as Enemy;
    if (e.def.move === 'leap' && e.act === BossAct.Active) drawLeapMark(g, e, world.time);
  }
}

/** Patch colours (FT-11): poison is a sick acid green-yellow, tar is dark amber; neither is Teo's green nor a gem's cyan. */
export const POISON = 0xa8c030;

export const TAR = 0x6a4a1a;

export const WEB = 0xe4e4ec;

export const SLIME = 0x3ab070;

export const SLIME_RIM = 0x1b5238;

/**
 * Patches an enemy leaves on the ground (poison, tar). In flight a potion arcs from the thrower to the marked spot
 * (the danger colour filling, the edge marching); landed, poison bubbles and tar shines, the exact size of the effect.
 */
export function drawPatches(g: Phaser.GameObjects.Graphics, world: World): void {
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

/** Frames of the slime effect (render/vfx.ts): spreading, living (a loop) and drying out. */
const SLIME_SPREAD = 0.2;
const SLIME_SPREAD_FRAMES = 4;
const SLIME_LIVE_FIRST = 4;
const SLIME_LIVE_FRAMES = 6;
const SLIME_DRY_FIRST = 10;
const SLIME_DRY_FRAMES = 6;
/** The last seconds of a patch's life it spends drying and shrinking. */
const SLIME_DRY = 1.2;
/** The picture's puddle is about this wide in art px: scaled so its edge is the exact slow radius. */
const SLIME_ART_RADIUS = 33;
/** Where the hero's feet are below their position, for the sticky strands. */
const SLIME_FEET = 14;
const STRANDS = 3;

/**
 * Slime on the ground (the Gosma's slow), a pixel animation per patch: it spreads from 40% to the full radius in 0.2 s
 * with a splash, lives with a wet gloss and bubbles, then shrinks and goes matte as it dries over its last seconds.
 * Drawn on the ground lane under the enemies and capped (the decoration lane). While the hero stands in one, strands
 * of slime stretch from their feet back along their trail (the slow, made visible).
 */
export function drawSlime(g: Phaser.GameObjects.Graphics, world: World): void {
  const list = world.marks.active;
  const t = world.time;
  const p = world.player;
  const fx = VFX.slime;
  let stuck = false;
  for (let i = 0; i < list.length; i++) {
    const m = list[i] as (typeof list)[number];
    if (m.kind !== 'slime') continue;
    const r = m.radius;
    if (m.ttl > 0) {
      // The flask is still in the air: the warning.
      const k = 1 - m.ttl / m.total;
      g.fillStyle(WARN_COLOR, 0.1 + 0.2 * k);
      disc(g, m.x, m.y, r);
      g.lineStyle(2.5, WARN_EDGE, 0.6 + 0.4 * k);
      dashedArc(g, m.x, m.y, r, 0, Math.PI * 2, (t * (30 + 50 * k)) % (DASH * 2));
      const kx = m.fromX + (m.x - m.fromX) * k;
      const ky = m.fromY + (m.y - m.fromY) * k - Math.sin(Math.PI * k) * 70;
      g.fillStyle(INK, 1);
      disc(g, kx, ky, 6.5);
      g.fillStyle(SLIME, 1);
      disc(g, kx, ky, 4.5);
      continue;
    }
    const age = t - m.born - m.total;
    let f: number;
    if (age < SLIME_SPREAD) f = Math.floor((Math.max(0, age) / SLIME_SPREAD) * SLIME_SPREAD_FRAMES);
    else if (m.life < SLIME_DRY)
      f =
        SLIME_DRY_FIRST +
        Math.min(SLIME_DRY_FRAMES - 1, Math.floor((1 - m.life / SLIME_DRY) * SLIME_DRY_FRAMES));
    else f = SLIME_LIVE_FIRST + (Math.floor((age - SLIME_SPREAD) * fx.fps * 0.7) % SLIME_LIVE_FRAMES);
    fxSprites.putGroundFrame(vfxKey('slime'), f, fx.anchor[0], fx.anchor[1], m.x, m.y, r / SLIME_ART_RADIUS);
    if (m.life > 0 && (p.x - m.x) ** 2 + (p.y - m.y) ** 2 < r * r) stuck = true;
  }
  if (!stuck) return;
  // Strands: slime threads from the feet back along the way the hero came, stretching and snapping in turn.
  const fy = p.y + SLIME_FEET;
  const bx = -p.facing.x;
  const by = -p.facing.y * 0.6;
  for (let s = 0; s < STRANDS; s++) {
    const ph = (t * 1.6 + s / STRANDS) % 1;
    const reach = 10 + 24 * ph;
    const sx = p.x + (s - 1) * 4;
    const sy = fy - 2;
    const ex = sx + bx * reach * 0.7 + (s - 1) * reach * 1.1;
    const ey = sy + by * reach * 0.4 + reach * 0.2;
    const a = ph < 0.8 ? 0.9 : 0.9 * (1 - (ph - 0.8) / 0.2);
    g.lineStyle(4, SLIME_RIM, a);
    g.lineBetween(sx, sy, ex, ey);
    g.lineStyle(2, 0x6fd69a, a);
    g.lineBetween(sx, sy, ex, ey);
    g.fillStyle(0xb8ffd8, a);
    g.fillRect(Math.round(ex / 2) * 2 - 2, Math.round(ey / 2) * 2 - 2, 4, 4);
  }
}

/** The arena's walls (FT-08): a row of tall ice crystals across the road at each end, over the crowd. */
export function drawArenaWalls(g: Phaser.GameObjects.Graphics, world: World): void {
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

/** The telegraph of a boss ability: where it will hit, filling up during the windup. */
export function drawBossWarning(
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
export function drawToll(
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
