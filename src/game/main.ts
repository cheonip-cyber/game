import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloaderScene } from './scenes/PreloaderScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { GameScene } from './scenes/GameScene';

export const startGame = (parentEl: string): Phaser.Game => {
  const parent = document.getElementById(parentEl);
  const width = parent?.clientWidth || window.innerWidth;
  const height = parent?.clientHeight || window.innerHeight;
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: parentEl,
    width,
    height,
    backgroundColor: '#ffffff',
    physics: { default: 'arcade', arcade: { debug: false } },
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, PreloaderScene, MainMenuScene, GameScene]
  };
  return new Phaser.Game(config);
};
