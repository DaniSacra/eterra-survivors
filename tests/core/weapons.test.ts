import { describe, expect, it } from 'vitest';
import { damageEnemy, rebuildEnemyHash, spawnEnemy } from '../../src/core/enemies';
import { nearestVisible } from '../../src/core/projectiles';
import { isFaded } from '../../src/core/behaviours';
import { BossAct } from '../../src/core/bosses';
import { updateWeapons as rawUpdate } from '../../src/core/weapons';
import type { World } from '../../src/core/world';
import { WEAPONS, WEAPON_IDS, type WeaponId } from '../../src/data/weapons';
import { bareWorld, still } from './helpers';
import { config } from '../../src/data/config';
import { t } from '../../src/i18n/pt-BR';

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

describe('Maça de Ferro (slam: a blow in front, a shock wave every few)', () => {
  const mace = WEAPONS.mace;
  const l = mace.levels[0]!;
  const ahead = l.radius * 0.55; // where the head lands (SMASH_AHEAD)

  const blow = (w: World) => {
    w.weapons[0]!.timer = 0;
    updateWeapons(w, 1 / 60);
  };

  it('hits and stuns what is in front, not what is behind or far', () => {
    const w = prepared('mace');
    w.player.facing.x = 1;
    const front = spawnEnemy(w, 'blackKnight', ahead + l.radius - 10, 0);
    const back = spawnEnemy(w, 'skeleton', -l.radius, 0);
    const far = spawnEnemy(w, 'blackKnight', ahead + l.radius + 80, 0);
    blow(w);
    expect(front.maxHp - front.hp).toBeCloseTo(l.damage);
    expect(front.stun).toBeGreaterThan(0);
    expect(back.hp).toBe(back.maxHp);
    expect(far.hp).toBe(far.maxHp);
    expect(w.slashes.active.some((s) => s.form === 'smash')).toBe(true);
  });

  it('does not stun a faded ghost or a pile that has just fallen, but stuns a common enemy', () => {
    const w = prepared('mace');
    w.player.facing.x = 1;
    const ghost = spawnEnemy(w, 'ghost', ahead, 0);
    ghost.act = BossAct.Active;
    ghost.actT = 5;
    const pile = spawnEnemy(w, 'bones', ahead, 20);
    damageEnemy(w, pile, 9999);
    expect(pile.pile).toBeGreaterThan(0);
    const plain = spawnEnemy(w, 'skeleton', ahead, -20);
    blow(w);
    expect(isFaded(ghost)).toBe(true);
    expect(ghost.stun).toBe(0);
    expect(pile.stun).toBe(0);
    expect(plain.stun).toBeGreaterThan(0);
  });

  it('every `waveEvery` blows a shock wave reaches farther and throws enemies back', () => {
    const w = prepared('mace');
    w.player.facing.x = 1;
    const e = spawnEnemy(w, 'skeleton', ahead + l.waveRadius - 10, 0);
    e.hp = e.maxHp = 1e6;
    for (let i = 0; i < mace.waveEvery - 1; i++) blow(w);
    expect(e.hp).toBe(e.maxHp);
    blow(w);
    expect(e.maxHp - e.hp).toBeCloseTo(l.damage * l.wave);
    expect(e.kbx).toBeGreaterThan(l.waveKnockback * 0.3);
    expect(w.slashes.active.some((s) => s.form === 'shock')).toBe(true);
  });

  it("stuns: the enemy hit stops and can't bite; a boss only for a moment", () => {
    const w = prepared('mace');
    w.player.facing.x = 1;
    const e = spawnEnemy(w, 'skeleton', ahead, 10);
    e.hp = e.maxHp = 1e6;
    const boss = spawnEnemy(w, 'blackKnight', ahead, -50);
    updateWeapons(w, 1 / 60);
    expect(e.stun).toBeCloseTo(l.stun);
    expect(boss.stun).toBeCloseTo(config.weapons.bossStun);
    e.kbx = e.kby = 0;
    const x = e.x;
    w.step(0.1, still);
    expect(e.x).toBeCloseTo(x); // it doesn't walk while stunned
    e.x = w.player.x;
    e.y = w.player.y;
    e.kbx = e.kby = 0;
    const hp = w.player.hp;
    w.step(1 / 60, still);
    expect(w.player.hp).toBe(hp);
  });

  it('Quebra-Junta: the wave on every blow, a smaller aftershock, and the stunned crushed', () => {
    const w = prepared('jointBreaker');
    const def = WEAPONS.jointBreaker;
    const j = def.levels[0]!;
    w.player.facing.x = 1;
    const at = j.radius * 0.55;
    // Inside the blow: blow and wave land on it unstunned (no crush in the same blow); the blow stuns it and the
    // aftershock crushes it.
    const e = spawnEnemy(w, 'skeleton', at, 0);
    // Outside the blow, inside both waves: never stunned, so never crushed.
    const out = spawnEnemy(w, 'skeleton', at + j.radius + 20, 0);
    for (const x of [e, out]) {
      x.hp = x.maxHp = 1e6;
      x.def = { ...x.def, knockbackResist: 1 };
    }
    w.weapons[0]!.timer = 0;
    updateWeapons(w, 1 / 60);
    const first = e.maxHp - e.hp;
    expect(first).toBeCloseTo(j.damage + j.damage * j.wave);
    expect(e.stun).toBeGreaterThan(0);
    expect(out.maxHp - out.hp).toBeCloseTo(j.damage * j.wave);
    expect(out.stun).toBe(0);
    w.weapons[0]!.timer = 99;
    for (let t = 0; t < def.aftershock.delay + 0.05; t += 1 / 60) updateWeapons(w, 1 / 60);
    const after = j.damage * j.wave * def.aftershock.scale;
    expect(e.maxHp - e.hp - first).toBeCloseTo(after * def.crush);
    expect(out.maxHp - out.hp - j.damage * j.wave).toBeCloseTo(after);
    expect(w.slashes.active.filter((s) => s.form === 'shock')).toHaveLength(2);
    // Only the aftershock is marked as an echo (the render draws it smaller and fainter).
    expect(w.slashes.active.filter((s) => s.form === 'shock' && s.echo)).toHaveLength(1);
  });

  it('a stun is never renewed: an enemy held in the blow still gets to move between stuns', () => {
    const w = prepared('jointBreaker');
    const j = WEAPONS.jointBreaker.levels[0]!;
    w.player.facing.x = 1;
    const e = spawnEnemy(w, 'skeleton', j.radius * 0.55, 0);
    e.hp = e.maxHp = 1e9;
    let free = 0;
    // Blows far faster than the stun lasts.
    for (let t = 0; t < 3; t += 1 / 60) {
      w.weapons[0]!.timer = 0;
      updateWeapons(w, 1 / 60);
      e.stun -= 1 / 60;
      if (e.stun <= 0) free++;
    }
    expect(free).toBeGreaterThan(0);
  });

  it('Quebra-Junta in a crowd: only the blow stuns, so the crowd is not held in place', () => {
    const w = prepared('jointBreaker');
    w.weapons[0]!.level = WEAPONS.jointBreaker.levels.length;
    w.player.stats.area = 2;
    w.player.stats.cooldown = 0.5;
    w.player.hp = w.player.stats.maxHp = 1e9;
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * Math.PI * 2;
      const r = 150 + (i % 6) * 30;
      const e = spawnEnemy(w, 'skeleton', Math.cos(a) * r, Math.sin(a) * r);
      e.hp = e.maxHp = 1e9;
    }
    let stunned = 0;
    let seen = 0;
    for (let t = 0; t < 10; t += 1 / 60) {
      w.step(1 / 60, still);
      for (const e of w.enemies.active) {
        seen++;
        if (e.stun > 0) stunned++;
      }
    }
    // When the waves stunned (and renewed) too, ~46% of this crowd was stunned at any moment.
    expect(stunned / seen).toBeLessThan(0.1);
  });
});

