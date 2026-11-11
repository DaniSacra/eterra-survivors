import type Phaser from 'phaser';
import { lastRun } from '../core/meta';
import type { RunSetup } from '../core/world';
import { loadSave, rememberChoice } from '../render/save';

/** The last choice, kept in the game registry (and in the save, for the next visit). */
export const RUN_KEY = 'run';
export type RunChoice = Required<Pick<RunSetup, 'character' | 'stage'>>;

export function lastChoice(registry: Phaser.Data.DataManager): RunChoice {
  return (registry.get(RUN_KEY) as RunChoice | undefined) ?? lastRun(loadSave());
}

/** Sets the choice for this session and remembers it in the save. */
export function setChoice(registry: Phaser.Data.DataManager, choice: RunChoice): void {
  registry.set(RUN_KEY, choice);
  rememberChoice(choice.character, choice.stage);
}
