import { describe, expect, it } from 'vitest';
import { hurtHero, updateShatters } from '../../src/core/elos';
import { applyDot, damageEnemy, rebuildEnemyHash, spawnEnemy } from '../../src/core/enemies';
import { STARLET, updateProjectiles } from '../../src/core/projectiles';
import { bladeRadius, updateWeapons } from '../../src/core/weapons';
import { addZone, updateZones } from '../../src/core/zones';
import type { World } from '../../src/core/world';
import { config } from '../../src/data/config';
import { WEAPONS, type WeaponId } from '../../src/data/weapons';
import { bareWorld } from './helpers';

/** Weapons and shots for `t` seconds, with the enemy hash rebuilt each frame as `World.step` does. */
function run(w: World, t: number): void {
  for (let s = 0; s < t; s += 1 / 60) {
    rebuildEnemyHash(w);
    updateWeapons(w, 1 / 60);
    updateProjectiles(w, 1 / 60);
  }
}

function armed(id: WeaponId): World {
  const w = bareWorld();
  w.addWeapon(id);
  w.player.facing.x = 1;
  w.player.facing.y = 0;
  return w;
}

const tough = (w: World, x: number, y: number) => {
  const e = spawnEnemy(w, 'skeleton', x, y);
  e.hp = e.maxHp = 1e6;
  e.def = { ...e.def, knockbackResist: 1 };
  return e;
};

describe('Fúria: the cutting wave', () => {
  const def = WEAPONS.fury;
  const l = def.levels[0]!;

  it('every third blow sends a wave ahead that cuts through everything in its line', () => {
    const w = armed('fury');
    const a = tough(w, l.range + 60, 0);
    const b = tough(w, l.range + 120, 0);
    const swings = () => {
      w.weapons[0]!.timer = 0;
      run(w, 1 / 60);
    };
    for (let i = 0; i < def.wave.every - 1; i++) swings();
    expect(w.projectiles.size).toBe(0);
    swings();
    expect(w.projectiles.size).toBe(1);
    w.weapons[0]!.timer = 99;
    run(w, def.wave.lifetime);
    const hit = l.damage * def.wave.damage;
    expect(a.maxHp - a.hp).toBeCloseTo(hit);
    expect(b.maxHp - b.hp).toBeCloseTo(hit);
  });
});

describe('Estrela de Lyra: the stars that fall', () => {
  const def = WEAPONS.lyraStar;
  const l = def.levels[0]!;

  it('the burst throws small stars around it that land and burst again, without splitting', () => {
    const w = armed('lyraStar');
    w.player.stats.amount = 1 - l.count; // a single orb
    const target = tough(w, 60, 0);
    run(w, 0.2);
    w.weapons[0]!.timer = 99;
    const stars = w.projectiles.active.filter((p) => p.sprite === STARLET);
    expect(stars).toHaveLength(def.split.count);
    expect(stars.every((s) => s.damage === l.damage * def.split.scale)).toBe(true);
    const bursts = w.bolts.size;
    // An enemy where one star will land.
    const s0 = stars[0]!;
    const lx = s0.x + Math.cos(s0.angle) * def.split.distance;
    const ly = s0.y + Math.sin(s0.angle) * def.split.distance;
    const landing = tough(w, lx, ly);
    run(w, def.split.fall + 0.05);
    expect(landing.hp).toBeLessThan(landing.maxHp);
    expect(w.bolts.size).toBeGreaterThan(bursts);
    run(w, 1);
    expect(w.projectiles.active.filter((p) => p.sprite === STARLET)).toHaveLength(0);
    expect(target.hp).toBeLessThan(target.maxHp);
  });
});

describe('Leque de Facas: ricochet and bleeding', () => {
  const def = WEAPONS.fan;
  const l = def.levels[0]!;

  it('a knife that hits bounces to the nearest enemy it has not hit, up to `ricochet.count` times', () => {
    const w = armed('fan');
    w.player.stats.amount = 1 - l.count; // a single knife
    const first = tough(w, 60, 0);
    const second = tough(w, 60, 100);
    const third = tough(w, 160, 100);
    run(w, 0.02);
    w.weapons[0]!.timer = 99;
    run(w, 1);
    for (const e of [first, second, third]) expect(e.hp).toBeLessThan(e.maxHp);
    expect(w.projectiles.size).toBe(0);
  });

  it('a critical hit makes the enemy bleed: damage over time, emerald tint', () => {
    const w = armed('fan');
    w.player.stats.amount = 1 - l.count;
    w.rng.next = () => 0; // every hit a crit
    const e = tough(w, 60, 0);
    run(w, 0.15);
    w.weapons[0]!.timer = 99;
    const crit = l.damage * def.crit.mult;
    expect(e.dot).toBeGreaterThan(0);
    expect(e.dotKind).toBe('bleed');
    expect(e.dotDps).toBeCloseTo(crit * def.bleed.dps);
    const hp = e.hp;
    for (let t = 0; t < 1; t += 1 / 60) w.step(1 / 60, { x: 0, y: 0 });
    expect(hp - e.hp).toBeGreaterThan(0);
  });
});

