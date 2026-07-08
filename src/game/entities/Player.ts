import Phaser from 'phaser';

export class Player extends Phaser.Physics.Arcade.Sprite {
  speed = 170;
  baseAtk = 18;
  critChance = 0.12;
  maxHp = 100;
  hp = 100;
  isInvincible = false;
  private isDashing = false;
  private dashReadyAt = 0;
  private lastDirection = new Phaser.Math.Vector2(1, 0);
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCircle(15).setDepth(10).setDrag(800, 800);
    this.keys = scene.input.keyboard!.addKeys('W,A,S,D,SPACE') as Record<string, Phaser.Input.Keyboard.Key>;
  }

  update(time: number) {
    if (this.isDashing) return;
    let x = 0, y = 0;
    if (this.keys.W.isDown) y -= 1;
    if (this.keys.S.isDown) y += 1;
    if (this.keys.A.isDown) x -= 1;
    if (this.keys.D.isDown) x += 1;
    const dir = new Phaser.Math.Vector2(x, y);
    if (dir.lengthSq() > 0) {
      dir.normalize();
      this.lastDirection = dir.clone();
      this.setVelocity(dir.x * this.speed, dir.y * this.speed);
      this.setRotation(dir.x * 0.22);
    } else {
      this.setVelocity(0, 0);
      this.setRotation(0);
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) && time >= this.dashReadyAt) this.dash(time);
  }

  getDashCooldownRatio(time: number) { return Phaser.Math.Clamp((this.dashReadyAt - time) / 3000, 0, 1); }

  damage(amount: number) {
    if (this.isInvincible) return;
    this.hp = Math.max(0, this.hp - amount);
    this.isInvincible = true;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(100, () => this.clearTint());
    this.scene.time.delayedCall(650, () => { this.isInvincible = false; });
  }

  private dash(time: number) {
    this.isDashing = true;
    this.isInvincible = true;
    this.dashReadyAt = time + 3000;
    this.setVelocity(this.lastDirection.x * this.speed * 3, this.lastDirection.y * this.speed * 3);
    this.spawnGhostTrail();
    this.scene.time.delayedCall(200, () => { this.isDashing = false; this.isInvincible = false; });
  }

  private spawnGhostTrail() {
    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(i * 35, () => {
        const ghost = this.scene.add.image(this.x, this.y, 'player').setTint(0x800020).setAlpha(0.35).setScale(1.05).setDepth(8);
        this.scene.tweens.add({ targets: ghost, alpha: 0, scale: 1.6, duration: 260, onComplete: () => ghost.destroy() });
      });
    }
  }
}
