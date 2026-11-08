import Phaser from 'phaser';
import { formatTime } from '../core/format';
import type { World } from '../core/world';
import type { StageId } from '../data/stages';
import { t } from '../i18n/pt-BR';
import { UI, button, dim, label, restartOnResize, bindKeys } from '../render/ui';
import { SCENES } from './keys';

/** Game over or victory, over the frozen battlefield. */
export class EndScene extends Phaser.Scene {
  private world!: World;
  private unlocked: StageId | null = null;

  constructor() {
    super(SCENES.end);
  }

  init(data: { world: World; unlocked?: StageId | null }): void {
    this.world = data.world;
    this.unlocked = data.unlocked ?? null;
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const w = this.world;
    const won = w.state === 'won';
    const bw = Math.min(260, width - 60);
    dim(this, 0.8);
    label(this, cx, height * 0.22, won ? t.end.won : t.end.lost, 40, {
      bold: true,
      color: won ? '#ffd870' : '#ff8090',
    });
    label(
      this,
      cx,
      height * 0.32,
      won ? t.stages[w.stageId].won : t.end.lostText(t.characters[w.character].name),
      17,
      {
        wrap: Math.min(420, width - 40),
      },
    );
    const rows: [string, string][] = [
      [t.end.time, formatTime(w.time)],
      [t.end.kills, String(w.kills)],
      [t.end.level, String(w.level)],
      [t.end.gold, String(w.gold)],
    ];
    rows.forEach(([k, v], i) => {
      const y = height * 0.44 + i * 30;
      label(this, cx - 10, y, k, 18, { color: UI.muted }).setOrigin(1, 0.5);
      label(this, cx + 10, y, v, 18, { bold: true }).setOrigin(0, 0.5);
    });
    if (this.unlocked)
      label(
        this,
        cx,
        height * 0.44 + rows.length * 30 + 8,
        t.end.unlocked(t.stages[this.unlocked].name),
        16,
        {
          bold: true,
          color: '#ffd870',
        },
      );
    button(this, cx, height * 0.7, bw, 52, () => this.again(), t.end.again);
    button(this, cx, height * 0.7 + 64, bw, 52, () => this.toMenu(), t.end.menu);

    bindKeys(this, (kb) => {
      kb.once('keydown-ENTER', () => this.again());
      kb.once('keydown-ESC', () => this.toMenu());
    });
    restartOnResize(this);
  }

  /** Same hero, same stage. */
  private again(): void {
    this.scene.start(SCENES.game, { character: this.world.character, stage: this.world.stageId });
  }

  private toMenu(): void {
    this.scene.stop(SCENES.game);
    this.scene.start(SCENES.menu);
  }
}
