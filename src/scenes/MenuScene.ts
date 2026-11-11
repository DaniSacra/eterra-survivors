import Phaser from 'phaser';
import { devTag } from '../render/dev';
import { t } from '../i18n/pt-BR';
import { UI, button, isShort, keyNav, label, newsDot, restartOnResize, safeArea } from '../render/ui';
import { CHARACTERS, type CharacterId } from '../data/characters';
import { HERO_COLOR } from '../render/fx';
import { checkStoredAchievements, loadSave } from '../render/save';
import { settings } from '../render/settings';
import { SCENES } from './keys';

/** Source width of the three painted layers (px). */
const LAYER_W = 512;
const GLOW = 'home.glow';
const FLAKE = 'home.flake';
const VIGNETTE = 'home.vignette';
/** Warm windows and lanterns of the village layer, in its own pixels (x, y from the top left, glow radius). */
const LIGHTS: readonly (readonly [number, number, number])[] = [
  [88, 121, 26],
  [51, 150, 22],
  [204, 53, 22],
  [248, 134, 24],
  [364, 112, 24],
  [428, 148, 26],
  [489, 98, 22],
  [160, 132, 20],
];
/** Standing order on the snow: Aldo in the middle and in front, the others around him. */
const PARTY: readonly CharacterId[] = ['lyra', 'teo', 'aldo', 'andilla'];

/** The home: a painted dusk over Valmor in layers (mountains, village, snow), the party in front and the buttons. */
export class MenuScene extends Phaser.Scene {
  /** Layers that slide a little with the pointer, with how far (0 to 1 of the slack). */
  private layers: { img: Phaser.GameObjects.Image; slack: number; ox: number }[] = [];

  constructor() {
    super(SCENES.menu);
  }

