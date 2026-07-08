import Phaser from 'phaser';
import { CHARACTERS, CharacterId, DataManager, DIFFICULTIES, DifficultyId, GameSessionConfig } from '../systems/DataManager';

const CYAN = 0x63e6ff;
const GOLD = 0xffd166;
const PINK = 0xff4d8d;

export class MainMenuScene extends Phaser.Scene {
  private selectedCharacter: CharacterId = 'model';
  private selectedDifficulty: DifficultyId = 'normal';
  private nickname = 'CHRIS';
  private root!: Phaser.GameObjects.Container;

  constructor() { super('MainMenuScene'); }

  create() {
    const state = DataManager.load();
    this.selectedCharacter = state.selectedCharacter;
    this.selectedDifficulty = state.selectedDifficulty;
    this.nickname = state.nickname;
    this.cameras.main.setBackgroundColor('#050611');
    this.drawBackground();
    this.render();
  }

  private render() {
    this.root?.destroy();
    this.root = this.add.container(0, 0);
    const state = DataManager.load();
    const w = this.scale.width;
    const unlocked = new Set(state.unlockedCharacters);

    this.addText(w / 2, 54, '크리스의 스쿨어택', 34, '#63e6ff', true).setOrigin(0.5);
    this.addText(w / 2, 88, 'SCHOOL SWARM SURVIVAL', 13, '#ffd166', true).setOrigin(0.5);
    this.addText(w / 2, 124, '[ 교실 붕괴 10분 전 - 선생님 도착까지 생존하라 ]', 16, '#c8fff4', false).setOrigin(0.5);

    this.addPanel(28, 152, w - 56, 170, 0x101222, CYAN, 0.18);
    this.addText(48, 174, 'MISSION BRIEFING', 13, '#ffd166', true);
    this.addText(48, 204, '학교가 불량학생과 유해환경에 잠식됐다.', 15, '#f4f8ff');
    this.addText(48, 232, '큐브는 불량학생, 삼각형은 유해환경, 오브는 회복된 교실 에너지다.', 13, '#b8c6de');
    this.addText(48, 260, '10분을 버티면 다음 스테이지 진출을 선택할 수 있다.', 13, '#b8c6de');
    this.addText(48, 288, `포인트 ${state.actionPoints} · 최고점 ${state.bestScore} · 최고 생존 ${Math.floor(state.bestTime / 1000)}초`, 13, '#ffffff');

    this.addText(34, 354, '학생 선택', 17, '#ffffff', true);
    CHARACTERS.forEach((character, index) => {
      const x = 34 + index * ((w - 68) / 4);
      const cardW = (w - 86) / 4;
      const locked = !unlocked.has(character.id);
      const selected = this.selectedCharacter === character.id;
      this.addPanel(x, 382, cardW, 142, selected ? 0x1a1730 : 0x101222, selected ? PINK : 0x343a56, selected ? 0.95 : 0.45);
      const iconColor = locked ? 0x555566 : selected ? PINK : CYAN;
      this.root.add(this.add.triangle(x + cardW / 2, 416, 0, 24, 46, 24, 23, 0, iconColor, locked ? 0.35 : 0.9).setDepth(1));
      this.addText(x + cardW / 2, 456, locked ? '잠김' : character.name, 12, locked ? '#707080' : '#ffffff', true).setOrigin(0.5);
      this.addText(x + cardW / 2, 482, locked ? `${character.unlockScore}점 필요` : character.skill, 11, locked ? '#707080' : '#ffd166').setOrigin(0.5);
      this.addText(x + cardW / 2, 506, `HP+${character.hpBonus} ATK+${character.atkBonus}`, 10, locked ? '#565666' : '#b8c6de').setOrigin(0.5);
      const hit = this.add.rectangle(x + cardW / 2, 453, cardW, 142, 0xffffff, 0).setInteractive({ useHandCursor: !locked });
      hit.on('pointerdown', () => {
        if (locked) return;
        this.selectedCharacter = character.id;
        this.render();
      });
      this.root.add(hit);
    });

    this.addText(34, 558, '난이도', 17, '#ffffff', true);
    DIFFICULTIES.forEach((difficulty, index) => {
      const x = 34 + index * ((w - 68) / 4);
      const btnW = (w - 86) / 4;
      const selected = this.selectedDifficulty === difficulty.id;
      this.addButton(x + btnW / 2, 608, btnW, 52, difficulty.name, selected ? GOLD : 0x343a56, () => {
        this.selectedDifficulty = difficulty.id;
        this.render();
      });
    });
    const diff = DataManager.getDifficulty(this.selectedDifficulty);
    this.addText(w / 2, 654, diff.description, 12, '#b8c6de').setOrigin(0.5);

    this.addPanel(28, 684, w - 56, 114, 0x0c0e1a, GOLD, 0.35);
    this.addText(48, 706, '강화 메뉴', 14, '#ffd166', true);
    this.addText(48, 734, `집중력 Lv.${state.characterUpgrades.focus}  체력 Lv.${state.characterUpgrades.stamina}  기동력 Lv.${state.characterUpgrades.mobility}`, 13, '#ffffff');
    this.addButton(w - 130, 738, 160, 44, '포인트 강화', GOLD, () => this.buyUpgrade());

    this.addButton(w / 2, 852, Math.min(420, w - 96), 66, '▶ 출격하기', CYAN, () => this.startRun());
    this.addButton(w / 2, 934, 230, 42, `파일럿: ${this.nickname}`, 0x5762ff, () => this.editNickname());
    this.addText(w / 2, 990, 'WASD 이동 · Space 대시 · 모바일은 화면 드래그 이동 예정', 12, '#858ba6').setOrigin(0.5);
  }

