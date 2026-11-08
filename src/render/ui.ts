import type Phaser from 'phaser';

/** Shared look for menus and overlays. */
export const UI = {
  font: 'Georgia, "Times New Roman", serif',
  text: '#e8e2d0',
  muted: '#a8a090',
  accent: 0xd8a040,
  panel: 0x161a26,
  panelHover: 0x232a3c,
  border: 0x4a5268,
  dim: 0x05060a,
};

export function label(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size: number,
  opts: { color?: string; bold?: boolean; wrap?: number; align?: 'left' | 'center' } = {},
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, text, {
      fontFamily: UI.font,
      fontSize: `${size}px`,
      fontStyle: opts.bold ? 'bold' : 'normal',
      color: opts.color ?? UI.text,
      align: opts.align ?? 'center',
      wordWrap: opts.wrap ? { width: opts.wrap } : undefined,
    })
    .setOrigin(opts.align === 'left' ? 0 : 0.5, opts.align === 'left' ? 0 : 0.5);
}

/** Clickable panel. Returns the background so callers can highlight it. */
export function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  onClick: () => void,
  text?: string,
): Phaser.GameObjects.Rectangle {
  const bg = scene.add
    .rectangle(x, y, w, h, UI.panel)
    .setStrokeStyle(2, UI.border)
    .setInteractive({ useHandCursor: true });
  // Only a press that starts on the button counts: a finger still held on the joystick when an overlay
  // opens (death, level-up) must not trigger whatever button it is lifted over.
  let armed = false;
  bg.on('pointerover', () => bg.setFillStyle(UI.panelHover));
  bg.on('pointerout', () => {
    armed = false;
    bg.setFillStyle(UI.panel);
  });
  bg.on('pointerdown', () => (armed = true));
  bg.on('pointerup', () => {
    if (!armed) return;
    armed = false;
    onClick();
  });
  if (text) label(scene, x, y, text, Math.min(22, h * 0.4), { bold: true });
  return bg;
}

/** Full-screen translucent backdrop that also swallows clicks. */
export function dim(scene: Phaser.Scene, alpha = 0.7): Phaser.GameObjects.Rectangle {
  const { width, height } = scene.scale;
  return scene.add.rectangle(0, 0, width, height, UI.dim, alpha).setOrigin(0).setInteractive();
}

/** Static overlays simply rebuild themselves when the window resizes. */
export function restartOnResize(scene: Phaser.Scene): void {
  const handler = () => scene.scene.restart(scene.scene.settings.data);
  scene.scale.on('resize', handler);
  scene.events.once('shutdown', () => scene.scale.off('resize', handler));
}

/**
 * Binds keyboard handlers shortly after an overlay opens, so the key press that opened it
 * (still queued this frame) doesn't also trigger it.
 */
export function bindKeys(
  scene: Phaser.Scene,
  bind: (kb: Phaser.Input.Keyboard.KeyboardPlugin) => void,
): void {
  scene.time.delayedCall(100, () => bind(scene.input.keyboard as Phaser.Input.Keyboard.KeyboardPlugin));
}
