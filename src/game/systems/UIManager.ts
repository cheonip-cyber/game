import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { ExpManager } from './ExpManager';
import { SkillManager, UpgradeOption } from './SkillManager';

const BURGUNDY = 0x800020;
const RARITY_COLORS: Record<UpgradeOption['rarity'], number> = {
  Common: 0xffffff,
  Rare: 0xffd166,
  Epic: 0x9b5de5
};

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

  showLevelUp(choices: UpgradeOption[], onPick: (choice: UpgradeOption) => void) {
    this.scene.physics.world.pause();
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const overlay = this.scene.add.rectangle(w / 2, h / 2, w, h, 0x09090c, 0.72).setScrollFactor(0).setDepth(1000);
    const title = this.scene.add.text(w / 2, h / 2 - 170, 'LEVEL UP', { fontSize: '26px', fontStyle: 'bold', color: '#ffd166' }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);
    const cards: Phaser.GameObjects.Container[] = [];
    const spacing = Math.min(210, Math.max(150, w * 0.28));

    choices.forEach((choice, i) => {
      const cx = w / 2 + (i - 1) * spacing;
      const card = this.scene.add.container(cx, h / 2).setScrollFactor(0).setDepth(1001);
      const borderColor = RARITY_COLORS[choice.rarity];
      const bg = this.scene.add.rectangle(0, 0, 180, 230, 0xffffff, 1).setStrokeStyle(3, borderColor, 1);
      const rarity = this.scene.add.text(0, -88, choice.rarity.toUpperCase(), { fontSize: '11px', fontStyle: 'bold', color: '#800020', align: 'center' }).setOrigin(0.5);
      const head = this.scene.add.text(0, -56, choice.title, { fontSize: '16px', fontStyle: 'bold', color: '#111111', align: 'center', wordWrap: { width: 150 } }).setOrigin(0.5);
      const body = this.scene.add.text(0, 28, choice.description, { fontSize: '13px', color: '#333333', align: 'center', wordWrap: { width: 140 } }).setOrigin(0.5);
      card.add([bg, rarity, head, body]);
      card.setSize(180, 230);
      card.setInteractive(new Phaser.Geom.Rectangle(-90, -115, 180, 230), Phaser.Geom.Rectangle.Contains);
      card.on('pointerover', () => bg.setFillStyle(0xfff5df, 1));
      card.on('pointerout', () => bg.setFillStyle(0xffffff, 1));
      card.on('pointerdown', () => {
        cards.forEach((c) => c.destroy());
        overlay.destroy();
        title.destroy();
        this.scene.physics.world.resume();
        onPick(choice);
      });
      cards.push(card);
    });
  }

  showGameOver(points: number, elapsedMs: number) {
    this.scene.physics.world.pause();
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const sec = Math.floor(elapsedMs / 1000);

    this.scene.add.rectangle(w / 2, h / 2, 440, 320, 0xffffff, 0.97).setStrokeStyle(3, BURGUNDY).setScrollFactor(0).setDepth(1200);
    this.scene.add.text(w / 2, h / 2 - 112, 'ROUTINE COMPLETE', { fontSize: '24px', fontStyle: 'bold', color: '#800020' }).setOrigin(0.5).setScrollFactor(0).setDepth(1201);
    this.scene.add.text(w / 2, h / 2 - 58, `Survived ${Math.floor(sec / 60)}m ${sec % 60}s`, { fontSize: '15px', color: '#333333' }).setOrigin(0.5).setScrollFactor(0).setDepth(1201);
    this.scene.add.text(w / 2, h / 2 - 28, `Action Points +${points}`, { fontSize: '17px', fontStyle: 'bold', color: '#111111' }).setOrigin(0.5).setScrollFactor(0).setDepth(1201);
    this.createButton(w / 2, h / 2 + 42, 'RETRY', () => this.scene.scene.restart());
    this.createButton(w / 2, h / 2 + 104, 'MAIN MENU', () => this.scene.scene.start('MainMenuScene'));
  }

  private createButton(x: number, y: number, label: string, onClick: () => void) {
    const bg = this.scene.add.rectangle(x, y, 190, 44, BURGUNDY, 1).setScrollFactor(0).setDepth(1201).setInteractive({ useHandCursor: true });
    const text = this.scene.add.text(x, y, label, { fontSize: '15px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5).setScrollFactor(0).setDepth(1202);
    bg.on('pointerover', () => bg.setFillStyle(0xa10c36, 1));
    bg.on('pointerout', () => bg.setFillStyle(BURGUNDY, 1));
    bg.on('pointerdown', () => {
      text.destroy();
      bg.destroy();
      this.scene.physics.world.resume();
      onClick();
    });
  }

  private create() {
    const w = this.scene.scale.width;
    this.scene.add.rectangle(120, 28, 224, 18, 0xd9d9d9).setOrigin(0, 0.5).setScrollFactor(0).setDepth(900);
    this.hpBar = this.scene.add.rectangle(122, 28, 220, 14, BURGUNDY).setOrigin(0, 0.5).setScrollFactor(0).setDepth(901);
    this.expBar = this.scene.add.rectangle(0, 2, 0, 4, 0xffd166).setOrigin(0, 0).setScrollFactor(0).setDepth(902);
    this.timerText = this.scene.add.text(w / 2, 18, '00:00', { fontSize: '24px', fontStyle: 'bold', color: '#ffd166' }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(902);
    this.levelText = this.scene.add.text(w - 110, 18, 'LV 1', { fontSize: '16px', fontStyle: 'bold', color: '#ffffff' }).setScrollFactor(0).setDepth(902);
    this.dashText = this.scene.add.text(w - 135, 44, 'DASH READY', { fontSize: '12px', color: '#ffffff' }).setScrollFactor(0).setDepth(902);
    for (let i = 0; i < 4; i++) {
      this.scene.add.rectangle(30 + i * 74, 72, 64, 44, 0xffffff, 0.88).setStrokeStyle(2, BURGUNDY).setScrollFactor(0).setDepth(902);
      this.skillTexts.push(this.scene.add.text(30 + i * 74, 72, '-', { fontSize: '10px', color: '#111111', align: 'center', wordWrap: { width: 58 } }).setOrigin(0.5).setScrollFactor(0).setDepth(903));
    }
  }
}
