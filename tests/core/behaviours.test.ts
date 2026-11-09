import { describe, expect, it } from 'vitest';
import { BossAct } from '../../src/core/bosses';
import { isFaded } from '../../src/core/behaviours';
import { damageEnemy, spawnEnemy } from '../../src/core/enemies';
import { STAGES } from '../../src/data/stages';
import { bareWorld, still } from './helpers';

const STEP = 1 / 60;

describe('enemy behaviours', () => {
  it('a zigzagging spider weaves sideways but still closes in', () => {
    const w = bareWorld();
    const e = spawnEnemy(w, 'spider', 300, 0);
    let maxSide = 0;
    for (let i = 0; i < 60; i++) {
      w.step(STEP, still);
      maxSide = Math.max(maxSide, Math.abs(e.y));
    }
    expect(maxSide).toBeGreaterThan(5);
    expect(e.x).toBeLessThan(280);
  });

  it('a charger crouches, then dashes straight along its aim', () => {
    const w = bareWorld();
    const e = spawnEnemy(w, 'rat', 150, 0);
    e.actT = 0;
    w.step(STEP, still);
    expect(e.act).toBe(BossAct.Windup);
    const x0 = e.x;
    for (let i = 0; i < 10; i++) w.step(STEP, still);
    expect(e.x).toBeCloseTo(x0, 0); // crouching: stands still
    while (e.act === BossAct.Windup) w.step(STEP, still);
    const before = e.x;
    w.step(STEP, still);
    expect(before - e.x).toBeGreaterThan(e.def.speed * STEP * 2); // much faster than walking
  });

  it('a phasing ghost fades out now and then: no bite and no damage taken', () => {
    const w = bareWorld();
    const e = spawnEnemy(w, 'ghost', 400, 0);
    let t = 0;
    while (!isFaded(e) && t < 10) {
      w.step(STEP, still);
      t += STEP;
    }
    expect(isFaded(e)).toBe(true);
    const hp = e.hp;
    damageEnemy(w, e, 10, 0, 0);
    expect(e.hp).toBe(hp);
    // And it comes back.
    while (isFaded(e) && t < 20) {
      w.step(STEP, still);
      t += STEP;
    }
    expect(isFaded(e)).toBe(false);
  });

  it('the Rato Gigante joins the Crypt from the third minute', () => {
    const ids = (from: number) =>
      STAGES.crypt.waves.find((s) => s.from === from)?.enemies.map((x) => x.id) ?? [];
    expect(ids(60)).not.toContain('rat');
    expect(ids(120)).toContain('rat');
    expect(STAGES.valmor.waves.flatMap((s) => s.enemies.map((x) => x.id))).not.toContain('rat');
  });
});