  private startRun() {
    const config: GameSessionConfig = {
      character: this.selectedCharacter,
      difficulty: this.selectedDifficulty,
      nickname: this.nickname,
      stage: 1
    };
    DataManager.savePreferences(config);
    this.scene.start('GameScene', config);
  }

  private buyUpgrade() {
    const state = DataManager.load();
    const upgrades = state.characterUpgrades;
    const order: (keyof typeof upgrades)[] = ['focus', 'stamina', 'mobility'];
    const stat = order.reduce((lowest, current) => upgrades[current] < upgrades[lowest] ? current : lowest, order[0]);
    const cost = 120 + upgrades[stat] * 90;
    if (!DataManager.upgradeCharacter(stat, cost)) {
      this.cameras.main.shake(120, 0.004);
      return;
    }
    this.cameras.main.flash(120, 255, 220, 120);
    this.render();
  }

  private editNickname() {
    const next = window.prompt('랭킹에 표시할 파일럿 이름', this.nickname);
    if (!next) return;
    this.nickname = next.trim().slice(0, 14) || 'CHRIS';
    this.render();
  }

  private drawBackground() {
    const g = this.add.graphics();
    g.lineStyle(1, 0x24304f, 0.35);
    for (let x = 0; x < this.scale.width; x += 76) g.lineBetween(x, 0, x - 120, this.scale.height);
    for (let y = 120; y < this.scale.height; y += 140) g.lineBetween(0, y, this.scale.width, y + 20);
    for (let i = 0; i < 28; i++) {
      this.add.rectangle(Phaser.Math.Between(0, this.scale.width), Phaser.Math.Between(0, this.scale.height), Phaser.Math.Between(2, 5), Phaser.Math.Between(2, 5), Phaser.Display.Color.GetColor(70, 220, 255), 0.4);
    }
  }

  private addPanel(x: number, y: number, width: number, height: number, fill: number, stroke: number, strokeAlpha: number) {
    const panel = this.add.rectangle(x, y, width, height, fill, 0.86).setOrigin(0, 0).setStrokeStyle(2, stroke, strokeAlpha);
    this.root.add(panel);
    return panel;
  }

  private addButton(x: number, y: number, width: number, height: number, label: string, color: number, onClick: () => void) {
    const bg = this.add.rectangle(x, y, width, height, 0x111422, 0.96).setStrokeStyle(2, color, 0.9).setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, { fontFamily: 'Arial, sans-serif', fontSize: '16px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
    bg.on('pointerover', () => bg.setFillStyle(0x1d2235, 1));
    bg.on('pointerout', () => bg.setFillStyle(0x111422, 0.96));
    bg.on('pointerdown', onClick);
    this.root.add([bg, text]);
  }

  private addText(x: number, y: number, text: string, size: number, color: string, bold = false) {
    const obj = this.add.text(x, y, text, { fontFamily: 'Arial, sans-serif', fontSize: `${size}px`, fontStyle: bold ? 'bold' : '', color });
    this.root.add(obj);
    return obj;
  }
}
