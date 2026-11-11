import { describe, expect, it } from 'vitest';
import { rebuildEnemyHash, spawnEnemy } from '../../src/core/enemies';
import { orbitAngle, updateWeapons as rawUpdate } from '../../src/core/weapons';
import type { World } from '../../src/core/world';
import { config } from '../../src/data/config';
import { WEAPONS, type WeaponId } from '../../src/data/weapons';
import { Rng } from '../../src/core/math';
import { bareWorld, still } from './helpers';

function prepared(id: WeaponId) {
  const w = bareWorld();
  w.addWeapon(id);
  return w;
}

function updateWeapons(w: World, dt: number) {
  rebuildEnemyHash(w);
  rawUpdate(w, dt);
}

describe('Adagas de Andilla (thrown where she walks)', () => {
  it('throws where Andilla walks, not at the nearest enemy, and each knife stops in the first one', () => {
    const w = prepared('daggers');
    w.weapons[0]!.level = 2; // two knives
    w.player.facing.x = 1;
    w.player.facing.y = 0;
    const first = spawnEnemy(w, 'blackKnight', 100, 0);
    const second = spawnEnemy(w, 'blackKnight', 200, 0); // right behind the first
    const near = spawnEnemy(w, 'blackKnight', -60, 0); // nearer, on the other side
    for (const e of [first, second, near]) e.def = { ...e.def, speed: 0, knockbackResist: 1 };
    w.step(1 / 60, still);
    expect(w.projectiles.active[0]!.sprite).toBe('proj.daggers');
    for (const p of w.projectiles.active) expect(Math.cos(p.angle)).toBeGreaterThan(0.9);
    for (let i = 0; i < 20; i++) w.step(1 / 60, still);
    expect(first.hp).toBeLessThan(first.maxHp);
    expect(second.hp).toBe(second.maxHp);
    expect(near.hp).toBe(near.maxHp);
  });

  it('some knives hit critically, for double damage', () => {
    const w = prepared('daggers');
    const s = WEAPONS.daggers.levels[0]!;
    const crit = WEAPONS.daggers.crit;
    const e = spawnEnemy(w, 'blackKnight', 80, 0);
    e.def = { ...e.def, speed: 0, knockbackResist: 1 };
    e.hp = e.maxHp = 1e9;
    let hits = 0;
    let crits = 0;
    for (let i = 0; i < 60 * 60; i++) {
      const hp = e.hp;
      w.step(1 / 60, still);
      const dealt = hp - e.hp;
      if (dealt > 0) {
        hits++;
        expect(e.hitAmount).toBeCloseTo(dealt);
        if (dealt > s.damage * 1.5) {
          crits++;
          expect(dealt).toBeCloseTo(s.damage * crit.mult);
        }
        // The hit remembers it was critical, for its spark (NF-06).
        expect(e.hitCrit).toBe(dealt > s.damage * 1.5);
      }
    }
    expect(crits / hits).toBeGreaterThan(crit.chance - 0.08);
    expect(crits / hits).toBeLessThan(crit.chance + 0.08);
  });

  it('with nobody around, throws where Andilla faces', () => {
    const w = prepared('daggers');
    w.player.facing.x = 0;
    w.player.facing.y = 1;
    w.step(1 / 60, still);
    for (const p of w.projectiles.active) expect(Math.sin(p.angle)).toBeGreaterThan(0.9);
  });

  it('Mãos Ligeiras adds a shot', () => {
    const w = prepared('daggers');
    w.player.stats.amount = 1;
    w.step(1 / 60, still);
    expect(w.projectiles.size).toBe(WEAPONS.daggers.levels[0]!.count + 1);
  });
});

describe('Martelo do Gaspar (thrown, facing)', () => {
  it('flies where the hero walks, even with an enemy elsewhere', () => {
    const w = prepared('hammer');
    w.player.facing.x = 1;
    w.player.facing.y = 0;
    spawnEnemy(w, 'blackKnight', -100, 0);
    w.step(1 / 60, still);
    expect(Math.cos(w.projectiles.active[0]!.angle)).toBeGreaterThan(0.9);
  });
});

describe('Espadas dos Paladinos (orbit)', () => {
  it('hurts what the circling blade touches, not what is far', () => {
    const w = prepared('paladinSwords');
    const s = WEAPONS.paladinSwords.levels[0]!;
    const a = orbitAngle(0, s.spin, 0, 1);
    const hit = spawnEnemy(w, 'blackKnight', Math.cos(a) * s.orbitRadius, Math.sin(a) * s.orbitRadius);
    const away = spawnEnemy(w, 'blackKnight', -300, 0);
    updateWeapons(w, 0);
    expect(hit.maxHp - hit.hp).toBeCloseTo(s.damage);
    expect(away.hp).toBe(away.maxHp);
  });

  it('sweeps the whole circle between cooldowns, re-hitting each enemy only after its cooldown', () => {
    const w = prepared('paladinSwords');
    const s = WEAPONS.paladinSwords.levels[0]!;
    const ring = [0, 1, 2, 3].map((k) =>
      spawnEnemy(w, 'blackKnight', Math.cos(k * 1.57) * s.orbitRadius, Math.sin(k * 1.57) * s.orbitRadius),
    );
    for (const e of ring) e.def = { ...e.def, speed: 0 };
    const turn = (2 * Math.PI) / s.spin;
    for (let t = 0; t < turn; t += 1 / 60) {
      updateWeapons(w, 1 / 60);
      w.time += 1 / 60;
    }
    for (const e of ring) expect(e.maxHp - e.hp).toBeGreaterThanOrEqual(s.damage);
    const before = ring[0]!.hp;
    updateWeapons(w, 0);
    expect(ring[0]!.hp).toBe(before);
  });
});

