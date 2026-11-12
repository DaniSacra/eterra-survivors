import type Phaser from 'phaser';

/**
 * The Menu's painted dusk (mountains, village, snow) at a low alpha behind a screen of boxes, over the ground tile, so
 * Opções and Loja are not a column of panels on a repeated floor (PA-05). Whole-number scale (one pixel density).
 */
export function homeBackdrop(scene: Phaser.Scene, strength = 1): void {
  const { width, height } = scene.scale;
  const k = width > 512 ? 2 : 1;
  const layers: { key: string; y: number; alpha: number; tint: number }[] = [
    { key: 'home.mountains', y: height * 0.46, alpha: 0.36, tint: 0xd0c0f0 },
    { key: 'home.village', y: height * 0.82, alpha: 0.34, tint: 0xd2cef0 },
    { key: 'home.foreground', y: height + 8, alpha: 0.42, tint: 0xbcb8e4 },
  ];
  for (const l of layers) {
    if (!scene.textures.exists(l.key)) continue;
    const img = scene.add
      .image(width / 2, l.y, l.key)
      .setOrigin(0.5, 1)
      .setScale(k)
      .setTint(l.tint);
    img.setAlpha(l.alpha * strength);
    img.texture.setFilter(1); // NEAREST
  }
}

/**
 * The ground behind the hero and stage pickers: a dark slate with a faint cold tile, never a stage's own ground (the
 * pale snow of Valmor made the spider card unreadable).
 */
export function selectBackdrop(scene: Phaser.Scene): void {
  const { width, height } = scene.scale;
  scene.add.rectangle(0, 0, width, height, 0x0a0d16).setOrigin(0);
  scene.add.tileSprite(0, 0, width, height, 'tile').setOrigin(0).setAlpha(0.22).setTint(0x4a5478);
}
