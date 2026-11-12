import { selectBackdrop } from '../render/backdrop';
import Phaser from 'phaser';
import { devTag } from '../render/dev';
import { formatTime } from '../core/format';
import { heroUnlocked, newHeroRecord, unlockHero, type MetaSave } from '../core/meta';
import { CHARACTERS, CHARACTER_IDS, type CharacterId } from '../data/characters';
import type { StatKey } from '../data/config';
import { formatStatDelta } from '../render/describe';
import { t } from '../i18n/pt-BR';
import { loadSave, writeSave } from '../render/save';
import { ART_SCALE } from '../render/art/pen';
import { UI, backButton, button, disable, isShort, keyNav, label, restartOnResize } from '../render/ui';
import { lastChoice, setChoice } from './choice';
import { SCENES } from './keys';

/** After buying a hero, the rows wait this long (ms) before they can pick one (a double tap must not start). */
const BUY_READY_MS = 250;
/** Height of the front-facing hero sprite (art px), shown 1:1 or 2:1. */
const FRONT_H = 72;
const FRONT_W = 56;
/** Tallest row, and the shortest one a phone standing up scrolls rather than squeezes. */
const ROW_MAX = 170;
const ROW_MIN = 144;
/** A press that moves more than this many px is a scroll, not a tap. */
const DRAG = 8;

/**
 * The heroes, one under the other (Começar opens it): the sprite big at a whole-number scale, name, class, what
 * sets them apart, their first weapon, their record and, when locked, the price (two taps to buy, as in the Loja).
 * Picking one leads to the stage screen. On a phone standing up the list scrolls when it does not fit.
 */
export class HeroesScene extends Phaser.Scene {
  /** The locked hero whose price was tapped once: the next tap buys. */
  private buying: CharacterId | null = null;
  private readyAt = 0;
  private content!: Phaser.GameObjects.Container;
  private scroll = 0;
  private maxScroll = 0;
  private viewTop = 0;
  private viewH = 0;
  private dragged = false;

