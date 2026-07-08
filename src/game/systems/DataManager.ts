export interface RoutineLevels { breakfast: number; stretching: number; diary: number; review: number; breathing: number; }
export interface UserGameState { uuid: string; actionPoints: number; routineLevels: RoutineLevels; bestTime: number; }
const STORAGE_KEY = 'survivor3d_user_state_v2';
const defaultLevels: RoutineLevels = { breakfast: 0, stretching: 0, diary: 0, review: 0, breathing: 0 };
const uuid = () => crypto?.randomUUID?.() ?? `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const numberOrZero = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;

export class DataManager {
  static load(): UserGameState {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { uuid: uuid(), actionPoints: 0, routineLevels: { ...defaultLevels }, bestTime: 0 };
    try {
      const parsed = JSON.parse(raw) as Partial<UserGameState>;
      const routineLevels = parsed.routineLevels ?? defaultLevels;
      return {
        uuid: typeof parsed.uuid === 'string' && parsed.uuid.length > 0 ? parsed.uuid : uuid(),
        actionPoints: Math.floor(numberOrZero(parsed.actionPoints)),
        bestTime: numberOrZero(parsed.bestTime),
        routineLevels: {
          breakfast: Math.floor(numberOrZero(routineLevels.breakfast)),
          stretching: Math.floor(numberOrZero(routineLevels.stretching)),
          diary: Math.floor(numberOrZero(routineLevels.diary)),
          review: Math.floor(numberOrZero(routineLevels.review)),
          breathing: Math.floor(numberOrZero(routineLevels.breathing))
        }
      };
    }
    catch { return { uuid: uuid(), actionPoints: 0, routineLevels: { ...defaultLevels }, bestTime: 0 }; }
  }
  static save(state: UserGameState) { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  static addActionPoints(points: number, survivedMs: number) {
    const state = this.load();
    state.actionPoints += points;
    state.bestTime = Math.max(state.bestTime, survivedMs);
    this.save(state);
    return state;
  }
}
