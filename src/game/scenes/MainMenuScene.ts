import Phaser from 'phaser';
import { CHARACTERS, CharacterId, DataManager, DIFFICULTIES, DifficultyId, GameSessionConfig } from '../systems/DataManager';

const CYAN = 0x63e6ff;
const GOLD = 0xffd166;
const PINK = 0xff4d8d;
const BASE_W = 430;
const BASE_H = 900;

export class MainMenuScene extends Phaser.Scene {
  private selectedCharacter: CharacterId = 'model';
  private selectedDifficulty: DifficultyId = 'normal';
  private nickname = 'CHRIS';
  private root?: Phaser.GameObjects.Container;
  private background?: Phaser.GameObjects.Graphics;

  constructor() { super('MainMenuScene'); }

  create() {
    const state = DataManager.load();
    this.selectedCharacter = state.selectedCharacter;
    this.selectedDifficulty = state.selectedDifficulty;
    this.nickname = state.nickname;
    this.cameras.main.setBackgroundColor('#050611');
    this.scale.on('resize', this.render, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.render, this));
    this.render();
  }

  private render() {
    this.root?.destroy();
    this.background?.destroy();
    this.drawBackground();

    const state = DataManager.load();
    const w = this.scale.width;
    const h = this.scale.height;
    const safeTop = 10;
    const safeBottom = 10;
    const scale = Math.min(1, w / BASE_W, (h - safeTop - safeBottom) / BASE_H);
    const x = (w - BASE_W * scale) / 2;
    const y = Math.max(safeTop, (h - BASE_H * scale) / 2);
    const unlocked = new Set(state.unlockedCharacters);

    this.root = this.add.container(x, y).setScale(scale);

    this.addText(BASE_W / 2, 36, '크리스의 스쿨어택', 31, '#63e6ff', true).setOrigin(0.5);
    this.addText(BASE_W / 2, 66, 'SCHOOL ATTACK SURVIVAL', 12, '#ffd166', true).setOrigin(0.5);
    this.addButton(BASE_W - 62, 36, 86, 34, '전체화면', 0x5762ff, () => this.enterFullscreen(), 11);
    this.addText(BASE_W / 2, 104, '[ 교실 붕괴 10분 전 - 선생님 도착까지 생존 ]', 14, '#c8fff4').setOrigin(0.5);

    this.addPanel(18, 126, BASE_W - 36, 146, 0x101222, CYAN, 0.18);
    this.addText(36, 144, 'MISSION BRIEFING', 12, '#ffd166', true);
    this.addText(36, 172, '학교가 불량학생과 유해환경에 잠식됐다.', 14, '#f4f8ff');
    this.addText(36, 198, '큐브는 불량학생, 삼각형은 유해환경, 오브는 회복된 교실 에너지다.', 12, '#b8c6de');
    this.addText(36, 222, '10분 생존 시 다음 스테이지 진출 선택. 목표는 30분 생존.', 12, '#b8c6de');
    this.addText(36, 248, `포인트 ${state.actionPoints} · 최고점 ${state.bestScore} · 최고 생존 ${Math.floor(state.bestTime / 1000)}초`, 12, '#ffffff');

    this.addText(22, 304, '학생 선택', 15, '#ffffff', true);
    CHARACTERS.forEach((character, index) => {
      const cardW = 94;
      const gap = 8;
      const xPos = 22 + index * (cardW + gap);
      const locked = !unlocked.has(character.id);
      const selected = this.selectedCharacter === character.id;
      this.addPanel(xPos, 330, cardW, 122, selected ? 0x1a1730 : 0x101222, selected ? PINK : 0x343a56, selected ? 0.95 : 0.45);
      const iconColor = locked ? 0x555566 : selected ? PINK : CYAN;
      this.root!.add(this.add.triangle(xPos + cardW / 2, 358, 0, 22, 42, 22, 21, 0, iconColor, locked ? 0.35 : 0.9));
      this.addText(xPos + cardW / 2, 392, locked ? '잠김' : character.name, 10, locked ? '#707080' : '#ffffff', true).setOrigin(0.5);
      this.addText(xPos + cardW / 2, 416, locked ? `${character.unlockScore}점` : character.skill, 10, locked ? '#707080' : '#ffd166').setOrigin(0.5);
      this.addText(xPos + cardW / 2, 438, `HP+${character.hpBonus}`, 9, locked ? '#565666' : '#b8c6de').setOrigin(0.5);
      const hit = this.add.rectangle(xPos + cardW / 2, 391, cardW, 122, 0xffffff, 0).setInteractive({ useHandCursor: !locked });
      hit.on('pointerdown', () => {
        if (locked) return;
        this.selectedCharacter = character.id;
        this.render();
      });
      this.root!.add(hit);
    });

    this.addText(22, 486, '난이도', 15, '#ffffff', true);
    DIFFICULTIES.forEach((difficulty, index) => {
      const btnW = 94;
      const gap = 8;
      const xPos = 22 + index * (btnW + gap) + btnW / 2;
      const selected = this.selectedDifficulty === difficulty.id;
      this.addButton(xPos, 528, btnW, 46, difficulty.name, selected ? GOLD : 0x343a56, () => {
        this.selectedDifficulty = difficulty.id;
        this.render();
      }, 13);
    });
    const diff = DataManager.getDifficulty(this.selectedDifficulty);
    this.addText(BASE_W / 2, 570, diff.description, 11, '#b8c6de').setOrigin(0.5);

    this.addPanel(18, 596, BASE_W - 36, 102, 0x0c0e1a, GOLD, 0.35);
    this.addText(36, 616, '강화 메뉴', 13, '#ffd166', true);
    this.addText(36, 644, `집중력 Lv.${state.characterUpgrades.focus}  체력 Lv.${state.characterUpgrades.stamina}  기동력 Lv.${state.characterUpgrades.mobility}`, 12, '#ffffff');
    this.addButton(BASE_W - 100, 652, 140, 40, '포인트 강화', GOLD, () => this.buyUpgrade(), 12);

    this.addButton(BASE_W / 2, 750, BASE_W - 88, 60, '▶ 출격하기', CYAN, () => this.startRun(), 18);
    this.addButton(BASE_W / 2, 820, 220, 40, `파일럿: ${this.nickname}`, 0x5762ff, () => this.editNickname(), 13);
    this.addText(BASE_W / 2, 868, 'WASD 이동 · Space 대시 · 모바일은 전체화면 권장', 11, '#858ba6').setOrigin(0.5);
  }

  private enterFullscreen() {
    const element = document.documentElement;
    if (!document.fullscreenElement && element.requestFullscreen) {
      element.requestFullscreen().catch(() => undefined);
    }
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
    this.background = this.add.graphics();
    this.background.lineStyle(1, 0x24304f, 0.35);
    for (let x = 0; x < this.scale.width; x += 76) this.background.lineBetween(x, 0, x - 120, this.scale.height);
    for (let y = 120; y < this.scale.height; y += 140) this.background.lineBetween(0, y, this.scale.width, y + 20);
    for (let i = 0; i < 28; i++) {
      this.add.rectangle(Phaser.Math.Between(0, this.scale.width), Phaser.Math.Between(0, this.scale.height), Phaser.Math.Between(2, 5), Phaser.Math.Between(2, 5), Phaser.Display.Color.GetColor(70, 220, 255), 0.4);
    }
  }

  private addPanel(x: number, y: number, width: number, height: number, fill: number, stroke: number, strokeAlpha: number) {
    const panel = this.add.rectangle(x, y, width, height, fill, 0.86).setOrigin(0, 0).setStrokeStyle(2, stroke, strokeAlpha);
    this.root!.add(panel);
    return panel;
  }

  private addButton(x: number, y: number, width: number, height: number, label: string, color: number, onClick: () => void, fontSize = 16) {
    const bg = this.add.rectangle(x, y, width, height, 0x111422, 0.96).setStrokeStyle(2, color, 0.9).setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, { fontFamily: 'Arial, sans-serif', fontSize: `${fontSize}px`, fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
    bg.on('pointerover', () => bg.setFillStyle(0x1d2235, 1));
    bg.on('pointerout', () => bg.setFillStyle(0x111422, 0.96));
    bg.on('pointerdown', onClick);
    this.root!.add([bg, text]);
  }

  private addText(x: number, y: number, text: string, size: number, color: string, bold = false) {
    const obj = this.add.text(x, y, text, { fontFamily: 'Arial, sans-serif', fontSize: `${size}px`, fontStyle: bold ? 'bold' : '', color });
    this.root!.add(obj);
    return obj;
  }
}
