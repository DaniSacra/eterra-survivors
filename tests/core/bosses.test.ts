import { describe, expect, it } from 'vitest';
import { BossAct } from '../../src/core/bosses';
import { spawnEnemy, type Enemy } from '../../src/core/enemies';
import { CHARACTERS, CHARACTER_IDS } from '../../src/data/characters';
import { config } from '../../src/data/config';
import { ENEMIES, type BossAbility, type EnemyId } from '../../src/data/enemies';
import { STAGES } from '../../src/data/stages';
import { bareWorld, still } from './helpers';

const STEP = 1 / 60;

/** A quiet world with one boss right next to the hero, its ability ready. */
function withBoss(id: EnemyId, x = 80, y = 0) {
  const w = bareWorld();
  const boss = spawnEnemy(w, id, x, y);
  boss.actT = 0;
  return { w, boss, ab: boss.def.ability as BossAbility };
}

/** Steps until the boss leaves its windup; returns how long the windup took. */
function runWindup(w: ReturnType<typeof bareWorld>, boss: Enemy): number {
  let t = 0;
  w.step(STEP, still);
  expect(boss.act).toBe(BossAct.Windup);
  while (boss.act === BossAct.Windup && t < 5) {
    w.step(STEP, still);
    t += STEP;
  }
  return t;
}

describe('boss abilities', () => {
  it('every boss has one, and none can kill a full-health hero by itself', () => {
    const minHp = Math.min(
      ...CHARACTER_IDS.map(
        (h) => config.player.stats.maxHp + ((CHARACTERS[h].stats as { maxHp?: number }).maxHp ?? 0),
      ),
    );
    for (const id of ['blackKnight', 'bellRinger', 'oldWolf'] as const) {
      const ab = ENEMIES[id].ability as BossAbility;
      expect(ab).toBeDefined();
      expect(ab.damage).toBeLessThan(minHp / 2);
      expect(ab.windup).toBeGreaterThanOrEqual(0.7); // readable on a phone
    }
  });

  it('Corte Brutal: stands still through the windup, then hurts the hero inside the arc', () => {
    const { w, boss, ab } = withBoss('blackKnight');
    w.player.iframes = 999;
    const x0 = boss.x;
    const took = runWindup(w, boss);
    expect(took).toBeCloseTo(ab.windup, 1);
    expect(boss.x).toBeCloseTo(x0, 0);
    // The hero kept i-frames, so now let it land on a fresh one.
    const again = withBoss('blackKnight');
    again.w.step(STEP, still);
    for (let t = 0; t < ab.windup + 0.1; t += STEP) again.w.step(STEP, still);
    expect(again.w.player.hp).toBeLessThanOrEqual(
      again.w.player.stats.maxHp - ab.damage * STAGES.valmor.mult.damage + 1,
    );
  });

  it('Corte Brutal: stepping out of the marked arc avoids it', () => {
    const { w, boss, ab } = withBoss('blackKnight');
    boss.def = { ...boss.def, damage: 0 }; // ignore contact
    w.step(STEP, still);
    w.player.x = 400; // ran away during the windup
    for (let t = 0; t < ab.windup + 0.1; t += STEP) w.step(STEP, still);
    expect(w.player.hp).toBe(w.player.stats.maxHp);
  });

  it('A badalada: raises a ring of the dead around the Sineiro', () => {
    const { w, boss, ab } = withBoss('bellRinger', 300, 0);
    runWindup(w, boss);
    expect(boss.act).toBe(BossAct.Idle);
    expect(boss.actT).toBeCloseTo(ab.every, 1);
    // In view, they rise out of marks on the ground first (FT-02), never on the hero.
    const bx = boss.x;
    const by = boss.y;
    const now = w.enemies.active.filter((e) => e.type === ab.summon).length;
    expect(w.marks.size).toBeGreaterThan(0);
    expect(w.marks.size + now).toBe(ab.count);
    for (const m of w.marks.active)
      expect(Math.hypot(m.x - w.player.x, m.y - w.player.y)).toBeGreaterThanOrEqual(79);
    for (let t = 0; t <= config.marks.spawnTime; t += STEP) w.step(STEP, still);
    const raised = w.enemies.active.filter((e) => e.type === ab.summon);
    expect(raised.length).toBe(ab.count);
    for (const e of raised) expect(Math.hypot(e.x - bx, e.y - by)).toBeLessThan(ab.range + 60);
  });

  it('Mordida Funda: dashes in a straight line toward where the hero was, and bites', () => {
    const { w, boss, ab } = withBoss('oldWolf', 200, 0);
    runWindup(w, boss);
    const x0 = boss.x;
    for (let t = 0; t < (ab.dash ?? 0.5); t += STEP) w.step(STEP, still);
    expect(x0 - boss.x).toBeGreaterThan(ab.range * 0.7);
    expect(Math.abs(boss.y)).toBeLessThan(1);
    expect(w.player.hp).toBeLessThan(w.player.stats.maxHp);
  });

  it('pauses while the world is frozen', () => {
    const { w, boss } = withBoss('blackKnight');
    w.step(STEP, still);
    const left = boss.actT;
    w.freeze = 1;
    w.step(STEP, still);
    expect(boss.actT).toBe(left);
  });
});
