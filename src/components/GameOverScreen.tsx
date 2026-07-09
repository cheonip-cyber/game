import React, { useState, useEffect, useRef } from 'react';
import { GameScore } from '../types';
import { Trophy, RefreshCw, Home, Share2, BarChart3, Save } from 'lucide-react';

interface GameOverScreenProps {
  victory: boolean;
  survivalTime: number;
  kills: number;
  level: number;
  score: number;
  damageBreakdown: Record<string, number>;
  nickname: string;
  difficulty: string;
  stageId: string;
  onRestart: () => void;
  onGoHome: () => void;
  onRankingRegistered: () => void;
}

const DEFAULT_RANKS: GameScore[] = [
  { nickname: '학업우수자', score: 38000, survivalTime: 600, kills: 980, level: 25, difficulty: '상', stage: '초등학교 구역', date: '2026-07-01' },
  { nickname: '선도위원장', score: 25000, survivalTime: 600, kills: 720, level: 21, difficulty: '중', stage: '초등학교 구역', date: '2026-07-03' },
  { nickname: '크리스복제인간', score: 18000, survivalTime: 450, kills: 480, level: 16, difficulty: '하', stage: '초등학교 구역', date: '2026-07-04' },
  { nickname: '공부벌레', score: 12000, survivalTime: 320, kills: 350, level: 12, difficulty: '하', stage: '초등학교 구역', date: '2026-07-05' },
  { nickname: '빵셔틀탈출러', score: 9500, survivalTime: 280, kills: 280, level: 10, difficulty: '하', stage: '초등학교 구역', date: '2026-07-06' },
];

