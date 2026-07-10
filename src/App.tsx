import React, { useState, useEffect } from 'react';
import IntroScreen from './components/IntroScreen';
import MainScreen from './components/MainScreen';
import GameCanvas from './components/GameCanvas';
import GameOverScreen from './components/GameOverScreen';
import { Character, StageId, Difficulty, UpgradeState } from './types';

type ScreenState = 'intro' | 'main' | 'game' | 'gameover';

export default function App() {
  const [screen, setScreen] = useState<ScreenState>('intro');
  
  // Game Play configurations
  const [activeConfig, setActiveConfig] = useState<{
    character: Character | null;
    stageId: StageId;
    difficulty: Difficulty;
    nickname: string;
  }>({
    character: null,
    stageId: 'elementary',
    difficulty: '하',
    nickname: '모범크리스',
  });

  // Upgrade point states & Cumulative Scores (Synchronized with localStorage)
  const [points, setPoints] = useState<number>(0);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [upgrades, setUpgrades] = useState<UpgradeState>({
    maxHpLevel: 0,
    speedLevel: 0,
    damageLevel: 0,
    magnetLevel: 0,
    dashLevel: 0,
  });

  // Game metrics on completion
  const [gameResult, setGameResult] = useState<{
    victory: boolean;
    survivalTime: number;
    kills: number;
    level: number;
    score: number;
    damageBreakdown: Record<string, number>;
  } | null>(null);

  // Sync state on mount
  useEffect(() => {
    const pts = parseInt(localStorage.getItem('school_attack_points') || '0', 10);
    const tot = parseInt(localStorage.getItem('school_attack_total_score') || '0', 10);
    setPoints(pts);
    setTotalScore(tot);

    const storedUpgrades = localStorage.getItem('school_attack_upgrades');
    if (storedUpgrades) {
      try {
        setUpgrades(JSON.parse(storedUpgrades));
      } catch (e) {
        console.error("Upgrades parsing error", e);
      }
    }
  }, [screen]);

  // Handle stat upgrade
  const handleUpgrade = (key: keyof UpgradeState, cost: number) => {
    if (points >= cost) {
      const nextUpgrades = {
        ...upgrades,
        [key]: upgrades[key] + 1,
      };
      setUpgrades(nextUpgrades);
      const nextPoints = points - cost;
      setPoints(nextPoints);

      localStorage.setItem('school_attack_points', nextPoints.toString());
      localStorage.setItem('school_attack_upgrades', JSON.stringify(nextUpgrades));
    }
  };

  // Reset upgraded points with 100% refund
  const handleResetUpgrades = () => {
    // Return all spent points
    let refundedPoints = points;
    
    // Cost formula matches UpgradeMenu.
    // We sum up the cost paid for each level
    const getPaidCostSum = (level: number) => {
      let sum = 0;
      for (let i = 0; i < level; i++) {
        sum += 700 + i * 450 + i * i * 80;
      }
      return sum;
    };

    (Object.keys(upgrades) as Array<keyof UpgradeState>).forEach((key) => {
      refundedPoints += getPaidCostSum(upgrades[key]);
    });

    const resetUpgrades = {
      maxHpLevel: 0,
      speedLevel: 0,
      damageLevel: 0,
      magnetLevel: 0,
      dashLevel: 0,
    };

    setUpgrades(resetUpgrades);
    setPoints(refundedPoints);
    localStorage.setItem('school_attack_points', refundedPoints.toString());
    localStorage.setItem('school_attack_upgrades', JSON.stringify(resetUpgrades));
  };

  // Refresh points/scores in real-time when ranking registered
  const handleRankingRegistered = () => {
    const pts = parseInt(localStorage.getItem('school_attack_points') || '0', 10);
    const tot = parseInt(localStorage.getItem('school_attack_total_score') || '0', 10);
    setPoints(pts);
    setTotalScore(tot);
  };

  // Screen routing
  switch (screen) {
    case 'intro':
      return (
        <IntroScreen 
          onComplete={() => setScreen('main')} 
        />
      );

    case 'main':
      return (
        <MainScreen
          totalScore={totalScore}
          points={points}
          upgrades={upgrades}
          onUpgrade={handleUpgrade}
          onResetUpgrades={handleResetUpgrades}
          onStartGame={(config) => {
            setActiveConfig({
              character: config.character,
              stageId: config.stageId,
              difficulty: config.difficulty,
              nickname: config.nickname,
            });
            setScreen('game');
          }}
        />
      );

    case 'game':
      if (!activeConfig.character) return null;
      return (
        <div className="w-full h-[100dvh] max-h-[100dvh] flex flex-col overflow-hidden bg-slate-950">
          <GameCanvas
            character={activeConfig.character}
            stageId={activeConfig.stageId}
            difficulty={activeConfig.difficulty}
            upgrades={upgrades}
            onPauseToggle={(isPaused) => {
              // Can hook pause telemetry if needed
            }}
            onGameEnd={(result) => {
              setGameResult(result);
              setScreen('gameover');
            }}
          />
        </div>
      );

    case 'gameover':
      if (!gameResult) return null;
      return (
        <GameOverScreen
          victory={gameResult.victory}
          survivalTime={gameResult.survivalTime}
          kills={gameResult.kills}
          level={gameResult.level}
          score={gameResult.score}
          damageBreakdown={gameResult.damageBreakdown}
          nickname={activeConfig.nickname}
          difficulty={activeConfig.difficulty}
          stageId={activeConfig.stageId}
          onRankingRegistered={handleRankingRegistered}
          onRestart={() => setScreen('game')}
          onGoHome={() => setScreen('main')}
        />
      );

    default:
      return null;
  }
}
