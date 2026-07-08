import Phaser from 'phaser';
import { Player } from './Player';

export class ExpOrb extends Phaser.Physics.Arcade.Image {
  constructor(scene: Phaser.Scene, x: number, y: number, public value: number) {
    super(scene, x, y, 'expOrb');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCircle(6).setDepth(6).setScale(value >= 50 ? 1.35 : 1);
  }

  update(player: Player) {
    if (!this.active) return;
    const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    if (distance < 190) {
      this.scene.physics.moveToObject(this, player, Phaser.Math.Clamp(360 - distance, 170, 340));
      return;
    }
    this.setVelocity(0, 0);
  }
}
