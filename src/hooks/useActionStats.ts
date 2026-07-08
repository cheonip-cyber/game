import { useEffect, useState } from 'react';
import { DataManager, RoutineLevels, UserGameState } from '../game/systems/DataManager';

export function useActionStats() {
  const [gameState, setGameState] = useState<UserGameState>(() => DataManager.load());
  useEffect(() => { DataManager.save(gameState); }, [gameState]);
  const addPoints = (points: number) => setGameState((s: UserGameState) => ({ ...s, actionPoints: s.actionPoints + points }));
  const upgradeStat = (stat: keyof RoutineLevels, cost: number) => {
    if (gameState.actionPoints < cost) return false;
    setGameState((s: UserGameState) => ({ ...s, actionPoints: s.actionPoints - cost, routineLevels: { ...s.routineLevels, [stat]: s.routineLevels[stat] + 1 } }));
    return true;
  };
  return { gameState, addPoints, upgradeStat };
}
