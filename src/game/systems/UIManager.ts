import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { ExpManager } from './ExpManager';
import { SkillManager } from './SkillManager';

const BURGUNDY = 0x800020;
const CARD_TITLES = ['Skill Boost', 'Body Reset', 'Mind Focus'];

export class UIManager {
  private hpBar!: Phaser.GameObjects.Rectangle;
  private expBar!: Phaser.GameObjects.Rectangle;
  private timerText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private dashText!: Phaser.GameObjects.Text;
  private skillTexts: Phaser.GameObjects.Text[] = [];

  constructor(private scene: Phaser.Scene, private player: Player, private exp: ExpManager, private skills: SkillManager) {
    this.create();
  }

  update(elapsedMs: number, time: number) {
    this.hpBar.width = 220 * (this.player.hp / this.player.maxHp);
    this.expBar.width = this.scene.scale.width * (this.exp.exp / this.exp.requiredExp);
    const sec = Math.floor(elapsedMs / 1000);
    this.timerText.setText(`${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`);
    this.levelText.setText(`LV ${this.exp.level}`);
    const cd = this.player.getDashCooldownRatio(time);
    this.dashText.setText(cd > 0 ? `DASH ${(cd * 3).toFixed(1)}s` : 'DASH READY');
    this.skillTexts.forEach((txt, i) => txt.setText(this.skills.skills[i]?.name.slice(0, 12) ?? '-'));
  }

  showLevelUp(onPick: () => void) {
    this.scene.physics.world.pause();
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const overlay = this.scene.add.rectangle(w / 2, h / 2, w, h, 0xffffff, 0.78).setScrollFactor(0).setDepth(1000);
    const title = this.scene.add.text(w / 2, h / 2 - 150, 'LEVEL UP', { fontSize: '24px', fontStyle: 'bold', color: '#800020' }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    const cards: Phaser.GameObjects.Container[] = [];

    for (let i = 0; i < 3; i++) {
      const cx = w / 2 + (i - 1) * 210;
      const card = this.scene.add.container(cx, h / 2).setScrollFactor(0).setDepth(1001);
      const bg = this.scene.add.rectangle(0, 0, 180, 220, 0xffffff, 1).setStrokeStyle(3, BURGUNDY, 1);
      const head = this.scene.add.text(0, -70, CARD_TITLES[i], { fontSize: '16px', fontStyle: 'bold', color: '#800020', align: 'center' }).setOrigin(0.5);
      const body = this.scene.add.text(0, 18, 'Add a routine skill\nand increase attack flow.', { fontSize: '13px', color: '#222222', align: 'center' }).setOrigin(0.5);
      card.add([bg, head, body]);
      card.setSize(180, 220);
      card.setInteractive(new Phaser.Geom.Rectangle(-90, -110, 180, 220), Phaser.Geom.Rectangle.Contains);
      card.on('pointerdown', () => {
        cards.forEach((c) => c.destroy());
        overlay.destroy();
        title.destroy();
        this.scene.physics.world.resume();
        onPick();
      });
      cards.push(card);
    }
  }

  showGameOver(points: number) {
    this.scene.physics.world.pause();
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    this.scene.add.rectangle(w / 2, h / 2, 420, 260, 0xffffff, 0.96).setStrokeStyle(3, BURGUNDY).setScrollFactor(0).setDepth(1200);
    this.scene.add.text(w / 2, h / 2 - 72, 'ROUTINE COMPLETE', { fontSize: '24px', fontStyle: 'bold', color: '#800020' }).setOrigin(0.5).setScrollFactor(0).setDepth(1201);
    this.scene.add.text(w / 2, h / 2 - 10, `Action Points +${points}`, { fontSize: '16px', color: '#333333' }).setOrigin(0.5).setScrollFactor(0).setDepth(1201);
    this.scene.add.text(w / 2, h / 2 + 62, 'Refresh the page or start again from the menu.', { fontSize: '13px', color: '#111111' }).setOrigin(0.5).setScrollFactor(0).setDepth(1201);
  }

  private create() {
    const w = this.scene.scale.width;
    this.scene.add.rectangle(120, 28, 224, 18, 0xd9d9d9).setOrigin(0, 0.5).setScrollFactor(0).setDepth(900);
    this.hpBar = this.scene.add.rectangle(122, 28, 220, 14, BURGUNDY).setOrigin(0, 0.5).setScrollFactor(0).setDepth(901);
    this.expBar = this.scene.add.rectangle(0, 2, 0, 4, BURGUNDY).setOrigin(0, 0).setScrollFactor(0).setDepth(902);
    this.timerText = this.scene.add.text(w / 2, 18, '00:00', { fontSize: '24px', fontStyle: 'bold', color: '#800020' }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(902);
    this.levelText = this.scene.add.text(w - 110, 18, 'LV 1', { fontSize: '16px', fontStyle: 'bold', color: '#333333' }).setScrollFactor(0).setDepth(902);
    this.dashText = this.scene.add.text(w - 135, 44, 'DASH READY', { fontSize: '12px', color: '#333333' }).setScrollFactor(0).setDepth(902);
    for (let i = 0; i < 4; i++) {
      this.scene.add.rectangle(30 + i * 74, 72, 64, 44, 0xffffff, 0.88).setStrokeStyle(2, BURGUNDY).setScrollFactor(0).setDepth(902);
      this.skillTexts.push(this.scene.add.text(30 + i * 74, 72, '-', { fontSize: '11px', color: '#111111', align: 'center' }).setOrigin(0.5).setScrollFactor(0).setDepth(903));
    }
  }
}
