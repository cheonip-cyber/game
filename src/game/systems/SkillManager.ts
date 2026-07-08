import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { Enemy } from '../entities/Enemy';

export interface SkillDef { id: string; name: string; level: number; multiplier: number; cooldown: number; lastUsed: number; }
export class SkillManager {
  skills: SkillDef[] = [
    { id: 'reading', name: '꾸준한 독서', level: 1, multiplier: 1.0, cooldown: 520, lastUsed: 0 },
    { id: 'sleep', name: '충분한 수면', level: 1, multiplier: 0.55, cooldown: 900, lastUsed: 0 }
  ];
  projectiles: Phaser.Physics.Arcade.Group;
  constructor(private scene: Phaser.Scene, private player: Player) {
    this.projectiles = scene.physics.add.group({ classType: Projectile, runChildUpdate: false });
  }
  update(time: number, enemies: Phaser.Physics.Arcade.Group) {
    this.fireReading(time, enemies);
    this.sleepAura(time, enemies);
  }
  chooseUpgrade() {
    const pool = ['규칙적인 운동', '효율적 시간 관리', '오답 노트 작성', '긍정적 확언', '건강한 취미', '경청과 공감'];
    const name = Phaser.Utils.Array.GetRandom(pool);
    this.skills.push({ id: `skill-${Date.now()}`, name, level: 1, multiplier: 1.05, cooldown: 1100, lastUsed: 0 });
  }
  private calcDamage(skill: SkillDef) {
    let dmg = this.player.baseAtk * skill.multiplier;
    if (Math.random() < this.player.critChance) { dmg *= 1.5; this.scene.cameras.main.shake(80, 0.0025); }
    return dmg;
  }
  private fireReading(time: number, enemies: Phaser.Physics.Arcade.Group) {
    const skill = this.skills[0];
    if (time < skill.lastUsed + skill.cooldown) return;
    skill.lastUsed = time;
    const nearest = this.scene.physics.closest(this.player, enemies.getChildren() as Phaser.GameObjects.GameObject[]) as Phaser.Physics.Arcade.Sprite | null;
    const angle = nearest ? Phaser.Math.Angle.Between(this.player.x, this.player.y, nearest.x, nearest.y) : this.player.rotation;
    const p = new Projectile(this.scene, this.player.x, this.player.y, angle, 440, this.calcDamage(skill));
    this.projectiles.add(p);
  }
  private sleepAura(time: number, enemies: Phaser.Physics.Arcade.Group) {
    const skill = this.skills[1];
    if (time < skill.lastUsed + skill.cooldown) return;
    skill.lastUsed = time;
    const aura = this.scene.add.circle(this.player.x, this.player.y, 92, 0x800020, 0.08).setStrokeStyle(2, 0x800020, 0.35).setDepth(4);
    this.scene.tweens.add({ targets: aura, scale: 1.5, alpha: 0, duration: 430, onComplete: () => aura.destroy() });
    enemies.getChildren().forEach((e) => {
      const enemy = e as Enemy;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) < 120) enemy.receiveDamage(this.calcDamage(skill));
    });
  }
}
