import type Phaser from 'phaser';
import { t } from '../i18n/pt-BR';

/** The loading screen: a label and a bar that follow the scene's loader. Call in `preload`, before the files are queued. */
export function loadingBar(scene: Phaser.Scene): void {
  const { width, height } = scene.scale;
  const cx = width / 2;
  const cy = height / 2;
  const barW = Math.min(280, width - 60);
  const text = scene.add
    .text(cx, cy - 26, t.boot.loading(0), {
      fontFamily: '"Jersey 15", serif',
      fontSize: '26px',
      color: '#f0e6c8',
    })
    .setOrigin(0.5);
  const frame = scene.add.rectangle(cx, cy + 6, barW + 4, 14, 0x1b2236).setStrokeStyle(2, 0x3a4766);
  const fill = scene.add.rectangle(cx - barW / 2, cy + 6, 2, 8, 0xffc040).setOrigin(0, 0.5);
  const progress = (p: number): void => {
    fill.width = Math.max(2, barW * p);
    text.setText(t.boot.loading(Math.round(p * 100)));
  };
  scene.load.on('progress', progress);
  // The scene goes on to draw its own screen: the bar leaves with the loading.
  scene.load.once('complete', () => {
    scene.load.off('progress', progress);
    [text, frame, fill].forEach((o) => o.destroy());
  });
}
