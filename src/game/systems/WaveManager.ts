import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Boss } from '../entities/Boss';
import { EnemyKind } from '../states/EnemyStateMachine';
import { DifficultyDef } from './DataManager';

export class WaveManager {
  elapsedMs = 0;
  private lastSpawn = 0;
  private bossSpawned = false;
  private stage = 1;
  boss?: Boss;

  constructor(
    private scene: Phaser.Scene,
    private player: Player,
    private enemies: Phaser.Physics.Arcade.Group,
    private bossBullets: Phaser.Physics.Arcade.Group,
    private difficulty: DifficultyDef
  ) {}

  setStage(stage: number) {
    this.stage = stage;
    this.bossSpawned = false;
  }

  update(delta: number, time: number) {
    this.elapsedMs += delta;
    const minute = Math.floor(this.elapsedMs / 60000);
    if (!this.bossSpawned && this.stage >= 2 && this.elapsedMs >= 25 * 60000) this.spawnBoss();
    const interval = Math.max(180, (950 - minute * 70) / this.difficulty.spawnRate / (this.stage >= 2 ? 1.35 : 1));
    if (time < this.lastSpawn + interval) return;
    this.lastSpawn = time;
    const specialMinute = [3, 6, 9].includes(minute) && Math.abs((this.elapsedMs % 60000) - 1000) < 1600;
    const count = specialMinute ? 2 + this.stage : Math.min(18, Math.ceil((2 + minute + this.stage) * this.difficulty.spawnRate));
    for (let i = 0; i < count; i++) this.spawnEnemy(specialMinute ? 'elite' : Math.random() < 0.18 + this.stage * 0.03 ? 'chaser' : 'normal');
  }
  private spawnEnemy(kind: EnemyKind) {
    const { x, y } = this.edgeSpawnPoint();
    const enemy = new Enemy(this.scene, x, y, this.player, kind);
    const hpScale = this.difficulty.enemyHp * (this.stage >= 2 ? 1.65 : 1);
    const damageScale = this.difficulty.enemyDamage * (this.stage >= 2 ? 1.4 : 1);
    enemy.hp = Math.ceil(enemy.hp * hpScale);
    enemy.maxHp = Math.ceil(enemy.maxHp * hpScale);
    enemy.contactDamage = Math.ceil(enemy.contactDamage * damageScale);
    enemy.exp = Math.ceil(enemy.exp * this.difficulty.multiplier * (this.stage >= 2 ? 1.8 : 1));
    this.enemies.add(enemy);
  }
  private spawnBoss() {
    this.bossSpawned = true;
    const { x, y } = this.edgeSpawnPoint();
    this.boss = new Boss(this.scene, x, y, this.player, this.bossBullets);
  }
  private edgeSpawnPoint() {
    const cam = this.scene.cameras.main;
    const pad = 100;
    const side = Phaser.Math.Between(0, 3);
    const left = cam.worldView.x - pad, right = cam.worldView.right + pad, top = cam.worldView.y - pad, bottom = cam.worldView.bottom + pad;
    if (side === 0) return { x: Phaser.Math.Between(left, right), y: top };
    if (side === 1) return { x: Phaser.Math.Between(left, right), y: bottom };
    if (side === 2) return { x: left, y: Phaser.Math.Between(top, bottom) };
    return { x: right, y: Phaser.Math.Between(top, bottom) };
  }
}