describe('damage over time', () => {
  it('ticks every config.dotTick for its duration, crediting its weapon, then stops', () => {
    const w = bareWorld();
    w.addWeapon('fan');
    const source = w.weapons[0]!;
    w.weapons.length = 0; // only the bleeding hurts it
    const e = tough(w, 300, 0);
    applyDot(e, 'bleed', 10, 2, source);
    for (let t = 0; t < 3; t += 1 / 60) w.step(1 / 60, { x: 0, y: 0 });
    expect(e.maxHp - e.hp).toBeCloseTo(20, 0);
    expect(source.damage).toBeCloseTo(20, 0);
    expect(e.dot).toBeLessThanOrEqual(0);
    expect(config.dotTick).toBeGreaterThan(0);
  });

  it('the stronger one stays; a weaker one only lengthens it', () => {
    const w = bareWorld();
    const e = tough(w, 300, 0);
    applyDot(e, 'bleed', 10, 1, null);
    applyDot(e, 'burn', 4, 3, null);
    expect(e.dotDps).toBe(10);
    expect(e.dotKind).toBe('bleed');
    expect(e.dot).toBe(3);
  });
});

describe('Luz Sagrada: the light that kills heals', () => {
  it('each kill by the light heals `mend.heal`, at most `mend.perSecond` times a second', () => {
    const w = armed('holyLight');
    const def = WEAPONS.holyLight;
    const src = w.weapons[0]!;
    w.player.hp = 10;
    for (let i = 0; i < def.mend.perSecond + 3; i++) {
      const e = spawnEnemy(w, 'bat', 400 + i * 30, 0);
      damageEnemy(w, e, 1e6, 0, 0, 0, src);
    }
    expect(w.player.hp).toBe(10 + def.mend.heal * def.mend.perSecond);
    w.time += 1.01;
    damageEnemy(w, spawnEnemy(w, 'bat', 300, 300), 1e6, 0, 0, 0, src);
    expect(w.player.hp).toBe(10 + def.mend.heal * (def.mend.perSecond + 1));
  });
});

describe('Chama de Yah: the pushing wave', () => {
  it('every `pulse.every` pulses a wave hits farther and harder, and throws enemies back', () => {
    const w = armed('yahFlame');
    const def = WEAPONS.yahFlame;
    const l = def.levels[0]!;
    // Beyond the aura, inside the wave.
    const e = tough(w, l.radius * (1 + def.pulse.radius) * 0.5, 0);
    e.def = { ...e.def, knockbackResist: 0 };
    for (let i = 0; i < def.pulse.every - 1; i++) {
      w.weapons[0]!.timer = 0;
      run(w, 1 / 60);
    }
    expect(e.hp).toBe(e.maxHp);
    w.weapons[0]!.timer = 0;
    run(w, 1 / 60);
    expect(e.maxHp - e.hp).toBeCloseTo(l.damage * def.pulse.damage);
    expect(e.kbx).toBeGreaterThan(0);
    expect(w.slashes.active.some((s) => s.form === 'pulse')).toBe(true);
  });
});

describe('Vigília: swords that dart out', () => {
  it('a sword passing the nearest enemy’s direction darts out to it and comes back', () => {
    const w = armed('vigil');
    const def = WEAPONS.vigil;
    const l = def.levels[0]!;
    const own = w.weapons[0]!;
    const e = tough(w, l.orbitRadius + def.dart.reach * 0.8, 0);
    run(w, 2);
    expect(own.aim).toBeCloseTo(0);
    expect(e.hp).toBeLessThan(e.maxHp);
    // Away from the aim, a sword stays on its circle; on it, it goes out to the enemy.
    expect(bladeRadius(own, Math.PI, l.orbitRadius)).toBe(l.orbitRadius);
    expect(bladeRadius(own, 0, l.orbitRadius)).toBeCloseTo(e.x - w.player.x);
  });
});