describe('Geada de Lyra (zone)', () => {
  it('drops frost on an enemy, which hurts on ticks, slows and fades', () => {
    const w = prepared('frost');
    const s = WEAPONS.frost.levels[0]!;
    const e = spawnEnemy(w, 'blackKnight', 120, 0);
    w.step(1 / 60, still);
    expect(w.zones.size).toBe(1);
    expect(e.maxHp - e.hp).toBeCloseTo(s.damage);
    expect(e.slow).toBeGreaterThan(0);
    const x = e.x;
    w.step(0.1, still);
    const slowed = x - e.x;
    for (let i = 0; i < 30; i++) w.step(1 / 60, still);
    expect(e.maxHp - e.hp).toBeCloseTo(s.damage * 2);
    w.weapons.length = 0;
    for (let i = 0; i < 60 * s.duration; i++) w.step(1 / 60, still);
    expect(w.zones.size).toBe(0);
    expect(slowed).toBeLessThan(e.def.speed * 0.1 * 0.9);
  });

  it('waits when there is nobody to freeze', () => {
    const w = prepared('frost');
    w.step(1 / 60, still);
    expect(w.zones.size).toBe(0);
    expect(w.weapons[0]!.timer).toBe(config.weapons.idleRetry);
  });
});

describe('Raio de Lyra (strike)', () => {
  it('hits random enemies on screen with a bolt', () => {
    const w = prepared('lightning');
    const s = WEAPONS.lightning.levels[0]!;
    const near = spawnEnemy(w, 'blackKnight', 100, 50);
    const offscreen = spawnEnemy(w, 'blackKnight', 5000, 0);
    for (let i = 0; i < 10; i++) w.step(1 / 60, still);
    expect(near.maxHp - near.hp).toBeCloseTo(s.damage);
    expect(offscreen.hp).toBe(offscreen.maxHp);
    expect(w.bolts.size).toBe(1);
  });

  it('strikes the nearest enemy first', () => {
    for (let seed = 1; seed <= 5; seed++) {
      const w = prepared('lightning');
      Object.assign(w, { rng: new Rng(seed) });
      const others = [spawnEnemy(w, 'blackKnight', 180, 0), spawnEnemy(w, 'blackKnight', -150, 120)];
      const nearest = spawnEnemy(w, 'blackKnight', 60, 60);
      w.step(1 / 60, still);
      expect(nearest.hp).toBeLessThan(nearest.maxHp);
      for (const e of others) expect(e.hp).toBe(e.maxHp);
    }
  });
});

describe('Cajado de Lyra (thrown, bursts)', () => {
  it('fires where Lyra looks; the orb bursts on the first enemy and hurts everyone around it', () => {
    const w = prepared('staff');
    const s = WEAPONS.staff.levels[0]!;
    w.player.facing.x = 1;
    w.player.facing.y = 0;
    const first = spawnEnemy(w, 'skeleton', 120, 0);
    const beside = spawnEnemy(w, 'skeleton', 120 + first.def.radius, s.blast! - 4);
    const far = spawnEnemy(w, 'skeleton', 120, s.blast! + 60);
    for (const e of [first, beside, far]) {
      e.def = { ...e.def, speed: 0, knockbackResist: 1 };
      e.hp = e.maxHp = 1e6;
    }
    for (let i = 0; i < 30; i++) w.step(1 / 60, still);
    expect(first.maxHp - first.hp).toBeCloseTo(s.damage);
    expect(beside.maxHp - beside.hp).toBeCloseTo(s.damage);
    expect(far.hp).toBe(far.maxHp);
    expect(w.projectiles.size).toBe(0);
  });
});

describe('Escudos de Valmor (a wall, not a spin)', () => {
  const still0 = (e: ReturnType<typeof spawnEnemy>) => {
    e.hp = e.maxHp = 1e6;
    e.def = { ...e.def, speed: 0, knockbackResist: 0 };
  };

  it('the shields stand in front of the walking direction and turn with it', () => {
    const w = prepared('shields');
    w.weapons[0]!.level = 7;
    w.player.facing.x = 0;
    w.player.facing.y = 1; // walking down
    for (let i = 0; i < 90; i++) w.step(1 / 60, still);
    const aim = w.weapons[0]!.aim;
    expect(Math.sin(aim)).toBeGreaterThan(0.99);
    // They do not spin: the heading stays put with the hero standing still.
    const before = w.weapons[0]!.aim;
    for (let i = 0; i < 60; i++) w.step(1 / 60, still);
    expect(w.weapons[0]!.aim).toBeCloseTo(before, 5);
  });

  it('the bash throws back what is in front, not what is behind', () => {
    const w = prepared('shields');
    w.player.facing.x = 1;
    w.player.facing.y = 0;
    const front = spawnEnemy(w, 'bones', 90, 0);
    const behind = spawnEnemy(w, 'bones', -90, 0);
    still0(front);
    still0(behind);
    for (let i = 0; i < 40; i++) w.step(1 / 60, still);
    expect(front.x).toBeGreaterThan(90 + 20);
    expect(behind.x).toBeCloseTo(-90, 0);
  });

  it('the Muralha de Valmor closes the ring: it bashes on every side', () => {
    const w = prepared('valmorWall');
    const a = spawnEnemy(w, 'bones', 110, 0);
    const b = spawnEnemy(w, 'bones', -110, 0);
    still0(a);
    still0(b);
    for (let i = 0; i < 40; i++) w.step(1 / 60, still);
    expect(a.x).toBeGreaterThan(110 + 20);
    expect(b.x).toBeLessThan(-110 - 20);
  });
});
