import { music } from '../render/music';
import Phaser from 'phaser';
import { t } from '../i18n/pt-BR';
import { UI, bindKeys, button, dim, isShort, keyNav, label, restartOnResize, safeArea } from '../render/ui';
import { optionRow } from '../render/options';
import { StatSheet } from '../render/buildPanel';
import type { GameScene } from './GameScene';
import type { HudScene } from './HudScene';
import { buildListHeight, drawBuildList } from '../render/buildList';
import { SCENES } from './keys';

const BTN_H = 46;
const GAP = 10;
/** How long Desistir waits for the confirming press. */
const CONFIRM_MS = 2000;

/** Rows of buttons: Continuar, the options (one row), Desistir. */
const ROWS = 3;

/**
 * Continuar on top, the options in one row, and Desistir last (red, asks twice), beside or under the run's build
 * with each weapon's Elo status (one line per weapon when room is short) and, when there is room, the hero's stats.
 * The HUD stays visible above it.
 */
export class PauseScene extends Phaser.Scene {
  private confirming = false;

  constructor() {
    super(SCENES.pause);
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    this.confirming = false;
    music.duck(true);
    this.events.once('shutdown', () => music.duck(false));
    dim(this);
    this.scene.bringToTop(SCENES.hud);
    const hud = this.scene.get(SCENES.hud) as HudScene;
    hud.quiet();
    hud.setPaused(true);
    this.events.once('shutdown', () => hud.setPaused(false));
    const world = (this.scene.get(SCENES.game) as GameScene).world;
    const titleSize = 32;
    if (isShort(this) && width >= 600) {
      // Phone lying down: title and buttons on the left, the build on the right.
      const colW = Math.min(300, (width - 48) / 2);
      const lx = cx - 8 - colW / 2;
      const top = Math.max(safeArea().top + 84, hud.countersBottom + 20);
      label(this, lx, top, t.pause.title, titleSize, { bold: true, color: UI.gold, stroke: true });
      const bh = 40;
      keyNav(this, this.stack(lx, top + 30 + bh / 2, colW, bh, 6));
      const ly = top - 16;
      const room = height - ly - 8;
      drawBuildList(this, world, cx + 8, ly, colW, room, buildListHeight(world, colW) > room);
    } else if (width >= 760) {
      // Wide: the buttons and the build side by side.
      const bw = 300;
      const lw = 360;
      const total = 2 * GAP + ROWS * (BTN_H + GAP) + GAP * 2;
      const listH = buildListHeight(world, lw);
      const top = Math.max(
        hud.bottom + 36,
        height / 2 - Math.max(total + 40 + (StatSheet.heightFor(true) + 38) / 2, listH) / 2,
      );
      label(this, cx, top, t.pause.title, 36, { bold: true, color: UI.gold, stroke: true });
      const bx = cx - 12 - bw / 2;
      keyNav(this, this.stack(bx, top + 50 + BTN_H / 2, bw, BTN_H, GAP));
      drawBuildList(this, world, cx + 12, top + 50 - 4, lw);
      this.stats(world, bx - bw / 2, top + 50 + total, bw, height - safeArea().bottom - 12);
    } else {
      // Standing phone: title, the build, then the buttons (smaller when room is short).
      // List and buttons share one width (NU-03); the list goes to one line per weapon before it goes at all.
      const lw = Math.min(360, width - 32);
      const top = hud.bottom + 30;
      const bottom = height - safeArea().bottom - 12;
      const room = bottom - (top + 28);
      const buttonsH = ROWS * (BTN_H + GAP) + GAP * 2;
      const full = buildListHeight(world, lw);
      const compact = full + 12 + buttonsH > room;
      const listH = compact ? buildListHeight(world, lw, true, true) : full;
      const showList = listH + 12 + buttonsH <= room;
      label(this, cx, top, t.pause.title, titleSize, { bold: true, color: UI.gold, stroke: true });
      let y = top + 28;
      if (showList) y += drawBuildList(this, world, cx - lw / 2, y, lw, Infinity, compact) + 12;
      else y = Math.max(y, height / 2 - buttonsH / 2);
      keyNav(this, this.stack(cx, y + BTN_H / 2, lw, BTN_H, GAP));
      this.stats(world, cx - lw / 2, y + buttonsH, lw, bottom);
    }

    bindKeys(this, (kb) => {
      kb.once('keydown-ESC', () => this.resume());
      kb.once('keydown-P', () => this.resume());
    });
    restartOnResize(this);
  }

  /** Continuar, the options row and Desistir stacked from `y0` (centres); wider gaps set the options apart. */
  private stack(x: number, y0: number, w: number, h: number, gap: number): Phaser.GameObjects.Rectangle[] {
    return [
      button(this, x, y0, w, h, () => this.resume(), t.pause.resume),
      ...optionRow(this, x, y0 + h + gap * 2, w, h),
      this.quitButton(x, y0 + 2 * (h + gap) + gap * 2, w, h),
    ];
  }

  /** The hero's stats ("Atributos") from `y`, if they fit above `bottom`. */
  private stats(world: GameScene['world'], x: number, y: number, w: number, bottom: number): void {
    const h = StatSheet.heightFor(true) + 22 + 16;
    if (y + h > bottom) return;
    this.add.rectangle(x, y, w, h, UI.panel, 0.92).setOrigin(0).setStrokeStyle(2, UI.border);
    label(this, x + 10, y + 8, t.pause.stats, 14, { bold: true, color: UI.muted, align: 'left' });
    new StatSheet(this, x + 10, y + 30, w - 20, world, true);
  }

  /** Desistir in red; the first press only arms it ("Confirmar desistir") for a moment. */
  private quitButton(x: number, y: number, w: number, h: number): Phaser.GameObjects.Rectangle {
    const b = button(this, x, y, w, h, () => this.quit(b), t.pause.quit);
    (b.getData('label') as Phaser.GameObjects.Text).setColor(UI.danger);
    return b;
  }

  private resume(): void {
    this.scene.resume(SCENES.game);
    this.scene.stop();
  }

  private quit(b: Phaser.GameObjects.Rectangle): void {
    const text = b.getData('label') as Phaser.GameObjects.Text;
    if (!this.confirming) {
      this.confirming = true;
      text.setText(t.pause.quitConfirm);
      this.time.delayedCall(CONFIRM_MS, () => {
        this.confirming = false;
        text.setText(t.pause.quit);
      });
      return;
    }
    this.scene.stop(SCENES.game);
    this.scene.start(SCENES.menu);
  }
}
