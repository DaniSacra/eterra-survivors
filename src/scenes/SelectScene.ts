import Phaser from 'phaser';
import { devTag } from '../render/dev';
import { heroUnlocked, lastRun, stageUnlocked, unlockHero } from '../core/meta';
import type { RunSetup } from '../core/world';
import { CHARACTERS, CHARACTER_IDS, type CharacterId } from '../data/characters';
import { STAGES, STAGE_IDS, type StageId } from '../data/stages';
import type { StatKey } from '../data/config';
import { formatStatDelta } from '../render/describe';
import { HERO_COLOR } from '../render/fx';
import { t } from '../i18n/pt-BR';
import { loadSave, rememberChoice, writeSave } from '../render/save';
import {
  UI,
  bindKeys,
  button,
  disable,
  isConfirm,
  isShort,
  label,
  restartOnResize,
  seal,
} from '../render/ui';
import { ART_SCALE } from '../render/art/pen';
import { SCENES } from './keys';

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

/** Pick a hero and a stage. Locked heroes are bought here; locked stages open by winning the previous one. */
/** After buying a hero, the main button waits this long (ms) before it can start the run (as the Loja's). */
const BUY_READY_MS = 250;

export class SelectScene extends Phaser.Scene {
  /** The locked hero whose price was tapped once: the next tap buys (two steps, as in the Loja). */
  private buying: CharacterId | null = null;
  /** Game time before which the main button ignores taps (right after a purchase, so a double tap can't start). */
  private readyAt = 0;

  constructor() {
    super(SCENES.select);
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const save = loadSave();
    const choice = lastChoice(this.registry);
    if (!stageUnlocked(save, choice.stage)) {
      choice.stage = 'valmor';
      setChoice(this.registry, choice);
    }
    const gap = 8;
    const wrapW = Math.min(640, width - 24);

    // Phone lying down: title and gold share the top row, and every card is a bit shorter.
    const short = isShort(this);
    this.add.tileSprite(0, 0, width, height, 'tile').setOrigin(0).setAlpha(0.5);
    label(this, cx, short ? 26 : 30, t.select.title, short ? 24 : 26, { bold: true, color: UI.gold });
    label(this, short ? cx + wrapW / 2 : cx, short ? 26 : 60, t.select.gold(save.gold), 16, {
      bold: true,
      color: UI.gold,
    }).setOrigin(short ? 1 : 0.5, 0.5);

    // Heroes: 4 in a row when wide, 2 x 2 on phones.
    const hcols = width >= 600 ? 4 : 2;
    const hw = (wrapW - gap * (hcols - 1)) / hcols;
    const hh = short
      ? Math.max(56, Math.min(126, height - 330))
      : Math.min(126, (height - 330) / (4 / hcols) - gap);
    let y = short ? 48 : 92;
    label(this, cx - wrapW / 2, y, t.select.hero, 15, { color: UI.muted, align: 'left' });
    y += short ? 22 : 24;
    CHARACTER_IDS.forEach((id, i) => {
      const x = cx - wrapW / 2 + (i % hcols) * (hw + gap) + hw / 2;
      const yy = y + Math.floor(i / hcols) * (hh + gap) + hh / 2;
      this.heroCard(id, x, yy, hw, hh, id === choice.character, heroUnlocked(save, id));
    });
    y += (CHARACTER_IDS.length / hcols) * (hh + gap) + (short ? 6 : 10);

    label(this, cx - wrapW / 2, y, t.select.stage, 15, { color: UI.muted, align: 'left' });
    y += short ? 22 : 24;
    const by = short ? height - 28 : height - 36;
    // Stage cards never shorter than their name (36 px); the description shows from 44 px.
    const sh = Math.max(36, Math.min(62, (by - y - (short ? 30 : 54)) / STAGE_IDS.length - gap));
    STAGE_IDS.forEach((id, i) => {
      const yy = y + i * (sh + gap) + sh / 2;
      this.stageCard(
        id,
        cx,
        yy,
        wrapW,
        sh,
        id === choice.stage,
        stageUnlocked(save, id),
        save.cleared.includes(id),
      );
    });
    y += STAGE_IDS.length * (sh + gap) + 8;

    // The chosen hero, big, with what makes them different, in the space left above the buttons.
    const room = by - 23 - 30 - y;
    if (room >= 78) this.heroDetail(choice.character, cx, y, wrapW, Math.min(170, room));

    const owned = heroUnlocked(save, choice.character);
    const cost = CHARACTERS[choice.character].cost;
    const bw = Math.min(200, (wrapW - gap) / 2);
    const bh = short ? 44 : 46;
    if (!this.sys.game.device.input.touch && !short)
      label(this, cx, by - 38, t.select.keys, 12, { color: UI.muted });
    // The main action on the left (focused look), Back on the right, as on the end screen.
    button(this, cx + bw / 2 + gap / 2, by, bw, bh, () => this.scene.start(SCENES.menu), t.select.back);
    const go = button(
      this,
      cx - bw / 2 - gap / 2,
      by,
      bw,
      bh,
      () => this.go(),
      owned
        ? t.select.go
        : this.buying === choice.character
          ? t.select.confirmUnlock(cost)
          : t.select.unlock(cost),
    );
    if (!owned && save.gold < cost) disable(go);
    else go.setStrokeStyle(3, UI.accent);

    // Keyboard: left/right (A/D) change hero, up/down (W/S) change stage among the open ones.
    const open = STAGE_IDS.filter((id) => stageUnlocked(save, id));
    const cycle = <T>(list: readonly T[], cur: T, d: number): T =>
      list[(list.indexOf(cur) + d + list.length) % list.length] as T;
    bindKeys(this, (kb) =>
      kb.on('keydown', (e: KeyboardEvent) => {
        if (e.repeat) return;
        const k = e.key.toLowerCase();
        if (k === 'arrowleft' || k === 'a')
          this.pick({ character: cycle(CHARACTER_IDS, choice.character, -1) });
        else if (k === 'arrowright' || k === 'd')
          this.pick({ character: cycle(CHARACTER_IDS, choice.character, 1) });
        else if (k === 'arrowup' || k === 'w') this.pick({ stage: cycle(open, choice.stage, -1) });
        else if (k === 'arrowdown' || k === 's') this.pick({ stage: cycle(open, choice.stage, 1) });
        else if (isConfirm(e)) this.go();
        else if (k === 'escape') this.scene.start(SCENES.menu);
      }),
    );
    devTag(this);
    restartOnResize(this);
  }

