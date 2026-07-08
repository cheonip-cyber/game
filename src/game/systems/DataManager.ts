export type CharacterId = 'model' | 'athlete' | 'council' | 'ace';
export type DifficultyId = 'easy' | 'normal' | 'hard' | 'nightmare';

export interface RoutineLevels {
  breakfast: number;
  stretching: number;
  diary: number;
  review: number;
  breathing: number;
}

export interface CharacterUpgradeLevels {
  focus: number;
  stamina: number;
  mobility: number;
}

export interface RankingEntry {
  id: string;
  nickname: string;
  score: number;
  survivedMs: number;
  kills: number;
  level: number;
  difficulty: DifficultyId;
  character: CharacterId;
  stage: number;
  createdAt: number;
}

export interface UserGameState {
  uuid: string;
  actionPoints: number;
  routineLevels: RoutineLevels;
  bestTime: number;
  bestScore: number;
  nickname: string;
  selectedCharacter: CharacterId;
  selectedDifficulty: DifficultyId;
  unlockedCharacters: CharacterId[];
  characterUpgrades: CharacterUpgradeLevels;
  rankings: RankingEntry[];
}

export interface CharacterDef {
  id: CharacterId;
  name: string;
  unlockScore: number;
  hpBonus: number;
  speedBonus: number;
  atkBonus: number;
  critBonus: number;
  skill: string;
  description: string;
}

export interface DifficultyDef {
  id: DifficultyId;
  name: string;
  multiplier: number;
  enemyHp: number;
  enemyDamage: number;
  spawnRate: number;
  description: string;
}

export interface GameSessionConfig {
  character: CharacterId;
  difficulty: DifficultyId;
  nickname: string;
  stage: number;
}

const STORAGE_KEY = 'school_attack_user_state_v1';
const LEGACY_STORAGE_KEY = 'survivor3d_user_state_v2';
const defaultLevels: RoutineLevels = { breakfast: 0, stretching: 0, diary: 0, review: 0, breathing: 0 };
const defaultUpgrades: CharacterUpgradeLevels = { focus: 0, stamina: 0, mobility: 0 };

export const CHARACTERS: CharacterDef[] = [
  { id: 'model', name: '모범생 크리스', unlockScore: 0, hpBonus: 0, speedBonus: 0, atkBonus: 0, critBonus: 0, skill: '이온 스톰', description: '균형 잡힌 기본 학생. 주기적 광역 오라 보유.' },
  { id: 'athlete', name: '체육부 에이스', unlockScore: 900, hpBonus: 18, speedBonus: 28, atkBonus: -2, critBonus: 0.02, skill: '전력질주', description: '빠른 이동과 대시 생존에 특화.' },
  { id: 'council', name: '학생회 수호자', unlockScore: 2200, hpBonus: 45, speedBonus: -8, atkBonus: 3, critBonus: 0.01, skill: '규율 방패', description: '높은 체력과 안정적인 방어력.' },
  { id: 'ace', name: '전교 1등 파일럿', unlockScore: 5000, hpBonus: 20, speedBonus: 15, atkBonus: 7, critBonus: 0.08, skill: '집중 포화', description: '높은 기본 역량과 강한 화력.' }
];

export const DIFFICULTIES: DifficultyDef[] = [
  { id: 'easy', name: '하 x1', multiplier: 1, enemyHp: 0.85, enemyDamage: 0.8, spawnRate: 0.8, description: '표준 등교. 적은 수의 방해 요소.' },
  { id: 'normal', name: '중 x2', multiplier: 2, enemyHp: 1, enemyDamage: 1, spawnRate: 1, description: '불량학생 증가. 랭킹 표준 난이도.' },
  { id: 'hard', name: '상 x4', multiplier: 4, enemyHp: 1.45, enemyDamage: 1.35, spawnRate: 1.35, description: '강화 개체와 유해환경이 빠르게 증가.' },
  { id: 'nightmare', name: '해골 x8', multiplier: 8, enemyHp: 2.1, enemyDamage: 1.8, spawnRate: 1.8, description: '선생님 도착 전까지 버티기 어려운 위기.' }
];

