import Phaser from 'phaser';
import { DataManager } from '../systems/DataManager';

export class MainMenuScene extends Phaser.Scene {
  constructor() { super('MainMenuScene'); }

  create() {
    const state = DataManager.load();
    const w = this.scale.width;
    const h = this.scale.height;

    this.cameras.main.setBackgroundColor('#ffffff');
    this.add.text(w / 2, h / 2 - 120, 'Survivor 3D: Routine Guardians', { fontSize: '24px', fontStyle: 'bold', color: '#800020' }).setOrigin(0.5);
    this.add.text(w / 2, h / 2 - 70, 'Move: WASD / Dash: SPACE', { fontSize: '16px', color: '#333333' }).setOrigin(0.5);
    this.add.text(w / 2, h / 2 - 30, `Action Points: ${state.actionPoints}   Best: ${Math.floor(state.bestTime / 1000)}s`, { fontSize: '14px', color: '#111111' }).setOrigin(0.5);

    const btn = this.add.rectangle(w / 2, h / 2 + 54, 240, 54, 0x800020).setInteractive({ useHandCursor: true });
    this.add.text(w / 2, h / 2 + 54, 'START ROUTINE', { fontSize: '16px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
    btn.on('pointerdown', () => this.scene.start('GameScene'));
  }
}
