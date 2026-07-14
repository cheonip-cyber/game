import { Difficulty, StageId } from '../types';

const POINT_STAGE_MULTIPLIER: Record<StageId, number> = {
  elementary: 1,
  middle: 1.5,
  high: 2.4,
};

const POINT_DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  '하': 1,
  '중': 1.15,
  '상': 1.6,
  '해골': 2.4,
};

export function calculateEarnedPoints(score: number, stageId: StageId, difficulty: Difficulty): number {
  const safeScore = Math.max(0, score);
  const previousFormulaResult = 50 * Math.log(safeScore / 100 + 1) + safeScore * 0.01;
  const progressionMultiplier = POINT_STAGE_MULTIPLIER[stageId] * POINT_DIFFICULTY_MULTIPLIER[difficulty];
  return Math.max(1, Math.round(previousFormulaResult * 0.04 * progressionMultiplier));
}

const UPGRADE_COSTS = [100, 200, 500, 600, 800, 900, 1000, 1500, 2000, 3000] as const;

export function getUpgradeCost(level: number): number {
  const safeLevel = Math.max(0, Math.min(UPGRADE_COSTS.length - 1, Math.floor(level)));
  return UPGRADE_COSTS[safeLevel];
}

export function getUpgradeGrowthUnits(level: number): number {
  const safeLevel = Math.max(0, Math.min(10, Math.floor(level)));
  return safeLevel < 10 ? safeLevel : 11;
}
