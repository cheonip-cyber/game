import Phaser from 'phaser';
import { Player } from './Player';
import { EnemyStateMachine, EnemyKind } from '../states/EnemyStateMachine';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  fsm: EnemyStateMachine;
  hp: number;
  maxHp: number;
  def: number;
  exp: number;
  contactDamage: number;
  kind: EnemyKind;
  constructor(scene: Phaser.Scene, x: number, y: number, player: Player, kind: EnemyKind = 'normal') {
    super(scene, x, y, kind === 'elite' ? 'enemyElite' : kind === 'chaser' ? 'enemyChaser' : 'enemy');
    this.kind = kind;
    const stats = kind === 'elite' ? { hp: 180, def: 4, exp: 50, dmg: 20 } : kind === 'chaser' ? { hp: 45, def: 1, exp: 3, dmg: 12 } : { hp: 30, def: 0, exp: 1, dmg: 8 };
    this.hp = this.maxHp = stats.hp; this.def = stats.def; this.exp = stats.exp; this.contactDamage = stats.dmg;
    scene.add.existing(this); scene.physics.add.existing(this);
    this.setCircle(kind === 'elite' ? 22 : 14).setDepth(7);
    this.fsm = new EnemyStateMachine(this, player, kind);
  }
  receiveDamage(raw: number) {
    this.hp -= Math.max(1, raw - this.def);
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(70, () => this.clearTint());
    if (this.hp <= 0) this.fsm.die();
  }
}
