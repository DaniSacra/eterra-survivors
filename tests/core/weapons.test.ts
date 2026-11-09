import { describe, expect, it } from 'vitest';
import { rebuildEnemyHash, spawnEnemy } from '../../src/core/enemies';
import { updateWeapons as rawUpdate } from '../../src/core/weapons';
import type { World } from '../../src/core/world';
import { WEAPONS, WEAPON_IDS, type WeaponId } from '../../src/data/weapons';
import { bareWorld, still } from './helpers';
import { config } from '../../src/data/config';

const blade = WEAPONS.blade.levels[0]!;
const light = WEAPONS.elunLight.levels[0]!;
const aura = WEAPONS.yahAura.levels[0]!;

/** Weapons rely on the enemy hash, which `World.step` rebuilds before them. */
function updateWeapons(w: World, dt: number) {
  rebuildEnemyHash(w);
  rawUpdate(w, dt);
}

function prepared(id: WeaponId) {
  const w = bareWorld();
  w.addWeapon(id);
  return w;
}

describe('weapon data', () => {
  it('every level has damage and cooldown > 0', () => {
    for (const id of WEAPON_IDS)
      for (const l of WEAPONS[id].levels) {
        expect(l.damage).toBeGreaterThan(0);
        expect(l.cooldown).toBeGreaterThan(0);
      }
  });
});

describe('Maça de Ferro (aimed arc, shock wave, combo)', () => {
  const mace = WEAPONS.mace;

  it('swings at the nearest enemy, even behind the way the hero walks', () => {
    const w = prepared('mace');
    w.player.facing.x = 1;
    const back = spawnEnemy(w, 'slime', -50, 0);
    updateWeapons(w, 1 / 60);
    expect(back.hp).toBeLessThan(back.maxHp);
  });

  it('waits (no swing, short retry) while nobody is within reach', () => {
    const w = prepared('mace');
    spawnEnemy(w, 'slime', 400, 0);
    updateWeapons(w, 1 / 60);
    expect(w.slashes.size).toBe(0);
    expect(w.weapons[0]!.timer).toBeCloseTo(config.weapons.idleRetry);
  });

  it('the blow sends a shock wave from the tip of its reach that hurts what the swing missed, for less', () => {
    const w = prepared('mace');
    const l = mace.levels[0]!;
    const near = spawnEnemy(w, 'blackKnight', l.range * 0.5, 0);
    // Past the reach but inside the wave around the tip.
    const far = spawnEnemy(w, 'blackKnight', l.range + near.def.radius + l.shockRadius! * 0.5, 0);
    updateWeapons(w, 1 / 60);
    const crush = near.maxHp - near.hp;
    const wave = far.maxHp - far.hp;
    expect(crush).toBeCloseTo(l.damage);
    expect(wave).toBeCloseTo(l.damage * l.shock!);
  });

  it('an enemy crushed by the swing is not hit again by the wave', () => {
    const w = prepared('mace');
    const l = mace.levels[0]!;
    const e = spawnEnemy(w, 'blackKnight', l.range - 5, 0);
    updateWeapons(w, 1 / 60);
    expect(e.maxHp - e.hp).toBeCloseTo(l.damage);
  });

  it('from level 3 the second blow lands in the same direction a moment later, not behind', () => {
    const w = prepared('mace');
    w.weapons[0]!.level = 3;
    const front = spawnEnemy(w, 'blackKnight', 60, 0);
    const back = spawnEnemy(w, 'blackKnight', -130, 0); // outside the reach: only a back swing could hit it
    updateWeapons(w, 1 / 60);
    const one = front.maxHp - front.hp;
    expect(one).toBeGreaterThan(0);
    expect(w.slashes.size).toBe(1);
    for (let t = 0; t < mace.combo! + 0.05; t += 1 / 60) updateWeapons(w, 1 / 60);
    expect(front.maxHp - front.hp).toBeCloseTo(one * 2);
    expect(back.hp).toBe(back.maxHp);
  });

  it('the Lâmina still swings where the hero faces', () => {
    const w = prepared('blade');
    w.player.facing.x = 1;
    const back = spawnEnemy(w, 'slime', -40, 0);
    updateWeapons(w, 1 / 60);
    expect(back.hp).toBe(back.maxHp);
  });
});

