import Phaser from 'phaser';
import type { DamageNumber } from '../core/effects';
import type { Enemy } from '../core/enemies';
import type { Projectile } from '../core/projectiles';
import { World } from '../core/world';
import { clamp } from '../core/math';
import { config } from '../data/config';
import { Controls } from '../render/controls';
import { drawFx } from '../render/fx';
import { Mirror } from '../render/mirror';
import type { HudScene } from './HudScene';
import { SCENES } from './keys';

export class GameScene extends Phaser.Scene {
  world!: World;
  private controls!: Controls;
  private ground!: Phaser.GameObjects.TileSprite;
  private playerSprite!: Phaser.GameObjects.Image;
  private enemyMirror!: Mirror<Enemy, Phaser.GameObjects.Image>;
  private projectileMirror!: Mirror<Projectile, Phaser.GameObjects.Image>;
  private damageMirror!: Mirror<DamageNumber, Phaser.GameObjects.Text>;
  private fx!: Phaser.GameObjects.Graphics;

  constructor() {
    super(SCENES.game);
  }

  create(): void {
    this.world = new World();
    this.ground = this.add.tileSprite(0, 0, 1, 1, 'tile').setOrigin(0);
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

    this.scene.launch(SCENES.hud);
    const hud = this.scene.get(SCENES.hud) as HudScene;
    hud.events.once(Phaser.Scenes.Events.CREATE, () => (this.controls = new Controls(this, hud.joystick)));

    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.scale.off(Phaser.Scale.Events.RESIZE, this.fitCamera, this),
    );
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
    w.step(delta / 1000, this.controls.read());

    const cam = this.cameras.main;
    cam.centerOn(w.player.x, w.player.y);
    this.playerSprite.setPosition(w.player.x, w.player.y);
    this.playerSprite.setAlpha(w.player.iframes > 0 ? 0.5 : 1);
    this.enemyMirror.sync(w.enemies.active);
    this.projectileMirror.sync(w.projectiles.active);
    this.damageMirror.sync(w.damageNumbers.active);
    drawFx(this.fx, w);
    w.events.length = 0; // reactions (shake, screens) arrive in later steps

    // Infinite ground: a tile sprite that always covers the camera view, scrolled by world position.
    const v = cam.worldView;
    this.ground.setPosition(v.x, v.y).setSize(v.width + 2, v.height + 2);
    this.ground.setTilePosition(v.x, v.y);
  }
}
