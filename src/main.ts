import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { EndScene } from './scenes/EndScene';
import { LevelUpScene } from './scenes/LevelUpScene';
import { MenuScene } from './scenes/MenuScene';
import { PauseScene } from './scenes/PauseScene';
import { HeroesScene } from './scenes/HeroesScene';
import { StageScene } from './scenes/StageScene';
import { StoryScene } from './scenes/StoryScene';
import { ShopScene } from './scenes/ShopScene';
import { OptionsScene } from './scenes/OptionsScene';
import { CollectionScene } from './scenes/CollectionScene';
import { sound } from './render/sound';
import { DEV_MODE } from './render/dev';
import { playtest } from './core/meta';
import { config } from './data/config';

playtest.unlockAll = DEV_MODE;
playtest.bossAt = DEV_MODE ? config.devBossAt : null;

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
    HeroesScene,
    StageScene,
    StoryScene,
    OptionsScene,
    CollectionScene,
  ],
});

sound.init();

// Dev-only handle for browser automation and console debugging.
if (import.meta.env.DEV || DEV_MODE) (window as unknown as { game: Phaser.Game }).game = game;

// Installed on a phone (Adicionar à tela inicial): the service worker keeps the game playable offline.
if (import.meta.env.PROD && 'serviceWorker' in navigator)
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // No offline copy (private mode, old browser): the game still runs online.
    });
  });
