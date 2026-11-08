import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0b0d14',
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  input: { activePointers: 2 },
  fps: { target: 60 },
  scene: [BootScene, GameScene, HudScene],
});

// Dev-only handle for browser automation and console debugging.
if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;
