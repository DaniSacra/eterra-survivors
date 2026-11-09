import Phaser from 'phaser';
import { heroUnlocked, stageUnlocked, unlockHero } from '../core/meta';
import type { RunSetup } from '../core/world';
import { CHARACTERS, CHARACTER_IDS, type CharacterId } from '../data/characters';
import { STAGE_IDS, type StageId } from '../data/stages';
import { t } from '../i18n/pt-BR';
import { loadSave, writeSave } from '../render/save';
import { UI, bindKeys, button, disable, isConfirm, label, restartOnResize } from '../render/ui';
import { ART_SCALE } from '../render/art/pen';
import { SCENES } from './keys';

/** The last choice, kept in the game registry so "play again" and the next visit remember it. */
export const RUN_KEY = 'run';
export type RunChoice = Required<Pick<RunSetup, 'character' | 'stage'>>;

export function lastChoice(registry: Phaser.Data.DataManager): RunChoice {
  return (registry.get(RUN_KEY) as RunChoice | undefined) ?? { character: 'aldo', stage: 'valmor' };
}

/** Pick a hero and a stage. Locked heroes are bought here; locked stages open by winning the previous one. */
export class SelectScene extends Phaser.Scene {
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
      this.registry.set(RUN_KEY, choice);
    }
    const gap = 8;
    const wrapW = Math.min(640, width - 24);

    this.add.tileSprite(0, 0, width, height, 'tile').setOrigin(0).setAlpha(0.5);
    label(this, cx, 30, t.select.title, 26, { bold: true, color: '#ffd870' });
    label(this, cx, 60, t.select.gold(save.gold), 16, { bold: true, color: '#ffd870' });

    // Heroes: 4 in a row when wide, 2 x 2 on phones.
    const hcols = width >= 600 ? 4 : 2;
    const hw = (wrapW - gap * (hcols - 1)) / hcols;
    const hh = Math.min(126, (height - 330) / (4 / hcols) - gap);
    let y = 92;
    label(this, cx - wrapW / 2, y, t.select.hero, 15, { color: UI.muted, align: 'left' });
    y += 24;
    CHARACTER_IDS.forEach((id, i) => {
      const x = cx - wrapW / 2 + (i % hcols) * (hw + gap) + hw / 2;
      const yy = y + Math.floor(i / hcols) * (hh + gap) + hh / 2;
      this.heroCard(id, x, yy, hw, hh, id === choice.character, heroUnlocked(save, id));
    });
    y += (CHARACTER_IDS.length / hcols) * (hh + gap) + 10;

    label(this, cx - wrapW / 2, y, t.select.stage, 15, { color: UI.muted, align: 'left' });
    y += 24;
    const sh = Math.min(62, (height - y - 90) / STAGE_IDS.length - gap);
    STAGE_IDS.forEach((id, i) => {
      const yy = y + i * (sh + gap) + sh / 2;
      this.stageCard(id, cx, yy, wrapW, sh, id === choice.stage, stageUnlocked(save, id));
    });

    const owned = heroUnlocked(save, choice.character);
    const cost = CHARACTERS[choice.character].cost;
    const bw = Math.min(200, (wrapW - gap) / 2);
    const by = height - 36;
    if (!this.sys.game.device.input.touch) label(this, cx, by - 38, t.select.keys, 12, { color: UI.muted });
    button(this, cx - bw / 2 - gap / 2, by, bw, 46, () => this.scene.start(SCENES.menu), t.select.back);
    const go = button(
      this,
      cx + bw / 2 + gap / 2,
      by,
      bw,
      46,
      () => this.go(),
      owned ? t.select.go : t.select.unlock(cost),
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
    this.add
      .image(x - w / 2 + 20, top + 20, CHARACTERS[id].sprite)
      .setScale(ART_SCALE * 0.9)
      .setAlpha(owned ? 1 : 0.4);
    label(this, x - w / 2 + 38, top + 9, c.name, 16, { bold: true, align: 'left' });
    label(this, x - w / 2 + 38, top + 28, c.role, 12, { color: UI.muted, align: 'left' });
    if (h < 70) return;
    const desc = owned ? c.desc : t.select.unlock(CHARACTERS[id].cost);
    const d = label(this, x - w / 2 + 10, top + 46, desc, 12, {
      color: owned ? UI.text : '#ffd870',
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
        color: '#ffd870',
        align: 'left',
        wrap: w - 20,
      },
    );
    if (sig.y + sig.height > y + h / 2 - 4) sig.destroy();
  }

  private stageCard(
    id: StageId,
    x: number,
    y: number,
    w: number,
    h: number,
    on: boolean,
    open: boolean,
  ): void {
    const s = t.stages[id];
    const card = button(this, x, y, w, h, () => open && this.pick({ stage: id }));
    card.setStrokeStyle(on ? 3 : 2, on ? UI.accent : UI.border);
    if (!open) disable(card);
    label(this, x - w / 2 + 12, y - h / 2 + 8, s.name, 16, {
      bold: true,
      align: 'left',
      color: open ? UI.text : UI.textOff,
    });
    if (h >= 44)
      label(this, x - w / 2 + 12, y - h / 2 + 29, open ? s.desc : t.select.locked, 12, {
        color: open ? UI.muted : UI.textOff,
        align: 'left',
      });
  }

  private pick(change: Partial<RunChoice>): void {
    this.registry.set(RUN_KEY, { ...lastChoice(this.registry), ...change });
    this.scene.restart();
  }

  /** Starts the run, or buys the selected hero first. */
  private go(): void {
    const choice = lastChoice(this.registry);
    const save = loadSave();
    if (!heroUnlocked(save, choice.character)) {
      if (unlockHero(save, choice.character)) writeSave(save);
      this.scene.restart();
      return;
    }
    this.registry.set(RUN_KEY, choice);
    this.scene.start(SCENES.game, choice);
  }
}
