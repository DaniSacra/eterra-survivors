import type { Enemy } from '../../src/core/enemies';
import { weaponReport } from '../../src/core/report';
import type { UpgradeOption } from '../../src/core/upgrades';
import { World, type RunSetup } from '../../src/core/world';
import type { CharacterId } from '../../src/data/characters';
import { EVOLUTIONS } from '../../src/data/evolutions';
import type { StageId } from '../../src/data/stages';
import type { PassiveId } from '../../src/data/upgrades';
import { WEAPONS, type WeaponId } from '../../src/data/weapons';

/**
 * A scripted player for full-run balance simulations (`npm run sim`). It flees nearby enemies (1/d² weight,
 * bosses and elites count more), drifts sideways around the threat, collects gems and items, and every so often
 * steps toward the nearest enemy on the frame a facing weapon (slash, thrown) fires, so it gets to aim.
 */
const PASSIVE_PRIORITY: PassiveId[] = ['might', 'haste', 'amount', 'reach', 'vigor', 'armor'];
const THREAT_RANGE = 200;
const DT = 1 / 20;

export interface SimResult {
  hero: CharacterId;
  stage: StageId;
  seed: number;
  won: boolean;
  time: number;
  level: number;
  kills: number;
  gold: number;
  /** Fraction of the boss HP left (null if it never spawned). */
  bossHpLeft: number | null;
  /** Seconds from boss spawn to the end of the run (null if it never spawned). */
  bossTime: number | null;
  elos: string[];
  /** Every 120 s: level, active enemies, hero HP. */
  snaps: { t: number; level: number; enemies: number; hp: number }[];
  top: string[];
  /** Real DPS of every weapon held at the end, at its final level. */
  dps: { id: WeaponId; level: number; dps: number }[];
  /** Base weapons owned at the end (an Elo counts as its base). */
  owned: WeaponId[];
  maxEnemies: number;
  /** Damage taken by the role of the enemy that dealt it. */
  taken: { fast: number; total: number };
}

/** Recipe passives of the weapons the hero owns. */
function recipePassives(w: World): Set<PassiveId> {
  const out = new Set<PassiveId>();
  for (const evo of Object.values(EVOLUTIONS)) if (evo && w.hasWeapon(evo.from)) out.add(evo.passive);
  return out;
}

function score(w: World, o: UpgradeOption): number {
  switch (o.kind) {
    case 'evolution':
      return 100;
    case 'weapon':
      return o.level > 1 ? 50 : w.weapons.length < 4 ? 40 : 1;
    case 'passive': {
      if (recipePassives(w).has(o.id)) return 30;
      const i = PASSIVE_PRIORITY.indexOf(o.id);
      return i >= 0 ? 20 - i : 5;
    }
    case 'heal':
      return 0;
  }
}

function choose(w: World): void {
  let best = 0;
  let bestScore = -1;
  w.upgradeOptions.forEach((o, i) => {
    const s = score(w, o) + w.rng.next() * 0.5;
    if (s > bestScore) {
      bestScore = s;
      best = i;
    }
  });
  w.chooseUpgrade(best);
}

const input = { x: 0, y: 0 };

/** True when a weapon that fires where the hero faces fires this step. */
function aimingSoon(w: World): boolean {
  for (const o of w.weapons) {
    const kind = WEAPONS[o.id].kind;
    if ((kind === 'arc' || (kind === 'thrown' && !aimsItself(o.id))) && o.timer <= DT * 1.5) return true;
  }
  return false;
}

/** Thrown weapons that pick their own target (no aiming needed). */
const aimsItself = (id: WeaponId): boolean => (WEAPONS[id] as { aim?: string }).aim === 'nearest';