  constructor() {
    super(SCENES.heroes);
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const save = loadSave();
    const choice = lastChoice(this.registry);
    const short = isShort(this);
    const wrapW = Math.min(640, width - 24);
    const gap = 8;
    this.scroll = 0;

    selectBackdrop(this);
    label(this, cx, short ? 22 : 30, t.heroes.title, short ? 22 : 26, { bold: true, color: UI.gold });
    const cheapest = Math.min(
      ...CHARACTER_IDS.filter((id) => !heroUnlocked(save, id)).map((id) => CHARACTERS[id].cost),
    );
    const needGold = Number.isFinite(cheapest) && save.gold < cheapest;
    if (!short)
      label(this, cx, 58, needGold ? t.heroes.earnGold : t.heroes.pick, 14, {
        color: needGold ? UI.gold : UI.muted,
      });
    label(this, short ? cx + wrapW / 2 : cx, short ? 22 : 80, t.select.gold(save.gold), 15, {
      bold: true,
      color: UI.gold,
    }).setOrigin(short ? 1 : 0.5, 0.5);

    // Rows: one column, or two when the screen is wide and low (a phone lying down).
    const cols = short && width >= 600 ? 2 : 1;
    const rows = CHARACTER_IDS.length / cols;
    const rowW = (wrapW - gap * (cols - 1)) / cols;
    const top = short ? 44 : 96;
    const bottom = short ? height - 8 : height - 70;
    const fit = Math.floor((bottom - top - gap * (rows - 1)) / rows);
    const rowH = Math.max(ROW_MIN, Math.min(ROW_MAX, fit));
    const scale = cols === 1 && rowH >= FRONT_H * 2 + 12 ? 2 : 1;
    this.viewTop = top;
    this.viewH = bottom - top;
    this.maxScroll = Math.max(0, rows * (rowH + gap) - gap - this.viewH);

    this.content = this.add.container(0, 0);
    const buttons: Phaser.GameObjects.Rectangle[] = [];
    CHARACTER_IDS.forEach((id, i) => {
      const x = cx - wrapW / 2 + (i % cols) * (rowW + gap) + rowW / 2;
      const y = top + Math.floor(i / cols) * (rowH + gap) + rowH / 2;
      const from = this.children.length;
      buttons.push(this.row(id, x, y, rowW, rowH, scale, save, id === choice.character));
      this.content.add(this.children.list.slice(from));
    });
    if (this.maxScroll > 0) this.makeScrollable(width);

    backButton(this, t.select.back, () => this.scene.start(SCENES.menu));
    if (!this.sys.game.device.input.touch && !short)
      label(this, cx, height - 74 + 0, t.heroes.keys, 12, { color: UI.muted }).setVisible(false);
    const start = Math.max(0, CHARACTER_IDS.indexOf(choice.character));
    keyNav(this, buttons, 1, start, (i) => this.reveal(i, rowH, gap));
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start(SCENES.menu));
    devTag(this);
    restartOnResize(this);
  }

  /** One hero's row; returns the button the keyboard and the pointer press. */
  private row(
    id: CharacterId,
    x: number,
    y: number,
    w: number,
    h: number,
    scale: number,
    save: MetaSave,
    on: boolean,
  ): Phaser.GameObjects.Rectangle {
    const def = CHARACTERS[id];
    const c = t.characters[id];
    const owned = heroUnlocked(save, id);
    const left = x - w / 2;
    const topY = y - h / 2;
    const poor = !owned && save.gold < def.cost;
    const bg = button(this, x, y, w, h, () => this.press(id, owned));
    bg.setStrokeStyle(on ? 3 : 2, on ? UI.accent : UI.border);
    if (poor) disable(bg);

    // The hero standing on the row's floor, a whole number of times its size.
    const sx = left + 12 + (FRONT_W * scale) / 2;
    const key = `${def.sprite}.front`;
    this.add.ellipse(sx, topY + h - 12, FRONT_W * scale * 0.7, 8 * scale, 0x05040f, 0.45);
    this.add
      .image(sx, topY + h - 10, key)
      .setOrigin(0.5, 1)
      .setScale(scale)
      .setAlpha(owned ? 1 : 0.4)
      .texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

    const tx = left + 12 + FRONT_W * scale + 14;
    const tw = w - (tx - left) - 12;
    label(this, tx, topY + 10, c.name, 20, { bold: true, align: 'left' });
    label(this, tx, topY + 34, c.role, 13, { color: UI.muted, align: 'left' });
    const stats = (Object.keys(def.stats) as StatKey[])
      .map((k) => formatStatDelta(k, (def.stats as Partial<Record<StatKey, number>>)[k] as number))
      .join(t.sep);
    label(this, tx, topY + 54, `${t.heroes.advantage}: ${stats}`, 13, { align: 'left', wrap: tw });
    const iy = topY + h - 46;
    this.add.image(tx + 10, iy, `icon.${def.weapon}`).setScale(ART_SCALE);
    label(this, tx + 26, iy, t.select.signature(t.weapons[def.weapon].name), 13, {
      color: UI.gold,
      bold: true,
      align: 'left',
      wrap: tw - 26,
    }).setOrigin(0, 0.5);
    if (owned) {
      const rec = save.records[id] ?? newHeroRecord();
      const wins = Object.values(rec.wins).reduce((n, v) => n + (v ?? 0), 0);
      label(
        this,
        tx,
        topY + h - 20,
        rec.runs > 0 ? t.heroes.record(wins, formatTime(rec.bestTime)) : t.heroes.noRuns,
        12,
        {
          color: UI.muted,
          align: 'left',
        },
      ).setOrigin(0, 0.5);
    } else {
      // The padlock over the hero (the stage cards' one) and a gold bar: how far the vault is from the price.
      this.add.image(sx, topY + h * 0.66, 'icon.lock').setScale(ART_SCALE * 1.4);
      const ask =
        this.buying === id
          ? t.select.confirmUnlock(def.cost)
          : poor
            ? t.select.progress(save.gold, def.cost)
            : t.select.unlock(def.cost);
      const by = topY + h - 18;
      const fill = Math.min(1, save.gold / def.cost);
      this.add.rectangle(tx, by, tw, 18, 0x05040f, 0.8).setOrigin(0, 0.5).setStrokeStyle(2, UI.border);
      this.add
        .rectangle(tx + 2, by, Math.max(0, (tw - 4) * fill), 14, poor ? 0x8a6a1c : UI.accent)
        .setOrigin(0, 0.5);
      label(this, tx + tw / 2, by, ask, 13, { bold: true, color: poor ? UI.text : UI.gold });
    }
    return bg;
  }

  /** A tap on a row: an owned hero is chosen and leads to the stages; a locked one is bought in two taps. */
  private press(id: CharacterId, owned: boolean): void {
    if (this.dragged || this.game.loop.time < this.readyAt) return;
    if (owned) {
      setChoice(this.registry, { ...lastChoice(this.registry), character: id });
      this.scene.start(SCENES.stages);
      return;
    }
    if (this.buying !== id) this.buying = id;
    else {
      this.buying = null;
      const save = loadSave();
      if (unlockHero(save, id)) writeSave(save);
      this.readyAt = this.game.loop.time + BUY_READY_MS;
    }
    this.scene.restart();
  }

  /** Drag and wheel scroll the rows under a mask, for a screen too low for all four. */
  private makeScrollable(width: number): void {
    const mask = this.make.graphics({}, false);
    mask.fillStyle(0xffffff).fillRect(0, this.viewTop, width, this.viewH);
    this.content.setMask(mask.createGeometryMask());
    let startY = 0;
    let startScroll = 0;
    let down = false;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      down = true;
      this.dragged = false;
      startY = p.y;
      startScroll = this.scroll;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!down) return;
      if (Math.abs(p.y - startY) > DRAG) this.dragged = true;
      if (this.dragged) this.scrollTo(startScroll + startY - p.y);
    });
    this.input.on('pointerup', () => {
      down = false;
      // The tap that ends a drag must not press the row under it (its pointerup fires first).
      this.time.delayedCall(0, () => (this.dragged = false));
    });
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) =>
      this.scrollTo(this.scroll + dy),
    );
  }

  private scrollTo(v: number): void {
    this.scroll = Phaser.Math.Clamp(v, 0, this.maxScroll);
    this.content.y = -this.scroll;
  }

  /** Scrolls so the keyboard's row is in view. */
  private reveal(i: number, rowH: number, gap: number): void {
    if (this.maxScroll <= 0) return;
    const rowTop = i * (rowH + gap);
    if (rowTop < this.scroll) this.scrollTo(rowTop);
    else if (rowTop + rowH > this.scroll + this.viewH) this.scrollTo(rowTop + rowH - this.viewH);
  }
}