describe('Martelo do Gaspar: the push', () => {
  it('throws what it hits back by a real distance (~knockback / 10 px)', () => {
    const w = prepared('hammer');
    w.player.facing.x = 1;
    const e = spawnEnemy(w, 'bones', 60, 0);
    e.hp = e.maxHp = 1e6;
    e.def = { ...e.def, speed: 0 };
    const x0 = e.x;
    for (let i = 0; i < 90; i++) w.step(1 / 60, still);
    expect(e.hp).toBeLessThan(e.maxHp);
    expect(e.x - x0).toBeGreaterThan(35);
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

describe('random volleys with most of the crowd off screen', () => {
  for (const id of ['fireSword', 'blizzard'] as const)
    it(`${id} still lands its whole volley`, () => {
      const w = prepared(id);
      for (let i = 0; i < 300; i++) spawnEnemy(w, 'skeleton', 3000 + i * 5, 3000);
      for (let i = 0; i < 20; i++) spawnEnemy(w, 'skeleton', -150 + i * 15, 60);
      w.weapons[0]!.timer = 0;
      updateWeapons(w, 1 / 60);
      const count = (WEAPONS[id].levels[0] as { count: number }).count;
      expect(w.targetsScratch.length).toBe(count);
    });
});

describe('rhythm texts match the data', () => {
  // "a cada dois golpes" / "a cada segundo golpe" = 2, "três" / "terceiro" = 3.
  const words: Record<string, number> = { dois: 2, segundo: 2, três: 3, terceiro: 3, quatro: 4, quarto: 4 };
  const said = (desc: string) => {
    const m = /a cada (\S+) golpe/i.exec(desc);
    return m ? words[m[1]!.toLowerCase()] : undefined;
  };
  it('Fúria and Maça say the rhythm they have', () => {
    expect(said(t.weapons.fury.desc)).toBe(WEAPONS.fury.wave.every);
    expect(said(t.weapons.mace.desc)).toBe(WEAPONS.mace.waveEvery);
  });
});

describe('automatic aim follows the visible rectangle (B-04)', () => {
  it('on a 390x844 view an enemy 300 px above the hero is a target, one 250 px to the side is not', () => {
    const w = bareWorld();
    w.setView(390, 844);
    const above = spawnEnemy(w, 'skeleton', 0, -300);
    const side = spawnEnemy(w, 'skeleton', 250, 0);
    rebuildEnemyHash(w);
    expect(nearestVisible(w)).toBe(above);
    above.dead = true;
    expect(nearestVisible(w)).toBeNull();
    expect(side.dead).toBe(false);
  });
});
