import Phaser from 'phaser';
export class Projectile extends Phaser.Physics.Arcade.Image {
  damage: number;
  pierce = 1;
  constructor(scene: Phaser.Scene, x: number, y: number, angle: number, speed: number, damage: number) {
    super(scene, x, y, 'projectile');
    this.damage = damage;
    scene.add.existing(this); scene.physics.add.existing(this);
    this.setCircle(6).setDepth(5);
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.setRotation(angle);
    scene.time.delayedCall(1800, () => this.destroy());
  }
}
