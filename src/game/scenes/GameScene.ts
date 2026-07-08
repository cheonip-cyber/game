import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { SkillManager } from '../systems/SkillManager';
import { WaveManager } from '../systems/WaveManager';
import { ExpManager } from '../systems/ExpManager';
import { UIManager } from '../systems/UIManager';
import { DataManager } from '../systems/DataManager';
import { Projectile } from '../entities/Projectile';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemies!: Phaser.Physics.Arcade.Group;
  private bossBullets!: Phaser.Physics.Arcade.Group;
  private skills!: SkillManager;
  private waves!: WaveManager;
  private exp!: ExpManager;
  private ui!: UIManager;
  private grid!: Phaser.GameObjects.Graphics;
  private gameEnded = false;

  constructor() { super('GameScene'); }

  create() {
    this.cameras.main.setBackgroundColor('#101014');
    this.physics.world.setBounds(-100000, -100000, 200000, 200000);
    this.grid = this.add.graphics().setDepth(0);
    this.player = new Player(this, 0, 0);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.enemies = this.physics.add.group();
    this.bossBullets = this.physics.add.group();
    this.exp = new ExpManager();
    this.skills = new SkillManager(this, this.player);
    this.waves = new WaveManager(this, this.player, this.enemies, this.bossBullets);
    this.ui = new UIManager(this, this.player, this.exp, this.skills);

    this.physics.add.overlap(this.skills.projectiles, this.enemies, (p, e) => this.projectileHit(p as Projectile, e as Enemy));
    this.physics.add.overlap(this.player, this.enemies, (_, e) => this.player.damage((e as Enemy).contactDamage));
    this.physics.add.overlap(this.player, this.bossBullets, (_, b) => { this.player.damage(15); (b as Phaser.GameObjects.GameObject).destroy(); });
    this.events.on('enemy-died', (enemy: Enemy) => this.onEnemyKilled(enemy));
  }

  update(time: number, delta: number) {
    if (this.gameEnded) return;
    this.drawInfiniteGrid();
    this.player.update(time);
    this.enemies.getChildren().forEach((e) => (e as Enemy).fsm.update());
    this.waves.boss?.update(time);
    if (this.waves.boss?.active) this.physics.world.overlap(this.skills.projectiles, this.waves.boss, (p, b) => { (b as any).receiveDamage((p as Projectile).damage); p.destroy(); });
    this.skills.update(time, this.enemies);
    this.waves.update(delta, time);
    this.ui.update(this.waves.elapsedMs, time);
    if (this.player.hp <= 0) this.endGame();
  }

  private projectileHit(projectile: Projectile, enemy: Enemy) {
    enemy.receiveDamage(projectile.damage);
    projectile.pierce -= 1;
    if (projectile.pierce <= 0) projectile.destroy();
  }

  private onEnemyKilled(enemy: Enemy) {
    const particles = this.add.particles(enemy.x, enemy.y, 'projectile', { speed: { min: 60, max: 180 }, lifespan: 340, quantity: 12, scale: { start: 1.2, end: 0 }, tint: 0x800020 });
    this.time.delayedCall(360, () => particles.destroy());
    const leveled = this.exp.add(enemy.exp);
    if (leveled) this.ui.showLevelUp(() => this.skills.chooseUpgrade());
  }

  private drawInfiniteGrid() {
    const cam = this.cameras.main;
    const step = 64;
    const left = Math.floor(cam.worldView.x / step) * step;
    const top = Math.floor(cam.worldView.y / step) * step;
    this.grid.clear();
    this.grid.lineStyle(1, 0x800020, 0.18);
    for (let x = left; x < cam.worldView.right + step; x += step) this.grid.lineBetween(x, cam.worldView.y, x, cam.worldView.bottom);
    for (let y = top; y < cam.worldView.bottom + step; y += step) this.grid.lineBetween(cam.worldView.x, y, cam.worldView.right, y);
  }

  private endGame() {
    this.gameEnded = true;
    const seconds = Math.floor(this.waves.elapsedMs / 1000);
    const points = Math.max(1, Math.floor(seconds / 10) + this.exp.level * 2);
    const saved = DataManager.load();
    saved.actionPoints += points;
    saved.bestTime = Math.max(saved.bestTime, seconds);
    DataManager.save(saved);
    this.ui.showGameOver(points);
  }
}
