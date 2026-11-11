import { describe, expect, it } from 'vitest';
import { spawnEnemy } from '../../src/core/enemies';
import { BossAct, bossAbility } from '../../src/core/bosses';
import { groundSlow } from '../../src/core/arena';
import { ENEMIES, type BossAbility } from '../../src/data/enemies';
import { bareWorld, still } from './helpers';

function run(w: ReturnType<typeof bareWorld>, seconds: number): void {
  for (let i = 0; i < seconds * 60; i++) w.step(1 / 60, still);
}

/** A mother near the hero, her cycle at ability `idx`, ready to start it. */
function mother(idx: number) {
  const w = bareWorld();
  w.player.hp = w.player.stats.maxHp = 1e9;
  const boss = spawnEnemy(w, 'spiderMother', 0, -200);
  boss.hp = boss.maxHp = 1e12;
  boss.abilityIdx = idx;
  boss.actT = 0;
  w.boss = boss;
  return { w, boss };
}

describe('Mãe-Aranha (FT-12)', () => {
  it('goes Ferroada, Teia, Ferroada, Ovos, round and round', () => {
    const { boss } = mother(0);
    const kinds: string[] = [];
    for (let i = 0; i < 5; i++) {
      boss.abilityIdx = i;
      kinds.push((bossAbility(boss) as { kind: string }).kind);
    }
    expect(kinds).toEqual(['lunge', 'web', 'lunge', 'eggs', 'lunge']);
  });

  it('Teia warns first, then leaves webs that slow, one on the hero, at most `cap`, and they dry up', () => {
    const { w, boss } = mother(1);
    const ab = ENEMIES.spiderMother.abilities[1] as BossAbility;
    run(w, 0.05);
    expect(boss.act).toBe(BossAct.Windup);
    const webs = () => w.marks.active.filter((m) => m.kind === 'web');
    expect(webs().length).toBe(ab.count);
    expect(webs().some((m) => m.x === w.player.x && m.y === w.player.y)).toBe(true);
    // Only a warning: no slow yet.
    expect(groundSlow(w)).toBe(1);
    run(w, ab.windup + 0.1);
    expect(groundSlow(w)).toBe(ab.slow);
    // Many casts never go over the cap.
    for (let i = 0; i < 6; i++) {
      boss.abilityIdx = 1;
      boss.act = BossAct.Idle;
      boss.actT = 0;
      run(w, 0.2);
    }
    expect(webs().length).toBeLessThanOrEqual(ab.cap ?? 6);
    run(w, (ab.life ?? 8) + 2);
    expect(webs().length).toBe(0);
  });

  it('Ovos: four sacs in a ring, each hatching three spiders by itself, and a broken one hatches nothing', () => {
    const { w, boss } = mother(3);
    boss.x = 500; // out of view, so the sacs rise at once
    boss.y = 0;
    run(w, (ENEMIES.spiderMother.abilities[3] as BossAbility).windup + 0.2);
    const eggs = () => w.enemies.active.filter((e) => e.type === 'spiderEgg' && !e.dead);
    expect(eggs().length).toBe(4);
    const broken = eggs()[0];
    if (broken) broken.dead = true;
    boss.act = BossAct.Idle;
    boss.actT = 1e9; // no more casts
    run(w, ENEMIES.spiderEgg.nest.every + 1);
    expect(w.enemies.active.filter((e) => e.type === 'spider' && !e.dead).length).toBe(9);
    expect(eggs().length).toBe(0); // hatched sacs are gone
  });

  it('Ferroada is a short lunge, and a full-life hero survives it', () => {
    const sting = ENEMIES.spiderMother.abilities[0] as BossAbility;
    expect(sting.kind).toBe('lunge');
    expect(sting.damage).toBeLessThan(0.5 * 100);
  });
});