  create(): void {
    // Saves from before the achievements earn the ones they already deserve.
    checkStoredAchievements();
    this.layers = [];
    const { width, height } = this.scale;
    // Phone lying down: the title and the party on the left, the buttons on the right.
    const side = isShort(this) && width >= 600;
    const lx = side ? width * 0.29 : width / 2;
    const rx = side ? width * 0.73 : width / 2;
    const wrap = side ? Math.min(360, width * 0.5 - 32) : Math.min(420, width - 40);
    const bw = side ? Math.min(260, width * 0.4) : Math.min(260, width - 60);
    const touch = this.sys.game.device.input.touch;
    const controls = touch ? t.menu.controlsTouch : t.menu.controlsDesktop;
    const hintText = import.meta.env.DEV ? `${controls}\n${t.menu.debugHint}` : controls;

    this.scenery(width, height);

    const ty = height * (side ? 0.17 : 0.11);
    this.title(lx, ty, side ? wrap : width);
    // Buttons block: 56 + 8 + 44 + 8 + 44 px, then the hint. Standing: anchored to the bottom (thumb reach);
    // lying down: centered on the right.
    const hint = label(this, rx, 0, hintText, side ? 13 : 14, {
      color: UI.muted,
      wrap: side ? bw + 40 : wrap,
      stroke: true,
    });
    const by = side
      ? (height - 160 - 16 - hint.height) / 2 + 28
      : height - safeArea().bottom - 24 - hint.height - 16 - 132;
    hint.setY(by + 132 + 16 + hint.height / 2);
    if (side) this.party(lx, ty + 40, height - 24, wrap);
    else this.party(lx, ty + 64, by - 40, width);

    const collection = button(
      this,
      rx - bw / 4 - 3,
      by + 116,
      bw / 2 - 6,
      44,
      () => this.scene.start(SCENES.collection),
      t.menu.collection,
    );
    // Something new in the Coleção (an achievement not seen yet): a gold dot on the button's corner.
    if (loadSave().fresh.length > 0)
      newsDot(this, collection.x + collection.width / 2 - 8, collection.y - collection.height / 2 + 8);
    keyNav(this, [
      button(this, rx, by, bw, 56, () => this.scene.start(SCENES.select), t.menu.start),
      button(this, rx, by + 64, bw, 44, () => this.scene.start(SCENES.shop), t.menu.shop),
      // Two smaller ones side by side: the Coleção and the options.
      collection,
      button(
        this,
        rx + bw / 4 + 3,
        by + 116,
        bw / 2 - 6,
        44,
        () => this.scene.start(SCENES.options),
        t.menu.options,
      ),
    ]);

    // The layers follow the pointer a little (depth), unless calm screen asks for stillness.
    if (!settings().calm && this.layers.length > 0)
      this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.parallax(p.x / width - 0.5));
    devTag(this);
    restartOnResize(this);
    this.cameras.main.fadeIn(150);
  }

  /** Painted dusk: sky, stars and moon, three layers, warm lights, snowfall and a vignette. */
  private scenery(width: number, height: number): void {
    this.makeTextures();
    const phone = width < 600;
    // Sky: indigo at the top, violet, then the warm last light behind the mountains.
    const sky = this.add.graphics().setDepth(-10);
    sky.fillGradientStyle(0x14122e, 0x14122e, 0x6a4a86, 0x6a4a86, 1);
    sky.fillRect(0, 0, width, height * 0.5);
    sky.fillGradientStyle(0x6a4a86, 0x6a4a86, 0xe89a68, 0xe89a68, 1);
    sky.fillRect(0, height * 0.5, width, height * 0.2);
    for (let i = 0; i < 46; i++) {
      const star = this.add
        .rectangle(
          Phaser.Math.Between(0, width),
          Phaser.Math.Between(0, Math.floor(height * 0.5)),
          2,
          2,
          0xfff4d8,
          0.35 + Math.random() * 0.5,
        )
        .setDepth(-9);
      if (i % 3 === 0 && !settings().calm)
        this.tweens.add({ targets: star, alpha: 0.1, duration: 900 + i * 40, yoyo: true, repeat: -1 });
    }
    this.add
      .circle(width * 0.82, height * 0.13, phone ? 20 : 28, 0xf4ecd0)
      .setDepth(-8)
      .setStrokeStyle(3, 0xcfc4e8, 0.5);
    this.add
      .image(width * 0.82, height * 0.13, GLOW)
      .setDepth(-8)
      .setScale(phone ? 3 : 4.5)
      .setTint(0xb8b0ff)
      .setAlpha(0.35)
      .setBlendMode(Phaser.BlendModes.ADD);

    // The village: its ground sits about 60% down; below it the snow darkens toward the buttons.
    const vS = phone ? 1.5 : 2;
    this.layer('home.village', vS, width, height * 0.62, 0.5, -5, 0xd2cef0);
    const groundY = height * 0.62;
    const snow = this.add.graphics().setDepth(-4.5);
    snow.fillGradientStyle(0x5c5a8c, 0x5c5a8c, 0x1c1a36, 0x1c1a36, 1);
    snow.fillRect(0, groundY - 2, width, height - groundY + 2);
    // Mountains behind, higher; a slow haze at their feet.
    const mS = phone ? 2 : 3;
    this.layer('home.mountains', mS, width, groundY - 160 * vS * 0.4, 0.2, -7, 0xd0c0f0);
    // Foreground snow and pines, at the very bottom, drawn over the village's feet.
    const fS = phone ? 1 : 2;
    this.layer('home.foreground', fS, width, height, 0.9, -3, 0xbcb8e4);

    // Warm light of the windows, flickering softly.
    const vx = (width - LAYER_W * vS) / 2;
    const vy = groundY - 192 * vS;
    LIGHTS.forEach(([x, y, r], i) => {
      const glow = this.add
        .image(vx + x * vS, vy + y * vS, GLOW)
        .setDepth(-4.8)
        .setTint(0xffa850)
        .setAlpha(0.55)
        .setScale((r * vS) / 32)
        .setBlendMode(Phaser.BlendModes.ADD);
      if (!settings().calm)
        this.tweens.add({
          targets: glow,
          alpha: 0.32,
          duration: 700 + i * 130,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
    });

    if (!settings().calm) this.snowfall(width, height);
    this.add
      .image(width / 2, height / 2, VIGNETTE)
      .setDisplaySize(width * 1.1, height * 1.1)
      .setDepth(-1)
      .setAlpha(0.8);
  }

  /** One painted layer, bottom aligned at `bottom`, centred, with room (`slack`) to slide with the pointer. */
  private layer(
    key: string,
    scale: number,
    width: number,
    bottom: number,
    slack: number,
    depth: number,
    tint: number,
  ): Phaser.GameObjects.Image {
    if (!this.textures.exists(key)) return this.add.image(0, 0, key).setVisible(false);
    this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    const img = this.add
      .image(width / 2, bottom, key)
      .setOrigin(0.5, 1)
      .setScale(scale)
      .setDepth(depth)
      .setTint(tint);
    this.layers.push({ img, slack, ox: 0 });
    // Narrower than the screen: mirrored copies on both sides (the edges match), so the scene always fills it.
    const w = img.displayWidth;
    for (let n = 1; (n - 0.5) * w < width / 2; n++)
      for (const sign of [-1, 1]) {
        const copy = this.add
          .image(width / 2 + sign * n * w, bottom, key)
          .setOrigin(0.5, 1)
          .setScale(scale)
          .setFlipX(n % 2 === 1)
          .setDepth(depth)
          .setTint(tint);
        this.layers.push({ img: copy, slack, ox: sign * n * w });
      }
    return img;
  }

  private parallax(p: number): void {
    for (const l of this.layers) {
      l.img.x = this.scale.width / 2 + l.ox - p * 2 * 24 * l.slack;
    }
  }

  /** The soft glow and the snowflake textures, made once. */
  private makeTextures(): void {
    if (!this.textures.exists(GLOW)) {
      const tex = this.textures.createCanvas(GLOW, 64, 64) as Phaser.Textures.CanvasTexture;
      const ctx = tex.getContext();
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.4, 'rgba(255,255,255,0.35)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
      tex.refresh();
    }
    if (!this.textures.exists(VIGNETTE)) {
      const tex = this.textures.createCanvas(VIGNETTE, 128, 128) as Phaser.Textures.CanvasTexture;
      const ctx = tex.getContext();
      const g = ctx.createRadialGradient(64, 64, 34, 64, 64, 92);
      g.addColorStop(0, 'rgba(8,6,20,0)');
      g.addColorStop(1, 'rgba(8,6,20,0.85)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
      tex.refresh();
    }
    if (!this.textures.exists(FLAKE)) {
      const g = this.make.graphics({}, false);
      g.fillStyle(0xffffff, 1).fillRect(0, 0, 3, 3);
      g.generateTexture(FLAKE, 3, 3);
      g.destroy();
    }
  }

  /** A light, slow snowfall: a few dozen flakes drifting down, wrapped at the bottom (no allocation per frame). */
  private snowfall(width: number, height: number): void {
    const flakes = Array.from({ length: 48 }, () =>
      this.add
        .image(Math.random() * width, Math.random() * height, FLAKE)
        .setDepth(-2)
        .setAlpha(0.3 + Math.random() * 0.55)
        .setScale(0.6 + Math.random() * 0.9),
    );
    const speed = flakes.map(() => 18 + Math.random() * 28);
    const update = (_t: number, dt: number): void => {
      flakes.forEach((f, i) => {
        f.y += ((speed[i] as number) * dt) / 1000;
        f.x -= ((speed[i] as number) * 0.3 * dt) / 1000;
        if (f.y > height + 4) f.y = -4;
        if (f.x < -4) f.x = width + 4;
      });
    };
    this.events.on('update', update);
    this.events.once('shutdown', () => this.events.off('update', update));
  }

  /** "Eterra Survivors" in gold over a warm glow, with the subtitle under it. */
  private title(x: number, y: number, w: number): void {
    const size = Math.min(48, w / 8.5);
    this.add
      .image(x, y + 6, GLOW)
      .setDisplaySize(w * 0.95, size * 3.4)
      .setTint(0xffa040)
      .setAlpha(0.3)
      .setBlendMode(Phaser.BlendModes.ADD);
    label(this, x, y + 3, t.title, size, { bold: true, color: '#3a1c10' }).setAlpha(0.8);
    label(this, x, y, t.title, size, { bold: true, color: UI.gold, stroke: true });
    label(this, x, y + size * 0.85, t.subtitle, size > 36 ? 18 : 16, { color: '#d8cce8', stroke: true });
  }

  /** The four heroes facing us on the snow, each on a pool of their own colour, Aldo big in the middle. */
  private party(cx: number, top: number, bottom: number, w: number): void {
    const room = bottom - top;
    if (room < 60) return;
    const aldoK = Phaser.Math.Clamp(Math.floor(room / 74), 1, w < 600 ? 3 : 4);
    const otherK = Math.max(1, aldoK - (aldoK > 2 ? 1 : 0));
    const feet = bottom - 4;
    const gap = Math.min(w / 4.2, 64 * otherK * 0.95);
    PARTY.forEach((id, i) => {
      const big = id === 'aldo';
      const k = big ? aldoK : otherK;
      const x = cx + (i - 1.5) * gap + (big ? 0 : (i < 2 ? -1 : 1) * 8);
      // Still, standing on the snow: Aldo a step in front, the others on a shallow arc behind him.
      const y = feet - (big ? 0 : 6 + (i === 1 || i === 3 ? 0 : 4) * k * 0.5);
      const colour = HERO_COLOR[id];
      const key = `${CHARACTERS[id].sprite}.front`;
      const pad = this.bottomPad(key);
      this.add
        .image(x, y, GLOW)
        .setDisplaySize(130 * k * 0.8, 36 * k * 0.8)
        .setTint(colour)
        .setAlpha(0.35)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(big ? 1 : 0);
      this.add.ellipse(x, y, 30 * k, 8 * k, 0x05040f, 0.5).setDepth(big ? 1 : 0);
      const hero = this.add
        .image(x, y + pad * k, key)
        .setOrigin(0.5, 1)
        .setScale(k)
        .setDepth(big ? 1.2 : 1)
        .setTint(0xdcd8f4);
      hero.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    });
  }

  /** Transparent rows under a sprite's feet (px), so its shadow and feet line up. */
  private bottomPad(key: string): number {
    const frame = this.textures.getFrame(key);
    for (let row = frame.height - 1; row >= 0; row--)
      for (let col = 0; col < frame.width; col++)
        if (this.textures.getPixelAlpha(col, row, key) > 20) return frame.height - 1 - row;
    return 0;
  }
}
