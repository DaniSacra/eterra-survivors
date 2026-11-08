import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { EndScene } from './scenes/EndScene';
import { LevelUpScene } from './scenes/LevelUpScene';
import { MenuScene } from './scenes/MenuScene';
import { PauseScene } from './scenes/PauseScene';
import { SelectScene } from './scenes/SelectScene';
import { ShopScene } from './scenes/ShopScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0b0d14',
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  input: { activePointers: 2 },
  fps: { target: 60 },
  scene: [
    BootScene,
    MenuScene,
    GameScene,
    HudScene,
    LevelUpScene,
    PauseScene,
    EndScene,
    ShopScene,
    SelectScene,
  ],
});

// Dev-only handle for browser automation and console debugging.
if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;
