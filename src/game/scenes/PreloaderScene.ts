import Phaser from 'phaser';

export class PreloaderScene extends Phaser.Scene {
  constructor() { super('PreloaderScene'); }

  create() {
    this.createPlayerTexture();
    this.createEnemyTexture('enemy', 0x5a5a66, 16);
    this.createEnemyTexture('enemyChaser', 0x800020, 16);
    this.createEnemyTexture('enemyElite', 0x222222, 26);
    this.createBossTexture();
    this.createProjectileTexture();
    this.scene.start('MainMenuScene');
  }

  private createPlayerTexture() {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1); g.fillCircle(24, 20, 12);
    g.lineStyle(5, 0x800020, 1); g.strokeCircle(24, 20, 12);
    g.fillStyle(0x800020, 1); g.fillTriangle(12, 38, 36, 38, 24, 58);
    g.generateTexture('player', 64, 64); g.destroy();
  }

  private createEnemyTexture(key: string, color: number, size: number) {
    const g = this.add.graphics();
    g.fillStyle(color, 1); g.fillCircle(size, size, size - 2);
    g.lineStyle(3, 0xffffff, 0.65); g.strokeCircle(size, size, size - 2);
    g.generateTexture(key, size * 2, size * 2); g.destroy();
  }

  private createBossTexture() {
    const g = this.add.graphics();
    g.fillStyle(0x800020, 1); g.fillCircle(48, 48, 42);
    g.lineStyle(5, 0xffffff, 0.8); g.strokeCircle(48, 48, 42);
    g.lineStyle(3, 0x111111, 1); g.strokeCircle(48, 48, 22);
    g.generateTexture('boss', 96, 96); g.destroy();
  }

  private createProjectileTexture() {
    const g = this.add.graphics();
    g.fillStyle(0x800020, 1); g.fillCircle(8, 8, 7);
    g.generateTexture('projectile', 16, 16); g.clear();
    g.fillStyle(0xffffff, 1); g.fillCircle(7, 7, 6);
    g.lineStyle(2, 0x800020, 1); g.strokeCircle(7, 7, 6);
    g.generateTexture('bossBullet', 14, 14); g.destroy();
  }
}