describe('Nevasca: the frozen shatter', () => {
  it('an enemy dying inside the frost shatters, hurting those around it', () => {
    const w = armed('blizzard');
    const def = WEAPONS.blizzard;
    const src = w.weapons[0]!;
    w.weapons[0]!.timer = 99;
    const z = addZone(w, 300, 0, 85, 4, 5, src);
    const dying = spawnEnemy(w, 'bat', 300, 0);
    const near = tough(w, 300 + def.shatter.radius - 5, 0);
    const far = tough(w, 300 + def.shatter.radius + 60, 0);
    damageEnemy(w, dying, 1e6, 0, 0, 0, null);
    rebuildEnemyHash(w);
    updateShatters(w);
    expect(near.maxHp - near.hp).toBeCloseTo(z.damage * def.shatter.damage);
    expect(far.hp).toBe(far.maxHp);
    expect(w.shatters).toHaveLength(0);
  });
});

describe('Tempestade: the chain', () => {
  it('each bolt jumps to `chain.count` more enemies nearby', () => {
    const w = armed('storm');
    const def = WEAPONS.storm;
    w.player.stats.amount = 1 - def.levels[0]!.count; // one bolt
    const a = tough(w, 50, 0);
    const b = tough(w, 50 + def.chain.range - 20, 0);
    const c = tough(w, 50 + (def.chain.range - 20) * 2, 0);
    run(w, 1 / 60);
    for (const e of [a, b, c]) expect(e.hp).toBeLessThan(e.maxHp);
    expect(b.maxHp - b.hp).toBeCloseTo(def.levels[0]!.damage * def.chain.damage);
    expect(w.bolts.active.filter((x) => x.link)).toHaveLength(def.chain.count);
  });
});

describe('Fúria da Forja: the boomerang', () => {
  it('the hammer turns back halfway and hits again on the way home', () => {
    const w = armed('forgeFury');
    const l = WEAPONS.forgeFury.levels[0]!;
    w.player.stats.amount = 1 - l.count;
    const e = tough(w, 100, 0);
    run(w, 1 / 60);
    w.weapons[0]!.timer = 99;
    run(w, l.lifetime / 2 - 0.05);
    expect(e.maxHp - e.hp).toBeCloseTo(l.damage);
    run(w, l.lifetime);
    expect(e.maxHp - e.hp).toBeCloseTo(l.damage * 2);
    expect(w.projectiles.size).toBe(0); // caught again
  });
});

describe('Procissão: the souls of the kills', () => {
  it('each kill adds a wisp to the next casts, up to the cap, until it fades', () => {
    const w = armed('soulProcession');
    const def = WEAPONS.soulProcession;
    const src = w.weapons[0]!;
    for (let i = 0; i < def.swell.cap + 2; i++)
      damageEnemy(w, spawnEnemy(w, 'bat', 500 + i * 20, 0), 1e6, 0, 0, 0, src);
    expect(src.stacks).toBe(def.swell.cap);
    tough(w, 100, 0);
    run(w, 1 / 60);
    expect(w.projectiles.size).toBe(def.levels[0]!.count + def.swell.cap);
    w.projectiles.active.forEach((p) => (p.dead = true));
    w.projectiles.releaseWhere((p) => p.dead);
    w.time += def.swell.duration + 0.1;
    src.timer = 0;
    run(w, 1 / 60);
    expect(w.projectiles.size).toBe(def.levels[0]!.count);
  });
});

describe('Muralha de Valmor: the guard', () => {
  it('takes one hit every `ward.every` seconds and throws the blow back at the attacker', () => {
    const w = armed('valmorWall');
    const def = WEAPONS.valmorWall;
    const e = tough(w, 0, 0);
    const hp = w.player.hp;
    expect(hurtHero(w, e, 10)).toBe(false);
    expect(w.player.hp).toBe(hp);
    expect(e.maxHp - e.hp).toBeCloseTo(def.levels[0]!.damage * def.ward.damage);
    expect(w.events).toContainEqual({ type: 'ward' });
    w.player.iframes = 0;
    expect(hurtHero(w, e, 10)).toBe(true); // the guard is down
    w.player.iframes = 0;
    w.time += def.ward.every;
    expect(hurtHero(w, e, 10)).toBe(false); // and back up
  });
});

describe('Espada de Fogo: burning ground', () => {
  it('where the sword falls the ground burns, setting alight whoever stands in it', () => {
    const w = armed('fireSword');
    const def = WEAPONS.fireSword;
    const l = def.levels[0]!;
    w.player.stats.amount = 1 - l.count;
    tough(w, 100, 0);
    run(w, 1 / 60);
    const z = w.zones.active[0]!;
    expect(z.slows).toBe(false);
    expect(z.ttl).toBeCloseTo(def.ground.duration, 1);
    const walker = tough(w, z.x + 10, z.y);
    rebuildEnemyHash(w);
    updateZones(w, config.zones.tick);
    expect(walker.dot).toBeGreaterThan(0);
    expect(walker.dotKind).toBe('burn');
    expect(walker.dotDps).toBeCloseTo(l.damage * def.ground.burn);
    expect(walker.slow).toBe(0);
  });
});
