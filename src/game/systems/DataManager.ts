export interface RoutineLevels { breakfast: number; stretching: number; diary: number; review: number; breathing: number; }
export interface UserGameState { uuid: string; actionPoints: number; routineLevels: RoutineLevels; bestTime: number; }

const STORAGE_KEY = 'survivor3d_user_state';
const defaultState = (): UserGameState => ({
  uuid: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
  actionPoints: 0,
  routineLevels: { breakfast: 0, stretching: 0, diary: 0, review: 0, breathing: 0 },
  bestTime: 0
});

export class DataManager {
  static load(): UserGameState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      return { ...defaultState(), ...JSON.parse(raw) };
    } catch { return defaultState(); }
  }
  static save(state: UserGameState) { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
}