export default function GameOverScreen({
  victory,
  survivalTime,
  kills,
  level,
  score,
  damageBreakdown,
  nickname,
  difficulty,
  stageId,
  onRestart,
  onGoHome,
  onRankingRegistered,
}: GameOverScreenProps) {
  const [rankingName, setRankingName] = useState(nickname);
  const [registered, setRegistered] = useState(false);
  const registeredRef = useRef(false);
  const [globalRankings, setGlobalRankings] = useState<GameScore[]>([]);

  const totalDamage = Object.values(damageBreakdown).reduce((sum, d) => sum + d, 0);

  const formatSec = (sec: number) => {
    const safeSec = Math.max(0, Math.floor(sec));
    const m = Math.floor(safeSec / 60);
    const s = safeSec % 60;
    return `${m}분 ${s}초`;
  };

  const stageNameMap: Record<string, string> = {
    elementary: '초등학교 구역',
    middle: '중학교 구역',
    high: '고등학교 구역',
  };

  const getStoredRankings = (): GameScore[] => {
    const stored = localStorage.getItem('school_attack_rankings');
    if (!stored) return [];

    try {
      const parsed = JSON.parse(stored) as GameScore[];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  const buildRankingView = (scores: GameScore[]) => {
    return [...scores, ...DEFAULT_RANKS]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  };

  const loadRankings = () => {
    setGlobalRankings(buildRankingView(getStoredRankings()));
  };

  useEffect(() => {
    loadRankings();
  }, []);

  const handleRegisterRanking = () => {
    if (registeredRef.current) return;

    const trimmedName = rankingName.trim();
    if (!trimmedName) {
      alert('등록할 이름을 기입해주세요!');
      return;
    }

    registeredRef.current = true;

    const newScore: GameScore = {
      nickname: trimmedName,
      score,
      survivalTime,
      kills,
      level,
      difficulty,
      stage: stageNameMap[stageId] || '초등학교 구역',
      date: new Date().toISOString().split('T')[0],
    };

    try {
      const currentRankings = getStoredRankings();
      const updatedRankings = [newScore, ...currentRankings];
      localStorage.setItem('school_attack_rankings', JSON.stringify(updatedRankings));
      localStorage.setItem('school_attack_nickname', trimmedName);

      const currentPoints = Number.parseInt(localStorage.getItem('school_attack_points') || '0', 10) || 0;
      const totalCumulative = Number.parseInt(localStorage.getItem('school_attack_total_score') || '0', 10) || 0;

      localStorage.setItem('school_attack_points', (currentPoints + score).toString());
      localStorage.setItem('school_attack_total_score', (totalCumulative + score).toString());

      setRegistered(true);
      setGlobalRankings(buildRankingView(updatedRankings));
      onRankingRegistered();
    } catch (error) {
      registeredRef.current = false;
      console.error('Ranking save failed', error);
      alert('랭킹 저장에 실패했습니다. 브라우저 저장 공간을 확인해주세요.');
    }
  };

  const handleShare = () => {
    const timeStr = formatSec(survivalTime);
    const shareText = `[크리스의 스쿨어택!] ${nickname}대원이 ${difficulty}난이도에서 ${timeStr} 생존, ${kills}명 처치하고 ${score}점을 획득했습니다!`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      alert('결과가 클립보드에 복사되었습니다. SNS에 자랑해 보세요!');
    } else {
      alert(shareText);
    }
  };

  return (
    <div className="school-3d-shell h-[100dvh] max-h-[100dvh] overflow-y-auto overscroll-contain bg-slate-950 text-slate-100 p-4 md:p-8 pb-10 font-sans select-none relative">
      <div className="school-3d-hero opacity-30" aria-hidden="true" />
      <div className={`fixed top-1/4 left-1/2 -translate-x-1/2 w-[35%] h-[35%] rounded-full blur-[120px] pointer-events-none ${
        victory ? 'bg-emerald-900/25' : 'bg-rose-900/25'
      }`} />

      <div className="school-3d-panel w-full max-w-5xl mx-auto bg-slate-900 border-2 border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative z-10 grid grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-5 p-5 md:p-8 bg-slate-950/80 border-b lg:border-b-0 lg:border-r border-slate-800">
          <div className="text-center mb-5">
            {victory ? (
              <>
                <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full font-bold tracking-widest uppercase animate-pulse">
                  MISSION COMPLETE
                </span>
                <h2 className="text-3xl md:text-5xl font-black text-emerald-400 mt-2 tracking-tight">선생님 구출!</h2>
                <p className="text-xs text-slate-400 mt-1">질서 정리가 완료되었습니다. 다음 구역을 향해 나아가십시오.</p>
              </>
            ) : (
              <>
                <span className="text-[10px] bg-rose-500/10 border border-rose-500/20 text-rose-400 px-3 py-1 rounded-full font-bold tracking-widest uppercase animate-pulse">
                  SIGNAL LOST
                </span>
                <h2 className="text-3xl md:text-5xl font-black text-rose-500 mt-2 tracking-tight">학교 정화 실패</h2>
                <p className="text-xs text-slate-400 mt-1">유해환경과 불량 세력에 교복 나노수트 에너지가 소진되었습니다.</p>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-900">
              <span className="text-[10px] text-slate-500 font-bold block">생존 시간</span>
              <span className="text-base font-black text-slate-200">{formatSec(survivalTime)}</span>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-900">
              <span className="text-[10px] text-slate-500 font-bold block">불량학생 선도</span>
              <span className="text-base font-black text-rose-400">{kills}명</span>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-900">
              <span className="text-[10px] text-slate-500 font-bold block">학업 평점</span>
              <span className="text-base font-black text-cyan-400">Lv.{level}</span>
            </div>
            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-900">
              <span className="text-[10px] text-slate-500 font-bold block">획득 포인트</span>
              <span className="text-base font-black text-yellow-400">+{score.toLocaleString()}</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest font-mono">무기별 피해량</h4>
            </div>
            {totalDamage === 0 ? (
              <p className="text-xs text-slate-500 py-2">피해 통계 기록이 존재하지 않습니다.</p>
            ) : (
              Object.entries(damageBreakdown).map(([weapon, dmg]) => {
                const percent = Math.round((dmg / totalDamage) * 100) || 0;
                if (dmg === 0) return null;

                let barColor = 'bg-cyan-500';
                if (weapon === '철벽의 회전책') barColor = 'bg-emerald-500';
                if (weapon === '선도부 유도분필') barColor = 'bg-rose-500';
                if (weapon === '엄마 소환 번개') barColor = 'bg-yellow-500';

                return (
                  <div key={weapon} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-bold">{weapon}</span>
                      <span className="text-slate-300 font-mono font-bold">{percent}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800/50">
                      <div className={`h-full ${barColor} rounded-full`} style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="lg:col-span-7 p-5 md:p-8 flex flex-col gap-5">
          <div className="rounded-2xl border-2 border-yellow-500/40 bg-yellow-950/20 p-4 md:p-5 shadow-lg shadow-yellow-950/20">
            <div className="flex items-center gap-2 mb-3">
              <Save className="w-5 h-5 text-yellow-400" />
              <h3 className="text-sm md:text-base font-black text-yellow-300 tracking-widest">랭킹 저장</h3>
            </div>

            {!registered ? (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-300">닉네임을 입력하고 이번 기록을 저장하세요.</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={rankingName}
                    onChange={(e) => setRankingName(e.target.value)}
                    maxLength={20}
                    placeholder="닉네임 입력"
                    className="flex-1 bg-slate-950 border border-yellow-700/50 focus:border-yellow-400 px-4 py-3 rounded-xl text-slate-100 font-bold focus:outline-none text-sm"
                  />
                  <button
                    onClick={handleRegisterRanking}
                    className="bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-slate-950 font-black px-5 py-3 rounded-xl text-sm transition-all cursor-pointer shadow-md"
                  >
                    저장하기
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">저장 시 획득 포인트가 누적 점수와 강화 포인트에 반영됩니다.</p>
              </div>
            ) : (
              <div className="text-center py-3 px-4 bg-emerald-950/30 border border-emerald-800/50 rounded-xl">
                <span className="text-sm font-bold text-emerald-400 block">✨ 랭킹 저장 완료! +{score.toLocaleString()} PTS 획득</span>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest">교내 명예의 전당 TOP 10</h3>
              </div>
              <span className="text-[10px] text-slate-500 font-mono font-bold uppercase">LOCAL RECORD</span>
            </div>

            <div className="space-y-1.5 max-h-[46dvh] lg:max-h-[360px] overflow-y-auto pr-1">
              {globalRankings.map((rk, idx) => {
                const isUser = rk.nickname === rankingName.trim() && rk.score === score;
                return (
                  <div
                    key={`${rk.nickname}-${rk.score}-${rk.date}-${idx}`}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors ${
                      isUser
                        ? 'border-cyan-500 bg-cyan-950/10'
                        : 'border-slate-800/60 bg-slate-900/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center font-extrabold text-[11px] shrink-0 ${
                        idx === 0
                          ? 'bg-yellow-400 text-slate-950'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-950'
                          : idx === 2
                          ? 'bg-amber-600 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="font-extrabold text-slate-200 truncate block">{rk.nickname}</span>
                        <span className="text-[9px] text-slate-500 block truncate">
                          {rk.stage} • {rk.difficulty}난이도
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-2">
                      <span className="font-black text-cyan-400 block tracking-wider">
                        {rk.score.toLocaleString()}
                      </span>
                      <span className="text-[9px] text-slate-500">
                        {formatSec(rk.survivalTime)} ({rk.kills}킬)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 border-t border-slate-800 pt-5">
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl py-3 px-2 text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-cyan-400" />
              <span>기록 공유</span>
            </button>
            <button
              onClick={onRestart}
              className="flex items-center justify-center gap-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl py-3 px-2 text-xs font-black transition-transform hover:scale-[1.03] active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>재출격</span>
            </button>
            <button
              onClick={onGoHome}
              className="flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-3 px-2 text-xs font-bold transition-colors cursor-pointer"
            >
              <Home className="w-4 h-4 text-yellow-400" />
              <span>메인화면</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