describe('Lâmina de Valmor (arc)', () => {
  it('hits enemies in front, not behind', () => {
    const w = prepared('blade');
    w.player.facing.x = 1;
    const front = spawnEnemy(w, 'slime', 40, 0);
    const back = spawnEnemy(w, 'slime', -40, 0);
    w.step(1 / 60, still);
    expect(front.hp).toBeLessThan(front.maxHp);
    expect(back.hp).toBe(back.maxHp);
    expect(w.slashes.size).toBe(1);
  });

  it('respects range and cooldown, and pushes enemies back', () => {
    const w = prepared('blade');
    const near = spawnEnemy(w, 'slime', 40, 0);
    const far = spawnEnemy(w, 'slime', blade.range + 60, 0);
    updateWeapons(w, 0);
    expect(far.hp).toBe(far.maxHp);
    expect(near.kbx).toBeGreaterThan(0);
    const hp = near.hp;
    updateWeapons(w, blade.cooldown / 2);
    expect(near.hp).toBe(hp);
  });

  it('scales with might', () => {
    const w = prepared('blade');
    w.player.stats.might = 2;
    const e = spawnEnemy(w, 'blackKnight', 40, 0);
    updateWeapons(w, 0);
    expect(e.maxHp - e.hp).toBeCloseTo(blade.damage * 2);
  });
});

describe('Luz de Elun (homing)', () => {
  it('does not fire without targets, then seeks the nearest enemy', () => {
    const w = prepared('elunLight');
    w.step(1 / 60, still);
    expect(w.projectiles.size).toBe(0);
    const near = spawnEnemy(w, 'slime', 0, -120);
    const far = spawnEnemy(w, 'slime', 300, 0);
    for (let i = 0; i < 60 && near.hp === near.maxHp; i++) w.step(1 / 60, still);
    expect(near.hp).toBe(near.maxHp - light.damage);
    expect(far.hp).toBe(far.maxHp);
  });

  it('curves towards a moving target and expires after hitting', () => {
    const w = prepared('elunLight');
    const e = spawnEnemy(w, 'blackKnight', 200, 0);
    w.step(1 / 60, still);
    expect(w.projectiles.size).toBe(WEAPONS.elunLight.levels[0]!.count);
    w.weapons[0]!.timer = 99; // no second volley
    e.y = 150; // the target dodges sideways
    for (let i = 0; i < 120 && e.hp === e.maxHp; i++) w.step(1 / 60, still);
    expect(e.hp).toBeLessThan(e.maxHp);
    for (let i = 0; i < 60; i++) w.step(1 / 60, still);
    expect(e.maxHp - e.hp).toBeCloseTo(2 * WEAPONS.elunLight.levels[0]!.damage);
    expect(w.projectiles.size).toBe(0);
  });

  it('fires one shot per count, at distinct targets when possible', () => {
    const w = prepared('elunLight');
    w.weapons[0]!.level = 4; // count 3
    spawnEnemy(w, 'slime', 100, 0);
    spawnEnemy(w, 'slime', -100, 0);
    w.step(1 / 60, still);
    expect(w.projectiles.size).toBe(3);
    const targets = new Set(w.projectiles.active.map((p) => p.targetUid));
    expect(targets.size).toBe(2);
  });
});

describe('Aura de Yah (area)', () => {
  it('damages every enemy inside the radius on each tick', () => {
    const w = prepared('yahAura');
    const a = spawnEnemy(w, 'blackKnight', 20, 0);
    const b = spawnEnemy(w, 'blackKnight', -20, 10);
    const out = spawnEnemy(w, 'skeleton', aura.radius + 80, 0);
    updateWeapons(w, 0);
    updateWeapons(w, aura.cooldown);
    expect(a.maxHp - a.hp).toBeCloseTo(aura.damage * 2);
    expect(b.maxHp - b.hp).toBeCloseTo(aura.damage * 2);
    expect(out.hp).toBe(out.maxHp);
  });
});

