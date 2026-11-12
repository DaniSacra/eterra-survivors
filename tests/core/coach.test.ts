import { describe, expect, it } from 'vitest';
import {
  BOSS_LESSON_AT,
  LESSON_IDS,
  LIFE_SHARE,
  eliteOnField,
  MOVE_DONE,
  nextLesson,
  type LessonId,
} from '../../src/core/coach';
import { sanitizeSave } from '../../src/core/meta';
import { spawnEnemy } from '../../src/core/enemies';
import { dropGem } from '../../src/core/xp';
import { bareWorld } from './helpers';

const none = new Set<LessonId>();

describe('elite and boss lessons', () => {
  it('names the first elite on the field, once', () => {
    const w = bareWorld();
    w.player.x = 500;
    w.time = 10;
    const seen = new Set<LessonId>(['move', 'auto', 'gems', 'life']);
    expect(nextLesson(w, seen)).toBeNull();
    spawnEnemy(w, 'witch', 600, 0);
    expect(nextLesson(w, seen)).toBe('elite');
    expect(eliteOnField(w)).toBe('witch');
    seen.add('elite');
    expect(nextLesson(w, seen)).toBeNull();
  });

  it('tells about the boss two minutes in, not after it arrived', () => {
    const w = bareWorld();
    w.player.x = 500;
    const seen = new Set<LessonId>(['move', 'auto', 'gems', 'life', 'elite']);
    w.time = BOSS_LESSON_AT - 1;
    expect(nextLesson(w, seen)).toBeNull();
    w.time = BOSS_LESSON_AT;
    expect(nextLesson(w, seen)).toBe('boss');
  });
});

describe('nextLesson', () => {
  it('says nothing in the first second, then tells a hero who stands still to move', () => {
    const w = bareWorld();
    w.time = 0.5;
    expect(nextLesson(w, none)).toBeNull();
    w.time = 2;
    expect(nextLesson(w, none)).toBe('move');
  });

  it('skips the move lesson for a hero who already walked away', () => {
    const w = bareWorld();
    w.time = 2;
    w.player.x = MOVE_DONE * 2;
    expect(nextLesson(w, none)).not.toBe('move');
  });

  it('tells that weapons attack alone once they have attacked', () => {
    const w = bareWorld();
    w.player.x = 500;
    w.time = 6;
    expect(nextLesson(w, none)).toBeNull();
    w.tally.attacks = 1;
    expect(nextLesson(w, none)).toBe('auto');
  });

  it('teaches gems when one lies near the hero, not when it is far', () => {
    const w = bareWorld();
    w.player.x = 500;
    w.time = 4;
    const seen = new Set<LessonId>(['auto']);
    dropGem(w, 5000, 5000, 1);
    expect(nextLesson(w, seen)).toBeNull();
    dropGem(w, 600, 100, 1);
    expect(nextLesson(w, seen)).toBe('gems');
  });

  it('teaches life when the hero is hurt, and never a lesson twice', () => {
    const w = bareWorld();
    w.player.x = 500;
    w.time = 1;
    w.player.hp = w.player.stats.maxHp * (LIFE_SHARE - 0.1);
    expect(nextLesson(w, none)).toBe('life');
    expect(nextLesson(w, new Set<LessonId>(LESSON_IDS))).toBeNull();
  });
});

describe('lessonsSeen in the save', () => {
  it('keeps known lessons and drops the rest', () => {
    expect(sanitizeSave({ version: 2 }).lessonsSeen).toEqual([]);
    expect(sanitizeSave({ version: 2, lessonsSeen: ['move', 'nope', 3] }).lessonsSeen).toEqual(['move']);
  });
});
