import Phaser from 'phaser';
export class PreloaderScene extends Phaser.Scene {
  constructor() { super('PreloaderScene'); }
  create() {
    this.makeTextures();
    this.scene.start('MainMenuScene');
  }
  private makeTextures() {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1).lineStyle(4, 0x800020, 1).fillCircle(18, 18, 16).strokeCircle(18, 18, 16).fillStyle(0x800020, 1).fillTriangle(30, 18, 13, 9, 13, 27);
    g.generateTexture('player', 40, 40); g.clear();
    g.fillStyle(0x333333, 1).lineStyle(2, 0x800020).fillCircle(15, 15, 13).strokeCircle(15, 15, 13); g.generateTexture('enemy', 32, 32); g.clear();
    g.fillStyle(0x5b5b5b, 1).lineStyle(2, 0x800020).fillCircle(15, 15, 13).strokeCircle(15, 15, 13).fillStyle(0x800020).fillCircle(15, 15, 5); g.generateTexture('enemyChaser', 32, 32); g.clear();
    g.fillStyle(0x800020, 1).lineStyle(3, 0xffffff).fillCircle(24, 24, 22).strokeCircle(24, 24, 22); g.generateTexture('enemyElite', 50, 50); g.clear();
    g.fillStyle(0x800020, 1).fillRoundedRect(0, 4, 22, 8, 4); g.generateTexture('projectile', 24, 16); g.clear();
    g.fillStyle(0x800020, 0.95).lineStyle(5, 0x111111).fillCircle(50, 50, 46).strokeCircle(50, 50, 46).lineStyle(2, 0xffffff, 0.7).strokeCircle(50, 50, 30); g.generateTexture('boss', 104, 104); g.clear();
    g.fillStyle(0x800020, 1).fillCircle(8, 8, 7); g.generateTexture('bossBullet', 18, 18); g.destroy();
  }
}
