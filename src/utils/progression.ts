export function calculateEarnedPoints(score: number): number {
  const safeScore = Math.max(0, score);
  const previousFormulaResult = 50 * Math.log(safeScore / 100 + 1) + safeScore * 0.01;
  return Math.max(1, Math.round(previousFormulaResult * 0.1));
}

export function getUpgradeCost(level: number): number {
  const previousCost = 700 + level * 450 + level * level * 80;
  return previousCost * 5;
}