const uuid = () => crypto?.randomUUID?.() ?? `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const numberOrZero = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
const characterIds = new Set<CharacterId>(CHARACTERS.map((c) => c.id));
const difficultyIds = new Set<DifficultyId>(DIFFICULTIES.map((d) => d.id));

export class DataManager {
  static load(): UserGameState {
    const raw = localStorage.getItem(STORAGE_KEY);
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    const source = raw ?? legacyRaw;
    if (!source) return this.defaultState();

    try {
      const parsed = JSON.parse(source) as Partial<UserGameState>;
      const routineLevels = parsed.routineLevels ?? defaultLevels;
      const upgrades = parsed.characterUpgrades ?? defaultUpgrades;
      const bestScore = Math.floor(numberOrZero(parsed.bestScore));
      const unlocked = new Set<CharacterId>(['model']);
      CHARACTERS.forEach((character) => {
        if (bestScore >= character.unlockScore) unlocked.add(character.id);
      });
      (parsed.unlockedCharacters ?? []).forEach((id) => {
        if (characterIds.has(id)) unlocked.add(id);
      });

      return {
        uuid: typeof parsed.uuid === 'string' && parsed.uuid.length > 0 ? parsed.uuid : uuid(),
        actionPoints: Math.floor(numberOrZero(parsed.actionPoints)),
        routineLevels: {
          breakfast: Math.floor(numberOrZero(routineLevels.breakfast)),
          stretching: Math.floor(numberOrZero(routineLevels.stretching)),
          diary: Math.floor(numberOrZero(routineLevels.diary)),
          review: Math.floor(numberOrZero(routineLevels.review)),
          breathing: Math.floor(numberOrZero(routineLevels.breathing))
        },
        bestTime: numberOrZero(parsed.bestTime),
        bestScore,
        nickname: typeof parsed.nickname === 'string' && parsed.nickname.trim().length > 0 ? parsed.nickname.slice(0, 14) : 'CHRIS',
        selectedCharacter: characterIds.has(parsed.selectedCharacter as CharacterId) ? parsed.selectedCharacter as CharacterId : 'model',
        selectedDifficulty: difficultyIds.has(parsed.selectedDifficulty as DifficultyId) ? parsed.selectedDifficulty as DifficultyId : 'normal',
        unlockedCharacters: [...unlocked],
        characterUpgrades: {
          focus: Math.floor(numberOrZero(upgrades.focus)),
          stamina: Math.floor(numberOrZero(upgrades.stamina)),
          mobility: Math.floor(numberOrZero(upgrades.mobility))
        },
        rankings: this.normalizeRankings(parsed.rankings)
      };
    }
    catch {
      return this.defaultState();
    }
  }

  static save(state: UserGameState) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  static savePreferences(config: GameSessionConfig) {
    const state = this.load();
    state.selectedCharacter = config.character;
    state.selectedDifficulty = config.difficulty;
    state.nickname = config.nickname.slice(0, 14) || 'CHRIS';
    this.save(state);
  }

  static getCharacter(id: CharacterId) {
    return CHARACTERS.find((character) => character.id === id) ?? CHARACTERS[0];
  }

  static getDifficulty(id: DifficultyId) {
    return DIFFICULTIES.find((difficulty) => difficulty.id === id) ?? DIFFICULTIES[1];
  }

  static upgradeCharacter(stat: keyof CharacterUpgradeLevels, cost: number) {
    const state = this.load();
    if (state.actionPoints < cost) return false;
    state.actionPoints -= cost;
    state.characterUpgrades[stat] += 1;
    this.save(state);
    return true;
  }

  static addRunResult(result: Omit<RankingEntry, 'id' | 'createdAt'>) {
    const state = this.load();
    const entry: RankingEntry = { ...result, id: uuid(), createdAt: Date.now() };
    const earnedPoints = Math.max(1, Math.floor(result.score / 80));
    state.actionPoints += earnedPoints;
    state.bestTime = Math.max(state.bestTime, result.survivedMs);
    state.bestScore = Math.max(state.bestScore, result.score);
    state.rankings = this.normalizeRankings([entry, ...state.rankings]);
    CHARACTERS.forEach((character) => {
      if (state.bestScore >= character.unlockScore && !state.unlockedCharacters.includes(character.id)) {
        state.unlockedCharacters.push(character.id);
      }
    });
    this.save(state);
    return { state, entry, earnedPoints };
  }

  static addActionPoints(points: number, survivedMs: number) {
    const state = this.load();
    state.actionPoints += points;
    state.bestTime = Math.max(state.bestTime, survivedMs);
    this.save(state);
    return state;
  }

  private static defaultState(): UserGameState {
    return {
      uuid: uuid(),
      actionPoints: 0,
      routineLevels: { ...defaultLevels },
      bestTime: 0,
      bestScore: 0,
      nickname: 'CHRIS',
      selectedCharacter: 'model',
      selectedDifficulty: 'normal',
      unlockedCharacters: ['model'],
      characterUpgrades: { ...defaultUpgrades },
      rankings: []
    };
  }

  private static normalizeRankings(rankings: unknown): RankingEntry[] {
    if (!Array.isArray(rankings)) return [];
    return rankings
      .filter((entry) => typeof entry === 'object' && entry !== null)
      .map((entry) => {
        const raw = entry as Partial<RankingEntry>;
        return {
          id: typeof raw.id === 'string' ? raw.id : uuid(),
          nickname: typeof raw.nickname === 'string' ? raw.nickname.slice(0, 14) : 'CHRIS',
          score: Math.floor(numberOrZero(raw.score)),
          survivedMs: numberOrZero(raw.survivedMs),
          kills: Math.floor(numberOrZero(raw.kills)),
          level: Math.floor(numberOrZero(raw.level)),
          difficulty: difficultyIds.has(raw.difficulty as DifficultyId) ? raw.difficulty as DifficultyId : 'normal',
          character: characterIds.has(raw.character as CharacterId) ? raw.character as CharacterId : 'model',
          stage: Math.max(1, Math.floor(numberOrZero(raw.stage)) || 1),
          createdAt: numberOrZero(raw.createdAt) || Date.now()
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
  }
}
