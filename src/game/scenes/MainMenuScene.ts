import Phaser from 'phaser';
import { DataManager } from '../systems/DataManager';

export class MainMenuScene extends Phaser.Scene {
  constructor() { super('MainMenuScene'); }
  create() {
    const { width, height } = this.scale;
    const data = DataManager.load();
    this.cameras.main.setBackgroundColor('#ffffff');
    this.add.text(width / 2, height / 2 - 120, 'Routine Guardians', { fontSize: '34px', fontStyle: 'bold', color: '#800020' }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 - 70, '좋은 습관으로 유혹을 정화하는 탑다운 서바이버', { fontSize: '16px', color: '#333333' }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 - 28, `Action Points: ${data.actionPoints} / Best Time: ${Math.floor(data.bestTime)}s`, { fontSize: '13px', color: '#111111' }).setOrigin(0.5);
    const start = this.add.rectangle(width / 2, height / 2 + 42, 260, 58, 0x800020, 1).setInteractive({ useHandCursor: true });
    this.add.text(width / 2, height / 2 + 42, 'START', { fontSize: '24px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 + 106, 'WASD 이동 / Space 대시', { fontSize: '13px', color: '#333333' }).setOrigin(0.5);
    start.on('pointerdown', () => this.scene.start('GameScene'));
  }
}
