import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';

export type EnemyKind = 'normal' | 'chaser' | 'elite';
type EnemyState = 'SPAWN' | 'CHASE' | 'WANDER' | 'ATTACK' | 'DIE';

export class EnemyStateMachine {
  private state: EnemyState = 'SPAWN';
  private spawnTime: number;
  private wanderUntil = 0;
  private attackReady = 0;
  constructor(private entity: Enemy, private player: Player, private kind: EnemyKind) {
    this.spawnTime = entity.scene.time.now + 500;
    entity.setAlpha(0.35);
  }
  update() {
    if (!this.entity.active || this.state === 'DIE') return;
    const now = this.entity.scene.time.now;
    if (this.state === 'SPAWN') {
      if (now >= this.spawnTime) { this.entity.setAlpha(1); this.state = 'CHASE'; }
      return;
    }
    const distance = Phaser.Math.Distance.Between(this.entity.x, this.entity.y, this.player.x, this.player.y);
    if (distance < 32) this.state = 'ATTACK';
    else if (this.state === 'WANDER' && now < this.wanderUntil) return;
    else this.state = 'CHASE';

    if (this.state === 'CHASE') {
      const speed = this.kind === 'elite' ? 72 : this.kind === 'chaser' ? 130 : 92;
      this.entity.scene.physics.moveToObject(this.entity, this.player, speed);
    }
    if (this.state === 'ATTACK') {
      this.entity.setVelocity(0, 0);
      if (now >= this.attackReady) {
        this.player.damage(this.entity.contactDamage);
        this.attackReady = now + 800;
      }
    }
  }
  wander() {
    this.state = 'WANDER';
    this.wanderUntil = this.entity.scene.time.now + 500;
    this.entity.setVelocity(Phaser.Math.Between(-60, 60), Phaser.Math.Between(-60, 60));
  }
  die() {
    if (this.state === 'DIE') return;
    this.state = 'DIE';
    this.entity.setVelocity(0, 0);
    this.entity.scene.events.emit('enemy-died', this.entity);
    this.entity.destroy();
  }
}