describe('damage numbers', () => {
  it('appear on hit, rise and fade', () => {
    const w = prepared('blade');
    spawnEnemy(w, 'blackKnight', 30, 0);
    w.step(1 / 60, still);
    expect(w.damageNumbers.size).toBe(1);
    const y = w.damageNumbers.active[0]!.y;
    w.step(0.05, still);
    expect(w.damageNumbers.active[0]!.y).toBeLessThan(y);
    for (let i = 0; i < 60; i++) w.step(1 / 60, still);
    expect(w.damageNumbers.size).toBeLessThanOrEqual(1);
  });

  it('hits on one enemy close together add up into one number, marked strong when big', () => {
    const w = bareWorld();
    const e = spawnEnemy(w, 'blackKnight', 30, 0);
    w.onEnemyDamaged(e, 25, null);
    w.onEnemyDamaged(e, 25, null);
    expect(w.damageNumbers.size).toBe(1);
    expect(w.damageNumbers.active[0]!.value).toBe(50);
    expect(w.damageNumbers.active[0]!.strong).toBe(true);
    for (let i = 0; i < 20; i++) w.step(1 / 60, still); // past the merge window
    w.onEnemyDamaged(e, 5, null);
    expect(w.damageNumbers.size).toBe(2);
  });

  it('an area swing over a crowd shows at most arcNumbers new numbers, and later hits still add up there', () => {
    const w = prepared('mace');
    const crowd = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      crowd.push(spawnEnemy(w, 'blackKnight', Math.cos(a) * 20, Math.sin(a) * 20));
    }
    w.weapons[0]!.timer = 0;
    updateWeapons(w, 1 / 60);
    const hit = crowd.filter((e) => e.hp < e.maxHp).length;
    expect(hit).toBeGreaterThan(config.effects.arcNumbers);
    expect(w.damageNumbers.size).toBe(config.effects.arcNumbers);
    expect(w.numberBudget).toBe(Infinity);
    // Other hits (not area) are not limited.
    for (const e of crowd) w.onEnemyDamaged(e, 1, null);
    expect(w.damageNumbers.size).toBe(16);
  });

  it('numbers of a crowd spread on both axes, the same way for the same enemy', () => {
    const w = bareWorld();
    const a = spawnEnemy(w, 'blackKnight', 0, 0);
    const b = spawnEnemy(w, 'blackKnight', 0, 0);
    w.onEnemyDamaged(a, 5, null);
    w.onEnemyDamaged(b, 5, null);
    const [na, nb] = w.damageNumbers.active;
    expect(na!.x !== nb!.x || na!.y !== nb!.y).toBe(true);
  });

  it('auras and orbits show no numbers', () => {
    for (const id of ['yahAura', 'paladinSwords'] as const) {
      const w = prepared(id);
      const e = spawnEnemy(w, 'blackKnight', 10, 0);
      w.onEnemyDamaged(e, 5, w.weapons[0]!);
      expect(w.damageNumbers.size).toBe(0);
    }
  });
});

describe('random-target weapons and the boss (RE-06)', () => {
  /** A boss far inside the view plus a crowd of escorts closer to the hero. */
  function bossFight(id: WeaponId, bossX: number) {
    const w = prepared(id);
    w.setView(1000, 700);
    const boss = spawnEnemy(w, 'oldWolf', bossX, 0);
    w.boss = boss;
    const escorts = [];
    for (let i = 0; i < 30; i++)
      escorts.push(spawnEnemy(w, 'hooded', -60 - (i % 6) * 40, -100 + Math.floor(i / 6) * 40));
    for (const e of [boss, ...escorts]) e.def = { ...e.def, speed: 0, knockbackResist: 1 };
    return { w, boss };
  }

  it.each(['lightning', 'fire', 'frost'] as const)(
    '%s: the first strike of each volley goes on the boss on screen',
    (id) => {
      const { w, boss } = bossFight(id, 300);
      updateWeapons(w, 1 / 60);
      for (let i = 0; i < 30; i++) w.step(1 / 60, still); // zones tick after landing
      expect(boss.hp).toBeLessThan(boss.maxHp);
    },
  );

  it.each(['daggers', 'fan'] as const)(
    '%s: aimed throws go for the boss on screen, not the nearer escort',
    (id) => {
      const { w } = bossFight(id, 300);
      updateWeapons(w, 1 / 60);
      expect(w.projectiles.size).toBeGreaterThan(0);
      const s = WEAPONS[id].levels[0]!;
      for (const p of w.projectiles.active) expect(Math.abs(p.angle)).toBeLessThanOrEqual(s.count * s.spread);
    },
  );

  it.each(['lightning', 'fire', 'frost'] as const)('%s: a boss off screen is not aimed at', (id) => {
    const { w, boss } = bossFight(id, 700);
    for (let i = 0; i < 30; i++) w.step(1 / 60, still);
    expect(boss.hp).toBe(boss.maxHp);
  });
});
