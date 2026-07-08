import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { Enemy } from '../entities/Enemy';

export interface SkillDef {
  id: string;
  name: string;
  level: number;
  multiplier: number;
  cooldown: number;
  lastUsed: number;
}

export interface UpgradeOption {
  id: string;
  title: string;
  description: string;
  rarity: 'Common' | 'Rare' | 'Epic';
  apply: () => void;
}

export class SkillManager {
  skills: SkillDef[] = [
    { id: 'reading', name: 'Reading Shot', level: 1, multiplier: 1.0, cooldown: 520, lastUsed: 0 },
    { id: 'sleep', name: 'Sleep Aura', level: 1, multiplier: 0.55, cooldown: 900, lastUsed: 0 }
  ];

  projectiles: Phaser.Physics.Arcade.Group;
  private auraRadius = 120;
  private projectileSpeed = 440;
  private projectilePierce = 1;

  constructor(private scene: Phaser.Scene, private player: Player) {
    this.projectiles = scene.physics.add.group({ classType: Projectile, runChildUpdate: false });
  }

  update(time: number, enemies: Phaser.Physics.Arcade.Group) {
    this.fireReading(time, enemies);
    this.sleepAura(time, enemies);
  }

  getUpgradeChoices(): UpgradeOption[] {
    const reading = this.skills[0];
    const sleep = this.skills[1];
    const pool: UpgradeOption[] = [
      {
        id: 'reading-speed',
        title: 'Rapid Reading',
        description: 'Reading Shot cooldown -12%.',
        rarity: 'Common',
        apply: () => {
          reading.level += 1;
          reading.cooldown = Math.max(230, Math.floor(reading.cooldown * 0.88));
        }
      },
      {
        id: 'reading-pierce',
        title: 'Piercing Focus',
        description: 'Projectiles pierce one more enemy.',
        rarity: 'Rare',
        apply: () => {
          reading.level += 1;
          this.projectilePierce += 1;
        }
      },
      {
        id: 'sleep-radius',
        title: 'Deep Rest Field',
        description: 'Sleep Aura range +22%.',
        rarity: 'Common',
        apply: () => {
          sleep.level += 1;
          this.auraRadius = Math.floor(this.auraRadius * 1.22);
        }
      },
      {
        id: 'base-power',
        title: 'Routine Momentum',
        description: 'Base attack +4 and crit chance +3%.',
        rarity: 'Rare',
        apply: () => {
          this.player.baseAtk += 4;
          this.player.critChance = Math.min(0.45, this.player.critChance + 0.03);
        }
      },
      {
        id: 'mobility',
        title: 'Morning Stretch',
        description: 'Move speed +12%.',
        rarity: 'Common',
        apply: () => {
          this.player.speed = Math.floor(this.player.speed * 1.12);
        }
      },
      {
        id: 'projectile-flow',
        title: 'Flow State',
        description: 'Projectile speed +18% and damage +15%.',
        rarity: 'Epic',
        apply: () => {
          reading.level += 1;
          reading.multiplier += 0.15;
          this.projectileSpeed = Math.floor(this.projectileSpeed * 1.18);
        }
      }
    ];

    return Phaser.Utils.Array.Shuffle(pool).slice(0, 3);
  }

  applyUpgrade(option: UpgradeOption) {
    option.apply();
    this.scene.cameras.main.flash(120, 255, 230, 170);
  }

  private calcDamage(skill: SkillDef) {
    let dmg = this.player.baseAtk * skill.multiplier;
    if (Math.random() < this.player.critChance) {
      dmg *= 1.5;
      this.scene.cameras.main.shake(80, 0.0025);
    }
    return dmg;
  }

  private fireReading(time: number, enemies: Phaser.Physics.Arcade.Group) {
    const skill = this.skills[0];
    if (time < skill.lastUsed + skill.cooldown) return;
    skill.lastUsed = time;

    const nearest = this.scene.physics.closest(this.player, enemies.getChildren() as Phaser.GameObjects.GameObject[]) as Phaser.Physics.Arcade.Sprite | null;
    const angle = nearest ? Phaser.Math.Angle.Between(this.player.x, this.player.y, nearest.x, nearest.y) : this.player.rotation;
    const p = new Projectile(this.scene, this.player.x, this.player.y, angle, this.projectileSpeed, this.calcDamage(skill));
    p.pierce = this.projectilePierce;
    this.projectiles.add(p);
  }

  private sleepAura(time: number, enemies: Phaser.Physics.Arcade.Group) {
    const skill = this.skills[1];
    if (time < skill.lastUsed + skill.cooldown) return;
    skill.lastUsed = time;

    const aura = this.scene.add.circle(this.player.x, this.player.y, this.auraRadius * 0.75, 0x800020, 0.08).setStrokeStyle(2, 0xffd166, 0.45).setDepth(4);
    this.scene.tweens.add({ targets: aura, scale: 1.55, alpha: 0, duration: 430, onComplete: () => aura.destroy() });
    enemies.getChildren().forEach((e) => {
      const enemy = e as Enemy;
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) < this.auraRadius) enemy.receiveDamage(this.calcDamage(skill));
    });
  }
}
