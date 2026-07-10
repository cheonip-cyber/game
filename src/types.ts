export interface UpgradeState {
  maxHpLevel: number; // Max HP +5% per level
  speedLevel: number; // Speed +2% per level
  damageLevel: number; // Damage +4% per level
  magnetLevel: number; // Magnet Range +6% per level
  dashLevel: number; // Dash cooldown -4% per level
}

export interface Character {
  id: string;
  name: string;
  title: string;
  description: string;
  unlockScore: number;
  baseHp: number;
  baseSpeed: number;
  baseDamage: number;
  baseMagnet: number;
  specialSkill: string;
  specialSkillDesc: string;
  imageColor: string; // TailWind color representative for rendering
  weaponId: string;
}

export interface Weapon {
  id: string;
  name: string;
  level: number;
  description: string;
  damage: number;
  cooldown: number; // in ms
  lastFired: number;
}

export interface GameScore {
  nickname: string;
  score: number;
  survivalTime: number; // in seconds
  kills: number;
  level: number;
  difficulty: string;
  stage: string;
  date: string;
}

export type Difficulty = '하' | '중' | '상' | '해골';
export type StageId = 'elementary' | 'middle' | 'high';

export interface Stage {
  id: StageId;
  name: string;
  description: string;
  multiplier: number;
}

export interface InGameItem {
  id: string;
  name: string;
  description: string;
  effect: string;
  rarity: '일반' | '희귀' | '전설';
  color: string;
}
