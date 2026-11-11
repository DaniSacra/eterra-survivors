import Phaser from 'phaser';
import { devTag } from '../render/dev';
import { stageUnlocked } from '../core/meta';
import { ENEMIES } from '../data/enemies';
import { STAGES, STAGE_IDS, type StageId } from '../data/stages';
import { t } from '../i18n/pt-BR';
import { loadSave } from '../render/save';
import { UI, backButton, button, isShort, keyNav, label, restartOnResize } from '../render/ui';
import { lastChoice, setChoice } from './choice';
import { SCENES } from './keys';

/** A stage's story: a larger illustration, a short text, the end boss, then Partir (starts the run) or Voltar. */
export class StoryScene extends Phaser.Scene {
  private stage: StageId = 'valmor';

  constructor() {
    super(SCENES.story);
  }

  init(data: { stage?: StageId }): void {
    this.stage = data.stage ?? lastChoice(this.registry).stage;
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const short = isShort(this);
    const id = this.stage;
    const def = STAGES[id];
    const s = t.stages[id];
    const open = stageUnlocked(loadSave(), id);
    const wrapW = Math.min(640, width - 24);
    this.add.tileSprite(0, 0, width, height, 'tile').setOrigin(0).setAlpha(0.5);
    label(this, cx, short ? 22 : 30, s.name, short ? 20 : 24, { bold: true, color: UI.gold, wrap: wrapW });

    // Wide and low: the picture on the left, the text on the right. Otherwise the picture on top.
    const side = short && width >= 600;
    const top = short ? 44 : 64;
    const picW = side ? Math.floor(wrapW * 0.45) : wrapW;
    const picH = side ? height - top - 70 : Math.min(260, Math.floor(height * 0.34));
    const px = side ? cx - wrapW / 2 + picW / 2 : cx;
    const py = top + picH / 2;
    this.add.tileSprite(px, py, picW, picH, def.tile).setTilePosition(20, 20);
    this.add.rectangle(px, py, picW, picH).setStrokeStyle(2, UI.border);
    const boss = this.add.image(px, py + picH / 2 - 8, ENEMIES[def.boss.id].sprite).setOrigin(0.5, 1);
    boss.setScale(Math.min(1.5, (picH - 16) / boss.height, (picW - 16) / boss.width));
    boss.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

    const tx = side ? px + picW / 2 + 16 : cx - wrapW / 2;
    const tw = side ? wrapW - picW - 16 : wrapW;
    const ty = side ? top + 6 : top + picH + 14;
    const body = open
      ? s.desc /* placeholder until Daniel approves the stage stories */
      : t.stageScreen.unlockBy(t.stages[STAGES_BEFORE(id)].name);
    const text = label(this, tx, ty, body, 14, {
      align: 'left',
      wrap: tw,
      color: open ? UI.text : UI.textOff,
    });
    label(this, tx, ty + text.height + 12, t.stageScreen.boss(t.enemies[def.boss.id]), 14, {
      bold: true,
      color: UI.gold,
      align: 'left',
    });

    const buttons: Phaser.GameObjects.Rectangle[] = [];
    if (open) {
      buttons.push(button(this, cx, height - (short ? 30 : 92), 220, 44, () => this.go(), t.stageScreen.go));
    }
    backButton(this, t.select.back, () => this.scene.start(SCENES.stages));
    keyNav(this, buttons, 1, 0);
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start(SCENES.stages));
    devTag(this);
    restartOnResize(this);
  }

  private go(): void {
    const choice = { ...lastChoice(this.registry), stage: this.stage };
    setChoice(this.registry, choice);
    this.scene.start(SCENES.game, choice);
  }
}

const STAGES_BEFORE = (id: StageId): StageId => STAGE_IDS[Math.max(0, STAGE_IDS.indexOf(id) - 1)] as StageId;
