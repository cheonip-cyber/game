import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
export type EnemyState = 'SPAWN' | 'CHASE' | 'WANDER' | 'ATTACK' | 'DIE';
export type EnemyKind = 'normal' | 'chaser' | 'elite';
export class EnemyStateMachine {
  state: EnemyState = 'SPAWN';
  private spawnUntil = 0;
  private wanderUntil = 0;
  constructor(private entity: Enemy, private target: Player, private kind: EnemyKind) {
    this.spawnUntil = entity.scene.time.now + 500;
    entity.setAlpha(0.35);
  }
  update() {
    if (!this.entity.active) return;
    const scene = this.entity.scene;
    const dist = Phaser.Math.Distance.Between(this.entity.x, this.entity.y, this.target.x, this.target.y);
    if (this.state === 'SPAWN' && scene.time.now >= this.spawnUntil) { this.state = 'CHASE'; this.entity.setAlpha(1); }
    if (this.state === 'SPAWN') return;
    if (dist < 28) this.state = 'ATTACK';
    else if (this.state === 'ATTACK') this.state = 'CHASE';
    if (this.state === 'CHASE') scene.physics.moveToObject(this.entity, this.target, this.kind === 'chaser' ? 145 : this.kind === 'elite' ? 78 : 95);
    if (this.state === 'WANDER') {
      if (scene.time.now > this.wanderUntil) this.state = 'CHASE';
    }
    if (this.state === 'ATTACK') this.entity.setVelocity(0, 0);
  }
  wander() { this.state = 'WANDER'; this.wanderUntil = this.entity.scene.time.now + 450; this.entity.setVelocity(Phaser.Math.Between(-80, 80), Phaser.Math.Between(-80, 80)); }
  die() {
    if (this.state === 'DIE') return;
    this.state = 'DIE';
    const scene = this.entity.scene;
    this.entity.setVelocity(0, 0);
    for (let i = 0; i < 10; i++) {
      const shard = scene.add.rectangle(this.entity.x, this.entity.y, Phaser.Math.Between(3, 9), Phaser.Math.Between(3, 9), 0x800020, 0.75).setDepth(11);
      scene.tweens.add({ targets: shard, x: shard.x + Phaser.Math.Between(-60, 60), y: shard.y + Phaser.Math.Between(-60, 60), alpha: 0, angle: Phaser.Math.Between(120, 520), duration: 430, onComplete: () => shard.destroy() });
    }
    this.entity.emit('enemy-died', this.entity);
    this.entity.destroy();
  }
}