  private heroCard(
    id: CharacterId,
    x: number,
    y: number,
    w: number,
    h: number,
    on: boolean,
    owned: boolean,
  ): void {
    const c = t.characters[id];
    const card = button(this, x, y, w, h, () => this.pick({ character: id }));
    card.setStrokeStyle(on ? 3 : 2, on ? UI.accent : UI.border);
    const top = y - h / 2;
    // The hero standing in the card's corner, feet on its line, big enough to tell who it is.
    this.add
      .image(x - w / 2 + 23, top + Math.min(58, h - 2), CHARACTERS[id].sprite)
      .setOrigin(0.5, 1)
      .setScale(ART_SCALE * 1.2)
      .setAlpha(owned ? 1 : 0.4);
    label(this, x - w / 2 + 46, top + 9, c.name, 16, { bold: true, align: 'left' });
    label(this, x - w / 2 + 46, top + 28, c.role, 12, { color: UI.muted, align: 'left' });
    if (h < 70) return;
    const desc = owned ? c.desc : t.select.unlock(CHARACTERS[id].cost);
    const d = label(this, x - w / 2 + 10, top + 58, desc, 12, {
      color: owned ? UI.text : UI.gold,
      align: 'left',
      wrap: w - 20,
    });
    // The signature weapon, right under the description's real (wrapped) height, if it fits.
    const sig = label(
      this,
      x - w / 2 + 10,
      d.y + d.height + 4,
      t.select.signature(t.weapons[CHARACTERS[id].weapon].name),
      12,
      {
        color: UI.gold,
        align: 'left',
        wrap: w - 20,
      },
    );
    if (sig.y + sig.height > y + h / 2 - 4) sig.destroy();
  }

