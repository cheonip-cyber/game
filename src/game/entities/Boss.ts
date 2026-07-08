import Phaser from 'phaser';
import { Player } from './Player';

export class Boss extends Phaser.Physics.Arcade.Sprite {
  hp = 1800;
  maxHp = 1800;
  exp = 500;
  contactDamage = 28;
  private actionReady = 0;
  private bullets: Phaser.Physics.Arcade.Group;
  constructor(scene: Phaser.Scene, x: number, y: number, private player: Player, bullets: Phaser.Physics.Arcade.Group) {
    super(scene, x, y, 'boss');
    this.bullets = bullets;
    scene.add.existing(this); scene.physics.add.existing(this);
    this.setCircle(42).setDepth(9).setImmovable(false);
  }
  update(time: number) {
    if (time < this.actionReady) return;
    if (this.hp > this.maxHp * 0.5) this.chargePattern(time); else this.bulletHell(time);
  }
  receiveDamage(raw: number) {
    if (!this.active) return;
    this.hp -= Math.max(1, raw - 8);
    this.setTintFill(0xffffff); this.scene.time.delayedCall(80, () => { if (this.active) this.clearTint(); });
    if (this.hp <= 0) this.destroy();
  }
  private chargePattern(time: number) {
    this.actionReady = time + 3600;
    let count = 0;
    const doCharge = () => {
      if (!this.active || count >= 3) return;
      const line = this.scene.add.line(0, 0, this.x, this.y, this.player.x, this.player.y, 0x800020, 0.35).setOrigin(0).setDepth(3).setLineWidth(4);
      this.scene.time.delayedCall(500, () => {
        if (!this.active) {
          line.destroy();
          return;
        }
        line.destroy();
        this.scene.physics.moveToObject(this, this.player, 440);
        this.scene.time.delayedCall(300, () => { if (this.active) this.setVelocity(0, 0); });
      });
      count++;
      this.scene.time.delayedCall(900, doCharge);
    };
    doCharge();
  }
  private bulletHell(time: number) {
    this.actionReady = time + 4200;
    this.scene.tweens.add({ targets: this, x: this.player.x, y: this.player.y - 40, duration: 600, ease: 'Sine.easeInOut' });
    for (let wave = 0; wave < 3; wave++) {
      this.scene.time.delayedCall(800 + wave * 450, () => {
        if (!this.active) return;
        for (let i = 0; i < 24; i++) {
          const angle = (Math.PI * 2 / 24) * i + wave * 0.12;
          const bullet = this.bullets.create(this.x, this.y, 'bossBullet') as Phaser.Physics.Arcade.Image;
          bullet.setCircle(6).setVelocity(Math.cos(angle) * 180, Math.sin(angle) * 180).setDepth(6);
          this.scene.time.delayedCall(3500, () => { if (bullet.active) bullet.destroy(); });
        }
      });
    }
  }
}
