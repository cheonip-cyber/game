import React from 'react';
import { UpgradeState } from '../types';
import { Shield, Zap, Swords, Magnet, Milestone, Trophy } from 'lucide-react';

interface UpgradeMenuProps {
  upgrades: UpgradeState;
  points: number;
  onUpgrade: (key: keyof UpgradeState, cost: number) => void;
  onReset: () => void;
  onClose: () => void;
}

const UPGRADE_DETAILS = {
  maxHpLevel: {
    name: '급식 전용 맷집 체력',
    description: '최대 체력을 10% 증가시키고 견고해집니다.',
    icon: Shield,
    color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800',
    statName: '최대 HP',
    statBonus: '+10%',
  },
  speedLevel: {
    name: '등교 전용 초고속 발걸음',
    description: '기본 이동 속도를 5% 증가시킵니다.',
    icon: Zap,
    color: 'text-cyan-400 bg-cyan-950/40 border-cyan-800',
    statName: '이동 속도',
    statBonus: '+5%',
  },
  damageLevel: {
    name: '샤프심 필기 타격력',
    description: '기본 공격 데미지를 10% 증가시킵니다.',
    icon: Swords,
    color: 'text-rose-400 bg-rose-950/40 border-rose-800',
    statName: '공격 공격력',
    statBonus: '+10%',
  },
  magnetLevel: {
    name: '바른 필기구 흡입력',
    description: '경험치 연필과 아이템을 빨아들이는 범위를 15% 늘립니다.',
    icon: Magnet,
    color: 'text-yellow-400 bg-yellow-950/40 border-yellow-800',
    statName: '습득 범위',
    statBonus: '+15%',
  },
  dashLevel: {
    name: '선도부 우회 기동력',
    description: '체육복 대시의 쿨다운을 10% 단축합니다.',
    icon: Milestone,
    color: 'text-purple-400 bg-purple-950/40 border-purple-800',
    statName: '대시 쿨타임',
    statBonus: '-10%',
  },
};

const MAX_LEVEL = 5;

export default function UpgradeMenu({ upgrades, points, onUpgrade, onReset, onClose }: UpgradeMenuProps) {
  const getCost = (level: number) => {
    return (level + 1) * 350; // Cost increases per level
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-400 animate-bounce" />
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight">명예 모범생 생활 기록부 (영구 강화)</h2>
              <p className="text-xs text-slate-400">학업 및 생존 효율을 증가시켜 주는 명예 배지입니다.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>

        {/* Reward Point Panel */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">보유 생활 포인트 :</span>
            <span className="text-2xl font-black text-yellow-400 tracking-wider">
              {points.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 font-bold">PTS</span>
          </div>
          <button
            onClick={() => {
              if (window.confirm("정말로 모든 능력을 초기화하고 포인트를 전액 환불받으시겠습니까?")) {
                onReset();
              }
            }}
            className="text-xs text-rose-400 hover:text-rose-300 bg-rose-950/20 hover:bg-rose-900/30 border border-rose-900/50 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
          >
            강화 리셋 (100% 환불)
          </button>
        </div>

        {/* Upgrade list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-900/40">
          {(Object.keys(UPGRADE_DETAILS) as Array<keyof UpgradeState>).map((key) => {
            const currentLevel = upgrades[key];
            const isMax = currentLevel >= MAX_LEVEL;
            const cost = getCost(currentLevel);
            const detail = UPGRADE_DETAILS[key];
            const IconComponent = detail.icon;
            const canAfford = points >= cost;

            return (
              <div 
                key={key} 
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border transition-all ${
                  isMax 
                    ? 'border-yellow-600/30 bg-yellow-950/5' 
                    : 'border-slate-800 bg-slate-900'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-3 rounded-lg border shrink-0 ${detail.color}`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-200">{detail.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        isMax ? 'bg-yellow-400/20 text-yellow-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        Lv.{currentLevel} / {MAX_LEVEL} {isMax && 'MAX'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">{detail.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs font-semibold text-slate-500">{detail.statName} 보너스:</span>
                      <span className="text-xs font-bold text-emerald-400">{(currentLevel * parseFloat(detail.statBonus)).toFixed(0)}% 적용 중</span>
                      {!isMax && (
                        <span className="text-xs font-semibold text-cyan-400">→ {((currentLevel + 1) * parseFloat(detail.statBonus)).toFixed(0)}%</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end sm:flex-col gap-3 sm:gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                  {!isMax ? (
                    <>
                      <div className="text-right">
                        <span className="text-xs text-slate-500 block">필요 포인트</span>
                        <span className={`text-lg font-bold ${canAfford ? 'text-yellow-400' : 'text-slate-500'}`}>
                          {cost.toLocaleString()}
                        </span>
                      </div>
                      <button
                        onClick={() => onUpgrade(key, cost)}
                        disabled={!canAfford}
                        className={`px-4 py-2 rounded-lg text-xs font-black transition-all shadow-md cursor-pointer ${
                          canAfford 
                            ? 'bg-yellow-400 hover:bg-yellow-300 text-slate-950 hover:scale-105' 
                            : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                        }`}
                      >
                        연구 강화
                      </button>
                    </>
                  ) : (
                    <div className="text-center py-2 px-4 rounded bg-yellow-950/20 border border-yellow-700/30 text-yellow-500 font-bold text-xs tracking-wider">
                      ★ 완전 마스터 ★
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 text-center border-t border-slate-800 text-xs text-slate-500">
          교내 안전 수칙을 준수하는 모범적인 생존자가 됩시다.
        </div>
      </div>
    </div>
  );
}
