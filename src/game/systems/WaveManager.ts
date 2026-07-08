import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { Boss } from '../entities/Boss';
import { EnemyKind } from '../states/EnemyStateMachine';

export class WaveManager {
  elapsedMs = 0;
  private lastSpawn = 0;
  private bossSpawned = false;
  boss?: Boss;
  constructor(private scene: Phaser.Scene, private player: Player, private enemies: Phaser.Physics.Arcade.Group, private bossBullets: Phaser.Physics.Arcade.Group) {}
  update(delta: number, time: number) {
    this.elapsedMs += delta;
    const minute = Math.floor(this.elapsedMs / 60000);
    if (!this.bossSpawned && this.elapsedMs >= 10 * 60000) this.spawnBoss();
    if (time < this.lastSpawn + Math.max(260, 950 - minute * 70)) return;
    this.lastSpawn = time;
    const specialMinute = [3, 6, 9].includes(minute) && Math.abs((this.elapsedMs % 60000) - 1000) < 1600;
    const count = specialMinute ? 2 : Math.min(12, 2 + minute);
    for (let i = 0; i < count; i++) this.spawnEnemy(specialMinute ? 'elite' : Math.random() < 0.18 ? 'chaser' : 'normal');
  }
  private spawnEnemy(kind: EnemyKind) {
    const { x, y } = this.edgeSpawnPoint();
    const enemy = new Enemy(this.scene, x, y, this.player, kind);
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
