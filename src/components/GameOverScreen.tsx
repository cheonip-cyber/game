import React, { useState, useEffect } from 'react';
import { GameScore } from '../types';
import { Trophy, RefreshCw, Home, Share2, Award, ShieldAlert, BarChart3, Star } from 'lucide-react';

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
  const [globalRankings, setGlobalRankings] = useState<GameScore[]>([]);
  const [localRankings, setLocalRankings] = useState<GameScore[]>([]);

  // Calculate damage metrics
  const totalDamage = Object.values(damageBreakdown).reduce((sum, d) => sum + d, 0);

  // Initial load of rankings
  useEffect(() => {
    loadRankings();
  }, []);

  const loadRankings = () => {
    // Standard mock database items
    const defaultRanks: GameScore[] = [
      { nickname: '학업우수자', score: 38000, survivalTime: 600, kills: 980, level: 25, difficulty: '상', stage: '초등학교 구역', date: '2026-07-01' },
      { nickname: '선도위원장', score: 25000, survivalTime: 600, kills: 720, level: 21, difficulty: '중', stage: '초등학교 구역', date: '2026-07-03' },
      { nickname: '크리스복제인간', score: 18000, survivalTime: 450, kills: 480, level: 16, difficulty: '하', stage: '초등학교 구역', date: '2026-07-04' },
      { nickname: '공부벌레', score: 12000, survivalTime: 320, kills: 350, level: 12, difficulty: '하', stage: '초등학교 구역', date: '2026-07-05' },
      { nickname: '빵셔틀탈출러', score: 9500, survivalTime: 280, kills: 280, level: 10, difficulty: '하', stage: '초등학교 구역', date: '2026-07-06' },
    ];

    const stored = localStorage.getItem('school_attack_rankings');
    let merged = [...defaultRanks];
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as GameScore[];
        merged = [...parsed, ...defaultRanks];
      } catch (e) {
        console.error(e);
      }
    }

    // Sort to extract unique top scores
    const sorted = merged.sort((a, b) => b.score - a.score);
    // Remove duplicates by nickname
    const unique = sorted.filter((v, i, a) => a.findIndex(t => t.nickname === v.nickname) === i);

    setGlobalRankings(unique.slice(0, 10));
    setLocalRankings(unique.filter(x => x.nickname === rankingName || x.nickname === nickname).slice(0, 5));
  };

  const handleRegisterRanking = () => {
    if (!rankingName.trim()) {
      alert('등록할 이름을 기입해주세요!');
      return;
    }

    const stageNameMap: Record<string, string> = {
      elementary: '초등학교 구역',
      middle: '중학교 구역',
      high: '고등학교 구역',
    };

    const newScore: GameScore = {
      nickname: rankingName.trim(),
      score,
      survivalTime,
      kills,
      level,
      difficulty,
      stage: stageNameMap[stageId] || '초등학교 구역',
      date: new Date().toISOString().split('T')[0],
    };

    // Load, Append and Save
    const stored = localStorage.getItem('school_attack_rankings');
    let list: GameScore[] = [];
    if (stored) {
      try {
        list = JSON.parse(stored) as GameScore[];
      } catch (e) {
        console.error(e);
      }
    }

    list.push(newScore);
    localStorage.setItem('school_attack_rankings', JSON.stringify(list));

    // Save total cumulative score & points reward
    const currentPoints = parseInt(localStorage.getItem('school_attack_points') || '0', 10);
    const totalCumulative = parseInt(localStorage.getItem('school_attack_total_score') || '0', 10);

    // Cumulative additions
    localStorage.setItem('school_attack_points', (currentPoints + score).toString());
    localStorage.setItem('school_attack_total_score', (totalCumulative + score).toString());

    setRegistered(true);
    onRankingRegistered(); // Notify App to refresh its state points
    loadRankings(); // Refresh UI
  };

  const handleShare = () => {
    const timeStr = `${Math.floor(survivalTime / 60)}분 ${survivalTime % 60}초`;
    const shareText = `[크리스의 스쿨어택!] ${nickname}대원이 ${difficulty}난이도에서 ${timeStr} 생존, ${kills}명 처치하고 ${score}점을 획득했습니다! 명예전당 등재 성공!`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      alert('결과가 클립보드에 복사되었습니다. SNS에 자랑해 보세요!');
    } else {
      alert(shareText);
    }
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}분 ${s}초`;
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] overflow-y-auto bg-slate-950 text-slate-100 p-4 md:p-8 flex flex-col items-center md:justify-center font-sans select-none relative">
      {/* Visual background lights */}
      <div className={`absolute top-1/4 w-[35%] h-[35%] rounded-full blur-[120px] pointer-events-none ${
        victory ? 'bg-emerald-900/25' : 'bg-rose-900/25'
      }`} />

      {/* Main Container */}
      <div className="w-full max-w-4xl bg-slate-900 border-2 border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative z-10 grid grid-cols-1 md:grid-cols-12 my-auto">
        
        {/* Left column: Summary Stats (SIGNAL LOST) */}
        <div className="md:col-span-5 p-6 md:p-8 bg-slate-950/80 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800">
          <div>
            <div className="text-center mb-6">
              {victory ? (
                <>
                  <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full font-bold tracking-widest uppercase animate-pulse">
                    MISSION COMPLETE
                  </span>
                  <h2 className="text-4xl md:text-5xl font-black text-emerald-400 mt-2 tracking-tight">선생님 구출!</h2>
                  <p className="text-xs text-slate-400 mt-1">질서 정리가 완료되었습니다. 다음 구역을 향해 나아가십시오.</p>
                </>
              ) : (
                <>
                  <span className="text-[10px] bg-rose-500/10 border border-rose-500/20 text-rose-400 px-3 py-1 rounded-full font-bold tracking-widest uppercase animate-pulse">
                    SIGNAL LOST
                  </span>
                  <h2 className="text-4xl md:text-5xl font-black text-rose-500 mt-2 tracking-tight">학교 정화 실패</h2>
                  <p className="text-xs text-slate-400 mt-1">유해환경과 불량 세력에 교복 나노수트 에너지가 소진되었습니다.</p>
                </>
              )}
            </div>

            {/* Numeric Stats */}
            <div className="grid grid-cols-2 gap-3.5 mb-6">
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-900">
                <span className="text-[10px] text-slate-500 font-bold block">생존 시간</span>
                <span className="text-base font-black text-slate-200">{formatSec(survivalTime)}</span>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-900">
                <span className="text-[10px] text-slate-500 font-bold block">불량학생 선도(처치)</span>
                <span className="text-base font-black text-rose-400">{kills}명</span>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-900">
                <span className="text-[10px] text-slate-500 font-bold block">학업 평점 (레벨)</span>
                <span className="text-base font-black text-cyan-400">Lv.{level}</span>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-900">
                <span className="text-[10px] text-slate-500 font-bold block">획득한 명예 포인트</span>
                <span className="text-base font-black text-yellow-400">+{score.toLocaleString()} PTS</span>
              </div>
            </div>

            {/* Damage Breakdown Stats */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-widest font-mono">무기별 피해량 비중 통계</h4>
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
                        <span className="text-slate-300 font-mono font-bold">{percent}% ({dmg.toLocaleString()})</span>
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

          {/* Ranking register Form */}
          <div className="mt-8 border-t border-slate-900 pt-6">
            {!registered ? (
              <div className="space-y-3">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">명예 전당 랭킹 등재</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={rankingName}
                    onChange={(e) => setRankingName(e.target.value)}
                    maxLength={10}
                    placeholder="이름 입력..."
                    className="flex-1 bg-slate-900 border border-slate-800 focus:border-cyan-400 px-3 py-2 rounded-xl text-slate-100 font-bold focus:outline-none text-xs"
                  />
                  <button
                    onClick={handleRegisterRanking}
                    className="bg-yellow-400 hover:bg-yellow-300 active:scale-95 text-slate-950 font-black px-4 py-2 rounded-xl text-xs transition-all cursor-pointer shadow-md"
                  >
                    등록
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-2.5 px-4 bg-emerald-950/20 border border-emerald-800/40 rounded-xl">
                <span className="text-xs font-bold text-emerald-400 block">✨ 생존 등재 성공! +{score.toLocaleString()} PTS 획득</span>
              </div>
            )}
          </div>
        </div>

        {/* Right column: global Hall of Fame top 10 */}
        <div className="md:col-span-7 p-6 md:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400" />
                <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest">교내 명예의 전당 TOP 10</h3>
              </div>
              <span className="text-[10px] text-slate-500 font-mono font-bold uppercase">GLOBAL RECORD</span>
            </div>

            {/* Ranking list */}
            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
              {globalRankings.map((rk, idx) => {
                const isUser = rk.nickname === rankingName;
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors ${
                      isUser 
                        ? 'border-cyan-500 bg-cyan-950/10' 
                        : 'border-slate-800/60 bg-slate-900/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center font-extrabold text-[11px] ${
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
                      <div>
                        <span className="font-extrabold text-slate-200">{rk.nickname}</span>
                        <span className="text-[9px] text-slate-500 block">
                          {rk.stage} • {rk.difficulty}난이도
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
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

          {/* Bottom Action buttons */}
          <div className="grid grid-cols-3 gap-2.5 mt-6 border-t border-slate-800 pt-6">
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
