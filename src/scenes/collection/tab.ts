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
  /** The tab's own page (e.g. the achievement group) and focus, kept when it rebuilds. */
  page?: string;
  focus?: number;
  /** Rebuilds the tab on `page`, focusing content button `focus`. */
  reopen: (page: string | undefined, focus?: number) => void;
}

/** What a tab gives back: its focusable buttons (keyboard order is by position), and focus hooks. */
export interface TabContent {
  buttons: Phaser.GameObjects.Rectangle[];
  /** Index (into `buttons`) focused first, or -1 to start on the tab row. */
  start?: number;
  /** `prev` is the content index focused before, or -1 (the tabs or Back). */
  onFocus?: (i: number, prev: number) => void;
  /** Called once keyNav exists, so a tap can move the keyboard focus too. */
  bindFocus?: (focus: (i: number) => void) => void;
  /** What Back (and Esc) do while this content is open, instead of leaving the Coleção (an Elo's page). */
  back?: () => void;
}