function steer(w: World, side: number): void {
  const p = w.player;
  const list = w.enemies.active;
  let fx = 0;
  let fy = 0;
  let nearest: Enemy | null = null;
  let nearestD = Infinity;
  for (const e of list) {
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    if (dx > THREAT_RANGE || dx < -THREAT_RANGE || dy > THREAT_RANGE || dy < -THREAT_RANGE) continue;
    const d = Math.max(6, Math.hypot(dx, dy) - e.def.radius);
    if (d < nearestD) {
      nearestD = d;
      nearest = e;
    }
    const weight = (e.def.boss ? 5 : e.def.elite ? 2.5 : 1) / (d * d);
    fx += (dx / d) * weight;
    fy += (dy / d) * weight;
  }
  if (w.boss) {
    // The boss is always a threat, even from outside the query.
    const dx = p.x - w.boss.x;
    const dy = p.y - w.boss.y;
    const d = Math.max(6, Math.hypot(dx, dy) - w.boss.def.radius);
    if (d < 260) {
      fx += (dx / d) * (8 / (d * d));
      fy += (dy / d) * (8 / (d * d));
    }
  }
  const threat = Math.hypot(fx, fy);
  const danger = Math.min(1, threat * 900);

  // Goal: chest, then food when hurt, then other items, then the best nearby gem.
  let gx = 0;
  let gy = 0;
  let goal = Infinity;
  for (const it of w.pickups.active) {
    if (it.type === 'food' && p.hp > p.stats.maxHp * 0.7) continue;
    const d = Math.hypot(it.x - p.x, it.y - p.y) * (it.type === 'chest' ? 0.5 : 1);
    if (d < 450 && d < goal) {
      goal = d;
      gx = it.x - p.x;
      gy = it.y - p.y;
    }
  }
  if (goal === Infinity)
    for (const g of w.gems.active) {
      if (g.pulled) continue;
      const d = Math.hypot(g.x - p.x, g.y - p.y) / Math.sqrt(g.value);
      if (d < 260 && d < goal) {
        goal = d;
        gx = g.x - p.x;
        gy = g.y - p.y;
      }
    }
  const gl = Math.hypot(gx, gy) || 1;
  gx /= gl;
  gy /= gl;
  if (goal === Infinity) {
    // Nothing to fetch: wander in a slow circle.
    gx = Math.cos(w.time * 0.3);
    gy = Math.sin(w.time * 0.3);
  }

  // A facing weapon is about to fire: step toward the nearest enemy for one frame to aim it.
  if (nearest && nearestD < 260 && aimingSoon(w)) {
    input.x = nearest.x - p.x;
    input.y = nearest.y - p.y;
  } else {
    const ax = threat > 0 ? fx / threat : 0;
    const ay = threat > 0 ? fy / threat : 0;
    // Away from the threat plus a sideways drift, so the bot circles instead of backing into the next wave.
    input.x = (ax * 1.2 - ay * side * 0.8) * danger + gx * (1 - danger * 0.85);
    input.y = (ay * 1.2 + ax * side * 0.8) * danger + gy * (1 - danger * 0.85);
  }
  const l = Math.hypot(input.x, input.y);
  if (l > 0) {
    input.x /= l;
    input.y /= l;
  }
}

export function simulate(hero: CharacterId, stage: StageId, seed: number, setup: RunSetup = {}): SimResult {
  const w = new World(seed, { ...setup, character: hero, stage });
  w.setView(480, 800);
  const fastId = w.stage.waves.find((s) => s.enemies.length >= 2)?.enemies[1]?.id;
  const res: SimResult = {
    hero,
    stage,
    seed,
    won: false,
    time: 0,
    level: 1,
    kills: 0,
    gold: 0,
    bossHpLeft: null,
    bossTime: null,
    elos: [],
    snaps: [],
    top: [],
    dps: [],
    owned: [],
    maxEnemies: 0,
    taken: { fast: 0, total: 0 },
  };
  const side = seed % 2 ? 1 : -1;
  let bossAt = -1;
  let nextSnap = 120;
  while ((w.state === 'playing' || w.state === 'levelup') && w.time < 900) {
    if (w.state === 'levelup') {
      choose(w);
      continue;
    }
    steer(w, side);
    const hp = w.player.hp;
    w.step(DT, input);
    for (const ev of w.events) {
      if (ev.type === 'playerHit') {
        const lost = Math.max(0, hp - w.player.hp + w.player.stats.regen * DT);
        res.taken.total += lost;
        let who: Enemy | null = null;
        let bd = Infinity;
        for (const e of w.enemies.active) {
          const d = Math.hypot(e.x - w.player.x, e.y - w.player.y) - e.def.radius;
          if (d < bd) {
            bd = d;
            who = e;
          }
        }
        if (who && who.type === fastId) res.taken.fast += lost;
      } else if (ev.type === 'bossSpawned') bossAt = w.time;
      else if (ev.type === 'chest' && ev.reward.kind === 'evolution')
        res.elos.push(`${ev.reward.id}@${Math.round(w.time)}`);
    }
    w.events.length = 0;
    res.maxEnemies = Math.max(res.maxEnemies, w.enemies.size);
    if (w.time >= nextSnap) {
      res.snaps.push({ t: nextSnap, level: w.level, enemies: w.enemies.size, hp: Math.round(w.player.hp) });
      nextSnap += 120;
    }
  }
  res.won = w.state === 'won';
  res.time = Math.round(w.time);
  res.level = w.level;
  res.kills = w.kills;
  res.gold = w.gold;
  if (bossAt >= 0) {
    res.bossTime = Math.round(w.time - bossAt);
    res.bossHpLeft = w.boss ? w.boss.hp / w.boss.maxHp : 0;
  }
  const report = weaponReport(w);
  res.dps = report.map((r) => ({ id: r.id, level: r.level, dps: r.dps }));
  res.top = report
    .sort((a, b) => b.damage - a.damage)
    .slice(0, 3)
    .map((r) => `${r.id}:${r.level}=${Math.round(r.dps)}`);
  res.owned = w.weapons.map((o) => EVOLUTIONS[o.id]?.from ?? o.id);
  return res;
}
