import { describe, expect, it } from 'vitest';
import { BossAct } from '../../src/core/bosses';
import { isFaded, rallyDamage } from '../../src/core/behaviours';
import { config } from '../../src/data/config';
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

  it('each stage has its own cast: rats and spiders in Valmor, the dead in the Crypt', () => {
    const cast = (stage: keyof typeof STAGES) =>
      new Set(STAGES[stage].waves.flatMap((s) => s.enemies.map((x) => x.id)));
    expect([...cast('valmor')]).toEqual(expect.arrayContaining(['graveRat', 'bat', 'rat', 'spider']));
    expect([...cast('crypt')]).toEqual(
      expect.arrayContaining(['bones', 'vampireBat', 'skeleton', 'coldSpirit']),
    );
    expect(cast('crypt').has('bat')).toBe(false);
    expect(cast('valmor').has('bones')).toBe(false);
    // The Espectro (extra role) joins the Crypt from the third minute.
    const ids = (from: number) =>
      STAGES.crypt.waves.find((s) => s.from === from)?.enemies.map((x) => x.id) ?? [];
    expect(ids(60)).not.toContain('ghost');
    expect(ids(120)).toContain('ghost');
  });
});

describe('determinism', () => {
  it('the same seed plays out the same, whatever ran before', () => {
    const run = () => {
      const w = bareWorld(7);
      for (let i = 0; i < 20; i++) spawnEnemy(w, 'spider', 200 + i * 10, i * 5);
      for (let i = 0; i < 60; i++) w.step(STEP, still);
      return w.enemies.active.map((e) => `${e.uid}:${e.x.toFixed(3)},${e.y.toFixed(3)}`).join(' ');
    };
    expect(run()).toBe(run());
  });
});

describe('ghost dark form', () => {
  it('turns dark on its first vanish, hits harder and stays dark until it dies', () => {
    const w = bareWorld();
    const e = spawnEnemy(w, 'ghost', 600, 0);
    expect(e.dark).toBe(false);
    let t = 0;
    while (!isFaded(e) && t < 10) {
      w.step(STEP, still);
      t += STEP;
    }
    expect(e.dark).toBe(true);
    expect(w.puffs.active.some((f) => f.kind === 'shade')).toBe(true);
    while (isFaded(e) && t < 20) {
      w.step(STEP, still);
      t += STEP;
    }
    // Solid again, and still dark (a second vanish does not undo it).
    expect(isFaded(e)).toBe(false);
    expect(e.dark).toBe(true);
    expect(rallyDamage(e)).toBeCloseTo(config.darkGhost.damage);
  });
});
