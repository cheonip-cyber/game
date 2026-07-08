import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Boss } from '../entities/Boss';
import { SkillManager } from '../systems/SkillManager';
import { WaveManager } from '../systems/WaveManager';
import { ExpManager } from '../systems/ExpManager';
import { UIManager } from '../systems/UIManager';
import { DataManager } from '../systems/DataManager';
import { Projectile } from '../entities/Projectile';
import { ExpOrb } from '../entities/ExpOrb';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemies!: Phaser.Physics.Arcade.Group;
  private expOrbs!: Phaser.Physics.Arcade.Group;
  private bossBullets!: Phaser.Physics.Arcade.Group;
  private skills!: SkillManager;
  private waves!: WaveManager;
  private exp!: ExpManager;
  private ui!: UIManager;
  private grid!: Phaser.GameObjects.Graphics;
  private gameEnded = false;
  private bossKilled = false;
  private choosingUpgrade = false;

  constructor() { super('GameScene'); }

  create() {
    this.cameras.main.setBackgroundColor('#101014');
    this.physics.world.setBounds(-100000, -100000, 200000, 200000);
    this.grid = this.add.graphics().setDepth(0);
    this.player = new Player(this, 0, 0);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.enemies = this.physics.add.group();
    this.expOrbs = this.physics.add.group({ classType: ExpOrb, runChildUpdate: false });
    this.bossBullets = this.physics.add.group();
    this.exp = new ExpManager();
    this.skills = new SkillManager(this, this.player);
    this.waves = new WaveManager(this, this.player, this.enemies, this.bossBullets);
    this.ui = new UIManager(this, this.player, this.exp, this.skills);

    this.physics.add.overlap(this.skills.projectiles, this.enemies, (p, e) => this.projectileHit(p as Projectile, e as Enemy));
    this.physics.add.overlap(this.player, this.expOrbs, (_, orb) => this.collectExpOrb(orb as ExpOrb));
    this.physics.add.overlap(this.player, this.enemies, (_, e) => this.player.damage((e as Enemy).contactDamage));
    this.physics.add.overlap(this.player, this.bossBullets, (_, b) => { this.player.damage(15); (b as Phaser.GameObjects.GameObject).destroy(); });
    this.events.on('enemy-died', (enemy: Enemy) => this.onEnemyKilled(enemy));
  }

  update(time: number, delta: number) {
    if (this.gameEnded) return;
    this.drawInfiniteGrid();
    if (this.choosingUpgrade) return;
    this.player.update(time);
    this.expOrbs.getChildren().forEach((orb) => (orb as ExpOrb).update(this.player));
    this.enemies.getChildren().forEach((e) => (e as Enemy).fsm.update());
    this.waves.boss?.update(time);
    if (this.waves.boss?.active) this.physics.world.overlap(this.skills.projectiles, this.waves.boss, (p, b) => this.projectileHitBoss(p as Projectile, b as Boss));
    if (this.waves.boss?.active) this.physics.world.overlap(this.player, this.waves.boss, () => this.player.damage(this.waves.boss!.contactDamage));
    this.skills.update(time, this.enemies);
    this.waves.update(delta, time);
    this.ui.update(this.waves.elapsedMs, time);
    if (this.player.hp <= 0) this.endGame();
  }

  private projectileHit(projectile: Projectile, enemy: Enemy) {
    if (!projectile.active || !enemy.active) return;
    enemy.receiveDamage(projectile.damage);
    this.createHitText(enemy.x, enemy.y, Math.round(projectile.damage));
    this.cameras.main.shake(35, 0.0018);
    projectile.pierce -= 1;
    if (projectile.pierce <= 0) projectile.destroy();
  }

  private projectileHitBoss(projectile: Projectile, boss: Boss) {
    if (!projectile.active || !boss.active || this.bossKilled) return;
    boss.receiveDamage(projectile.damage);
    this.createHitText(boss.x, boss.y - 30, Math.round(projectile.damage));
    projectile.destroy();
    if (!boss.active) this.onBossKilled();
  }

  private onEnemyKilled(enemy: Enemy) {
    const orb = new ExpOrb(this, enemy.x, enemy.y, enemy.exp);
    this.expOrbs.add(orb);
  }

  private collectExpOrb(orb: ExpOrb) {
    if (!orb.active) return;
    const value = orb.value;
    orb.destroy();
    this.createExpSpark();
    if (this.exp.add(value)) {
      this.createLevelAura();
      const choices = this.skills.getUpgradeChoices();
      this.choosingUpgrade = true;
      this.ui.showLevelUp(choices, (choice) => {
        this.skills.applyUpgrade(choice);
        this.choosingUpgrade = false;
      });
    }
  }

  private onBossKilled() {
    if (this.bossKilled) return;
    this.bossKilled = true;
    this.exp.add(500);
    this.endGame();
  }

  private endGame() {
    if (this.gameEnded) return;
    this.gameEnded = true;
    const points = Math.max(1, Math.floor(this.waves.elapsedMs / 10000) + this.exp.level * 3);
    DataManager.addActionPoints(points, this.waves.elapsedMs);
    this.ui.showGameOver(points, this.waves.elapsedMs);
  }

  private createHitText(x: number, y: number, value: number) {
    const txt = this.add.text(x, y - 12, `${value}`, { fontSize: '13px', fontStyle: 'bold', color: '#ffd166' }).setOrigin(0.5).setDepth(20);
    this.tweens.add({ targets: txt, y: txt.y - 28, alpha: 0, duration: 360, onComplete: () => txt.destroy() });
  }

  private createExpSpark() {
    const spark = this.add.circle(this.player.x, this.player.y, 7, 0xffd166, 0.7).setDepth(13);
    this.tweens.add({ targets: spark, scale: 2.2, alpha: 0, duration: 260, onComplete: () => spark.destroy() });
  }

  private createLevelAura() {
    const aura = this.add.circle(this.player.x, this.player.y, 20, 0x800020, 0.25).setDepth(12);
    this.tweens.add({ targets: aura, y: aura.y - 90, scaleY: 5, scaleX: 1.4, alpha: 0, duration: 680, onComplete: () => aura.destroy() });
  }

  private drawInfiniteGrid() {
    const cam = this.cameras.main;
    const size = 80;
    const startX = Math.floor(cam.worldView.x / size) * size;
    const startY = Math.floor(cam.worldView.y / size) * size;
    this.grid.clear();
    this.grid.lineStyle(1, 0x800020, 0.15);
    for (let x = startX; x < cam.worldView.right + size; x += size) this.grid.lineBetween(x, cam.worldView.y - size, x, cam.worldView.bottom + size);
    for (let y = startY; y < cam.worldView.bottom + size; y += size) this.grid.lineBetween(cam.worldView.x - size, y, cam.worldView.right + size, y);
    this.grid.lineStyle(1, 0xffffff, 0.05);
    for (let x = startX; x < cam.worldView.right + size; x += size * 4) this.grid.lineBetween(x + cam.scrollX * 0.03, cam.worldView.y - size, x + cam.scrollX * 0.03, cam.worldView.bottom + size);
  }
}
