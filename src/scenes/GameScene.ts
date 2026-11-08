import Phaser from 'phaser';
import type { DamageNumber } from '../core/effects';
import type { Enemy } from '../core/enemies';
import type { Projectile } from '../core/projectiles';
import type { Gem } from '../core/xp';
import { World } from '../core/world';
import { clamp } from '../core/math';
import { config } from '../data/config';
import { t } from '../i18n/pt-BR';
import { Controls } from '../render/controls';
import { drawFx } from '../render/fx';
import { Mirror } from '../render/mirror';
import type { HudScene } from './HudScene';
import { SCENES } from './keys';

export class GameScene extends Phaser.Scene {
  world!: World;
  private controls!: Controls;
  private hud!: HudScene;
  private ground!: Phaser.GameObjects.TileSprite;
  private playerSprite!: Phaser.GameObjects.Image;
  private enemyMirror!: Mirror<Enemy, Phaser.GameObjects.Image>;
  private projectileMirror!: Mirror<Projectile, Phaser.GameObjects.Image>;
  private damageMirror!: Mirror<DamageNumber, Phaser.GameObjects.Text>;
  private gemMirror!: Mirror<Gem, Phaser.GameObjects.Image>;
  private fx!: Phaser.GameObjects.Graphics;

  constructor() {
    super(SCENES.game);
  }

  create(): void {
    this.world = new World();
    this.ground = this.add.tileSprite(0, 0, 1, 1, 'tile').setOrigin(0);
    this.gemMirror = new Mirror(
      () => this.add.image(0, 0, 'gem.small').setDepth(3),
      (img, g) => {
        const key = (config.gems.tiers.find((tier) => g.value >= tier.min) ?? config.gems.tiers[0]).sprite;
        if (img.texture.key !== key) img.setTexture(key);
        img.setPosition(g.x, g.y);
      },
    );
    this.fx = this.add.graphics().setDepth(4);
    this.playerSprite = this.add.image(0, 0, 'player').setDepth(10);
    this.projectileMirror = new Mirror(
      () => this.add.image(0, 0, 'proj.elunLight').setDepth(12),
      (img, p) => img.setPosition(p.x, p.y),
    );
    this.damageMirror = new Mirror(
      () =>
        this.add
          .text(0, 0, '', { fontFamily: 'sans-serif', fontSize: '16px', fontStyle: 'bold', color: '#ffffff' })
          .setStroke('#000000', 3)
          .setOrigin(0.5)
          .setDepth(20),
      (txt, d) => {
        const v = String(Math.round(d.value));
        if (txt.text !== v) txt.setText(v);
        txt.setPosition(d.x, d.y).setAlpha(Math.min(1, d.ttl * 4));
      },
    );
    this.enemyMirror = new Mirror(
      () => this.add.image(0, 0, 'enemy.skeleton').setDepth(5),
      (img, e) => {
        if (img.texture.key !== e.def.sprite) img.setTexture(e.def.sprite);
        img.setPosition(e.x, e.y);
        if (e.flash > 0) img.setTintFill(0xffffff);
        else img.clearTint();
      },
    );

    this.scene.launch(SCENES.hud, { world: this.world });
    const hud = (this.hud = this.scene.get(SCENES.hud) as HudScene);
    hud.events.once(Phaser.Scenes.Events.CREATE, () => (this.controls = new Controls(this, hud.joystick)));

    const kb = this.input.keyboard as Phaser.Input.Keyboard.KeyboardPlugin;
    kb.on('keydown-ESC', this.pauseGame, this);
    kb.on('keydown-P', this.pauseGame, this);
    // Phones: switching apps or locking the screen pauses the run.
    this.game.events.on(Phaser.Core.Events.BLUR, this.pauseGame, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
      this.game.events.off(Phaser.Core.Events.BLUR, this.pauseGame, this);
      for (const k of [SCENES.hud, SCENES.levelUp, SCENES.pause, SCENES.end]) this.scene.stop(k);
    });
    this.fitCamera();
  }

  /** Zoom so the shortest screen side always shows `minWorldSide` world pixels (portrait-friendly). */
  private fitCamera(): void {
    const { width, height } = this.scale;
    const zoom = clamp(Math.min(width, height) / config.view.minWorldSide, 0.5, 4);
    this.cameras.main.setZoom(zoom);
    this.world.setView(width / zoom, height / zoom);
  }

  override update(_time: number, delta: number): void {
    if (!this.controls) return;
    const w = this.world;
    this.hud.joystick.setEnabled(w.state === 'playing');
    w.step(delta / 1000, this.controls.read());

    const cam = this.cameras.main;
    cam.centerOn(w.player.x, w.player.y);
    this.playerSprite.setPosition(w.player.x, w.player.y);
    this.playerSprite.setAlpha(w.player.iframes > 0 ? 0.5 : 1);
    this.gemMirror.sync(w.gems.active);
    this.enemyMirror.sync(w.enemies.active);
    this.projectileMirror.sync(w.projectiles.active);
    this.damageMirror.sync(w.damageNumbers.active);
    drawFx(this.fx, w);
    // Infinite ground: a tile sprite that always covers the camera view, scrolled by world position.
    // (computed from the player, since cam.worldView only updates at render time)
    const vw = cam.width / cam.zoom;
    const vh = cam.height / cam.zoom;
    const vx = w.player.x - vw / 2 - 2;
    const vy = w.player.y - vh / 2 - 2;
    this.ground.setPosition(vx, vy).setSize(vw + 4, vh + 4);
    this.ground.setTilePosition(vx, vy);
    this.handleEvents();
  }

  /** Only a running match can be paused (not during level-up or after the end). */
  pauseGame(): void {
    if (this.world.state !== 'playing' || !this.scene.isActive()) return;
    this.hud.joystick.setEnabled(false);
    this.scene.pause();
    this.scene.launch(SCENES.pause);
  }

  private handleEvents(): void {
    const w = this.world;
    for (const e of w.events) {
      switch (e.type) {
        case 'levelUp':
          this.scene.launch(SCENES.levelUp, { world: w });
          break;
        case 'playerHit':
          this.cameras.main.shake(120, 0.006);
          this.playerSprite.setTintFill(0xff4050);
          this.time.delayedCall(90, () => this.playerSprite.clearTint());
          break;
        case 'bossSpawned':
          this.hud.announce(t.bossWarning);
          this.cameras.main.shake(400, 0.01);
          break;
        case 'won':
        case 'lost':
          this.time.delayedCall(900, () => this.scene.launch(SCENES.end, { world: w }));
          break;
      }
    }
    w.events.length = 0;
  }
}
