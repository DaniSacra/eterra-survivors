import Phaser from 'phaser';
import { t } from '../i18n/pt-BR';
import { loadSave } from '../render/save';
import {
  UI,
  backButton,
  bindKeys,
  button,
  isShort,
  keyNav,
  label,
  newsDot,
  restartOnResize,
  safeArea,
} from '../render/ui';
import { drawElos } from './collection/elos';
import { TABS, type TabArea, type TabContent, type TabId } from './collection/tab';
import { SCENES } from './keys';

/** The last tab open, so the Coleção reopens on it. */
const TAB_KEY = 'collection.tab';

const DRAW: Record<TabId, (a: TabArea) => TabContent> = {
  bestiary: () => ({ buttons: [] }),
  elos: drawElos,
  achievements: () => ({ buttons: [] }),
  heroes: () => ({ buttons: [] }),
};

/** Coleção: Bestiário, Livro de Elos, Conquistas and Heróis, one tab at a time. */
export class CollectionScene extends Phaser.Scene {
  private tab: TabId = 'bestiary';
  /** Opened from the tab row by the keyboard: the focus stays on the tabs. */
  private fromTabs = false;

  constructor() {
    super(SCENES.collection);
  }

  init(data: { tab?: TabId; fromTabs?: boolean }): void {
    this.tab = data.tab ?? (this.registry.get(TAB_KEY) as TabId | undefined) ?? 'bestiary';
    this.fromTabs = data.fromTabs ?? false;
    this.registry.set(TAB_KEY, this.tab);
  }

  create(): void {
    const { width, height } = this.scale;
    const safe = safeArea();
    const short = isShort(this);
    const save = loadSave();
    this.add.tileSprite(0, 0, width, height, 'tile').setOrigin(0).setAlpha(0.5);

    // Phone lying down: Back in the corner and the tabs beside it, no title. Else the title over the tabs.
    const back = backButton(this, t.shop.back, () => this.back());
    let tabsX: number;
    let tabsW: number;
    let tabsY: number;
    if (short) {
      tabsX = back.x + back.width / 2 + 12;
      tabsW = Math.min(560, width - safe.right - 12 - tabsX);
      tabsY = 28;
    } else {
      label(this, width / 2, 30, t.collection.title, 28, { bold: true, color: UI.gold });
      tabsW = Math.min(560, width - 24);
      tabsX = (width - tabsW) / 2;
      tabsY = 76;
    }
    const tabs = this.tabRow(tabsX, tabsY, tabsW, save.fresh.length > 0);

    const gutter = 12;
    const top = tabsY + 20 + (short ? 8 : 12);
    const area: TabArea = {
      scene: this,
      x: safe.left + gutter,
      y: top,
      w: width - safe.left - safe.right - gutter * 2,
      h: height - top - (short ? 8 : 66),
      short,
      save,
    };
    const content = DRAW[this.tab](area);

    const all = [...tabs, ...content.buttons, back];
    const n = tabs.length;
    const current = TABS.indexOf(this.tab);
    const start =
      this.fromTabs || content.buttons.length === 0 || (content.start ?? 0) < 0
        ? current
        : n + (content.start ?? 0);
    const nav = keyNav(this, all, 0, start, (i, prev) => {
      // Left and right along the tab row switch tabs right away.
      if (i < n && prev < n && i !== current) this.open(TABS[i] as TabId, true);
      else if (i >= n && i < n + content.buttons.length) content.onFocus?.(i - n);
    });
    content.bindFocus?.((i) => nav.focus(n + i));
    bindKeys(this, (kb) => {
      kb.once('keydown-ESC', () => this.back());
      // Q and E (and Page Up / Page Down) switch tabs from anywhere.
      const shift = (d: number) => this.open(TABS[(current + d + TABS.length) % TABS.length] as TabId);
      kb.on('keydown-Q', () => shift(-1));
      kb.on('keydown-E', () => shift(1));
      kb.on('keydown-PAGE_UP', () => shift(-1));
      kb.on('keydown-PAGE_DOWN', () => shift(1));
    });
    restartOnResize(this);
  }

  /** The four tabs: the open one in gold with a gold bar under it; a gold dot on Conquistas when there is news. */
  private tabRow(x: number, y: number, w: number, news: boolean): Phaser.GameObjects.Rectangle[] {
    const gap = 6;
    const tw = (w - gap * (TABS.length - 1)) / TABS.length;
    return TABS.map((id, i) => {
      const tx = x + i * (tw + gap) + tw / 2;
      const open = id === this.tab;
      const bg = button(this, tx, y, tw, 40, () => this.open(id));
      label(this, tx, y, t.collection.tabs[id], tw < 100 ? 14 : 15, {
        bold: true,
        color: open ? UI.gold : UI.muted,
      });
      if (open) this.add.rectangle(tx, y + 17, tw - 12, 3, UI.goldHex);
      if (news && id === 'achievements') newsDot(this, tx + tw / 2 - 6, y - 14);
      return bg;
    });
  }

  private open(tab: TabId, fromTabs = false): void {
    if (tab === this.tab && !fromTabs) return;
    this.scene.restart({ tab, fromTabs });
  }

  private back(): void {
    this.scene.start(SCENES.menu);
  }
}
