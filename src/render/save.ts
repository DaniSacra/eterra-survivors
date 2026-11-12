import {
  newSave,
  recordRun as record,
  recordVigil as recordVigilIn,
  sanitizeSave,
  serializeSave,
  type MetaSave,
  type RunRecorded,
} from '../core/meta';
import { checkAchievements } from '../core/achievements';
import type { RunSummary } from '../core/records';
import type { CharacterId } from '../data/characters';
import type { EnemyId } from '../data/enemies';
import type { LessonId } from '../core/coach';
import type { StageId } from '../data/stages';
import { DEV_MODE } from './dev';

/** Browser persistence of the meta save. Storage may be missing or blocked: the game still runs without it. */
const KEY = DEV_MODE ? 'eterra-survivors.save.dev' : 'eterra-survivors.save'; // test mode keeps its own progress

export function loadSave(): MetaSave {
  try {
    return sanitizeSave(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
  } catch {
    return newSave();
  }
}

export function writeSave(save: MetaSave): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(serializeSave(save)));
  } catch {
    // Private mode or full storage: progress just isn't kept.
  }
}

/** Remembers that an enemy's first-time tip was shown (CU-01); never again, in any run. */
export function markTipSeen(id: EnemyId): void {
  const save = loadSave();
  if (save.tipsSeen.includes(id)) return;
  save.tipsSeen.push(id);
  writeSave(save);
}

/** Remembers that a basics lesson was taught (`core/coach.ts`); never again, in any run. */
export function markLessonSeen(id: LessonId): void {
  const save = loadSave();
  if (save.lessonsSeen.includes(id)) return;
  save.lessonsSeen.push(id);
  writeSave(save);
}

/** Records the end of a run in the stored save (core/meta.ts `recordRun`). */
export function recordRun(run: RunSummary): RunRecorded {
  const save = loadSave();
  const out = record(save, run);
  writeSave(save);
  return out;
}

/** Records the end of a Noite Sem Fim (core/meta.ts `recordVigil`); `before` is the run when the boss fell. */
export function recordVigil(run: RunSummary, before: RunSummary): RunRecorded {
  const save = loadSave();
  const out = recordVigilIn(save, run, before);
  writeSave(save);
  return out;
}

/** Remembers the hero and stage chosen, so the Preparação opens on them after a reload. */
export function rememberChoice(character: CharacterId, stage: StageId): void {
  const save = loadSave();
  if (save.lastHero === character && save.lastStage === stage) return;
  save.lastHero = character;
  save.lastStage = stage;
  writeSave(save);
}

/** Unlocks achievements an older save already earned (once, at the menu); written only if something changed. */
export function checkStoredAchievements(): void {
  const save = loadSave();
  if (checkAchievements(save).length > 0) writeSave(save);
}
