import type Phaser from 'phaser';
import type { MetaSave } from '../../core/meta';

/** The Coleção's tabs, in display order. */
export const TABS = ['bestiary', 'elos', 'achievements', 'heroes'] as const;
export type TabId = (typeof TABS)[number];

/** Where a tab draws: the free area under the tab row (above Back on tall screens), and the save. */
export interface TabArea {
  scene: Phaser.Scene;
  x: number;
  y: number;
  w: number;
  h: number;
  /** A phone lying down (render/ui.ts `isShort`). */
  short: boolean;
  save: MetaSave;
}

/** What a tab gives back: its focusable buttons (keyboard order is by position), and focus hooks. */
export interface TabContent {
  buttons: Phaser.GameObjects.Rectangle[];
  /** Index (into `buttons`) focused first, or -1 to start on the tab row. */
  start?: number;
  onFocus?: (i: number) => void;
  /** Called once keyNav exists, so a tap can move the keyboard focus too. */
  bindFocus?: (focus: (i: number) => void) => void;
}
