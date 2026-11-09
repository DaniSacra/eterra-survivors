import { describe, expect, it } from 'vitest';
import { enemyTraits, formatTime } from '../../src/core/format';
import { ENEMIES, ENEMY_IDS, type EnemyDef } from '../../src/data/enemies';
import { bestiaryOrder } from '../../src/data/stages';

describe('formatTime', () => {
  it('formats mm:ss', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(125.7)).toBe('02:05');
    expect(formatTime(600)).toBe('10:00');
    expect(formatTime(-3)).toBe('00:00');
  });
});

const def = (o: Partial<EnemyDef>): EnemyDef => ({
  sprite: 'x',
  radius: 10,
  hp: 10,
  speed: 50,
  damage: 5,
  xp: 1,
  knockbackResist: 0,
  ...o,
});

describe('enemyTraits (bestiary sheet)', () => {
  it('speed against the hero: up to 50% slow, 75% medium, 95% fast, then faster', () => {
    expect(enemyTraits(def({ speed: 75 }), 150).speed).toBe('slow');
    expect(enemyTraits(def({ speed: 76 }), 150).speed).toBe('medium');
    expect(enemyTraits(def({ speed: 112.5 }), 150).speed).toBe('medium');
    expect(enemyTraits(def({ speed: 113 }), 150).speed).toBe('fast');
    expect(enemyTraits(def({ speed: 142.5 }), 150).speed).toBe('fast');
    expect(enemyTraits(def({ speed: 143 }), 150).speed).toBe('faster');
  });

  it('push: 0.9+ does not budge, 0.5+ a little, else easily', () => {
    expect(enemyTraits(def({ knockbackResist: 0.9 })).push).toBe('none');
    expect(enemyTraits(def({ knockbackResist: 0.89 })).push).toBe('little');
    expect(enemyTraits(def({ knockbackResist: 0.5 })).push).toBe('little');
    expect(enemyTraits(def({ knockbackResist: 0.49 })).push).toBe('easy');
  });

  it('way: a boss ability first, then the elite chest, then the way of moving', () => {
    expect(enemyTraits(ENEMIES.blackKnight).way).toBe('cleave');
    expect(enemyTraits(ENEMIES.bellRinger).way).toBe('toll');
    expect(enemyTraits(ENEMIES.oldWolf).way).toBe('lunge');
    expect(enemyTraits(ENEMIES.golem).way).toBe('elite');
    expect(enemyTraits(ENEMIES.rat).way).toBe('charge');
    expect(enemyTraits(ENEMIES.spider).way).toBe('zigzag');
    expect(enemyTraits(ENEMIES.ghost).way).toBe('phase');
    expect(enemyTraits(ENEMIES.bones).way).toBeNull();
  });

  it('keeps hp and contact damage as they are', () => {
    const tr = enemyTraits(ENEMIES.skeleton);
    expect(tr.hp).toBe(ENEMIES.skeleton.hp);
    expect(tr.damage).toBe(ENEMIES.skeleton.damage);
  });
});

describe('bestiaryOrder', () => {
  it('lists every enemy once: stages in order, then elites, then bosses', () => {
    const order = bestiaryOrder();
    expect([...order].sort()).toEqual([...ENEMY_IDS].sort());
    expect(order.slice(0, 4)).toEqual(['bones', 'bat', 'skeleton', 'graveRat']);
    expect(order.slice(-5)).toEqual(['golem', 'goblin', 'blackKnight', 'bellRinger', 'oldWolf']);
  });
});

describe('bestiary lines', () => {
  it('every enemy has one', async () => {
    const { t } = await import('../../src/i18n/pt-BR');
    for (const id of ENEMY_IDS) expect(t.bestiary.flavor[id], id).toBeTruthy();
  });
});