  private heroDetail(id: CharacterId, cx: number, top: number, w: number, h: number): void {
    const def = CHARACTERS[id];
    const c = t.characters[id];
    this.add.rectangle(cx, top, w, h, UI.panel, 0.85).setOrigin(0.5, 0).setStrokeStyle(2, HERO_COLOR[id]);
    const big = Math.min(2.6, (h - 34) / 46);
    const left = cx - w / 2;
    this.add.ellipse(left + 52, top + h - 18, 70, 18, HERO_COLOR[id], 0.3);
    this.add
      .image(left + 52, top + h - 16, def.sprite)
      .setOrigin(0.5, 1)
      .setScale(ART_SCALE * big);
    const x = left + 108;
    // Short panels (wide screens) drop the role line, which the hero card already shows.
    const compact = h < 120;
    label(this, x, top + (compact ? 8 : 12), c.name, compact ? 19 : 22, { bold: true, align: 'left' });
    if (!compact) label(this, x, top + 40, c.role, 14, { color: UI.muted, align: 'left' });
    const stats = (Object.keys(def.stats) as StatKey[])
      .map((k) => formatStatDelta(k, (def.stats as Partial<Record<StatKey, number>>)[k] as number))
      .join(t.sep);
    const st = label(this, x, top + (compact ? 34 : 62), stats, 14, { align: 'left', wrap: w - 120 });
    const iy = compact ? top + h - 18 : Math.min(top + h - 26, st.y + st.height + 22);
    this.add.image(x + 14, iy, `icon.${def.weapon}`).setScale(ART_SCALE * 1.1);
    label(this, x + 34, iy, t.weapons[def.weapon].name, 14, {
      color: UI.gold,
      bold: true,
      align: 'left',
    }).setOrigin(0, 0.5);
  }

  private stageCard(
    id: StageId,
    x: number,
    y: number,
    w: number,
    h: number,
    on: boolean,
    open: boolean,
    cleared: boolean,
  ): void {
    const s = t.stages[id];
    const card = button(this, x, y, w, h, () => open && this.pick({ stage: id }));
    card.setStrokeStyle(on ? 3 : 2, on ? UI.accent : UI.border);
    if (!open) disable(card);
    // A window onto the stage's ground; a padlock while it is closed.
    const th = h - 12;
    const tx = x - w / 2 + 6 + th / 2;
    this.add
      .tileSprite(tx, y, th, th, STAGES[id].tile)
      .setAlpha(open ? 1 : 0.4)
      .setTilePosition(20, 20);
    this.add.rectangle(tx, y, th, th).setStrokeStyle(1.5, open ? UI.border : UI.borderOff);
    if (!open) this.add.image(tx, y, 'icon.lock').setScale(ART_SCALE * Math.min(1.6, th / 26));
    const tl = x - w / 2 + 14 + th;
    label(this, tl, y - h / 2 + 8, s.name, 16, {
      bold: true,
      align: 'left',
      color: open ? UI.text : UI.textOff,
    });
    // Vencida: the same seal as the shop's Completo, top right.
    if (cleared) seal(this, x + w / 2 - 10, y - h / 2 + 16, t.select.cleared);
    if (h >= 44)
      label(this, tl, y - h / 2 + 29, open ? s.desc : t.select.locked, 12, {
        color: open ? UI.muted : UI.textOff,
        align: 'left',
        wrap: w - (tl - (x - w / 2)) - 10,
      });
  }

  private pick(change: Partial<RunChoice>): void {
    this.buying = null;
    setChoice(this.registry, { ...lastChoice(this.registry), ...change });
    this.scene.restart();
  }

  /** Starts the run, or buys the selected hero first. */
  private go(): void {
    if (this.game.loop.time < this.readyAt) return;
    const choice = lastChoice(this.registry);
    const save = loadSave();
    if (!heroUnlocked(save, choice.character)) {
      if (this.buying !== choice.character) this.buying = choice.character;
      else {
        this.buying = null;
        if (unlockHero(save, choice.character)) writeSave(save);
        this.readyAt = this.game.loop.time + BUY_READY_MS;
      }
      this.scene.restart();
      return;
    }
    setChoice(this.registry, choice);
    this.scene.start(SCENES.game, choice);
  }
}
