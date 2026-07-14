import { useState, useEffect } from 'react';
import { CHARACTERS, STAGES, DIFFICULTIES, CHALLENGES, STAGE_DURATION_SECONDS } from '../constants';
import { Character, StageId, Difficulty, UpgradeState } from '../types';
import { Swords, Trophy, Sparkles, Lock, Gamepad2, Settings2, UserCheck, HelpCircle, Maximize, Minimize, CheckCircle2, Clock3 } from 'lucide-react';
import UpgradeMenu from './UpgradeMenu';
import { useRankings } from '../hooks/useRankings';
import { isValidEnglishNickname } from '../services/rankings';

const CHARACTER_CARD_IMAGES: Record<string, string> = {
  chris: '/assets/game/character-chris.webp',
  minwoo: '/assets/game/character-abigail.webp',
  haeun: '/assets/game/character-elena.webp',
};

interface MainScreenProps {
  onStartGame: (config: {
    character: Character;
    stageId: StageId;
    difficulty: Difficulty;
    nickname: string;
  }) => void;
  totalScore: number;
  points: number;
  upgrades: UpgradeState;
  unlockedCharacterIds: string[];
  completedMapIds: string[];
  onUnlockCharacter: (character: Character) => boolean;
  onUpgrade: (key: keyof UpgradeState, cost: number) => void;
  onResetUpgrades: () => void;
}

export default function MainScreen({
  onStartGame,
  totalScore,
  points,
  upgrades,
  unlockedCharacterIds,
  completedMapIds,
  onUnlockCharacter,
  onUpgrade,
  onResetUpgrades,
}: MainScreenProps) {
  const [selectedChar, setSelectedChar] = useState<Character>(CHARACTERS[0]);
  const [selectedStage, setSelectedStage] = useState<StageId>('elementary');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('하');
  const [nickname, setNickname] = useState<string>(() => {
    const storedNickname = localStorage.getItem('school_attack_nickname') || '';
    return isValidEnglishNickname(storedNickname) ? storedNickname : 'Chris';
  });
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [challenge, setChallenge] = useState('');
  const { rankings: globalRankings, isLoading: rankingsLoading, error: rankingsError } = useRankings();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [unlockingCharacterId, setUnlockingCharacterId] = useState<string | null>(null);

  const isMapCompleted = (stageId: StageId, difficulty: Difficulty) => completedMapIds.includes(`${stageId}:${difficulty}`);
  const isStageUnlocked = (stageId: StageId) => {
    if (stageId === 'elementary') return true;
    if (stageId === 'middle') return isMapCompleted('elementary', '상');
    return isMapCompleted('middle', '상');
  };
  const isDifficultyUnlocked = (stageId: StageId, difficulty: Difficulty) => {
    if (!isStageUnlocked(stageId)) return false;
    if (difficulty === '하' || difficulty === '중') return true;
    if (difficulty === '상') return isMapCompleted(stageId, '하') || isMapCompleted(stageId, '중');
    return isMapCompleted(stageId, '상');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch((err) => console.error("Fullscreen error:", err));
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch((err) => console.error("Exit fullscreen error:", err));
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const day = new Date().getDate();
    const index = day % CHALLENGES.length;
    setChallenge(CHALLENGES[index]);

  }, []);

  const handleStart = () => {
    const trimmedNickname = nickname.trim();
    if (!isValidEnglishNickname(trimmedNickname)) {
      alert('닉네임은 영문 알파벳 1~20자로 입력해주세요.');
      return;
    }

    localStorage.setItem('school_attack_nickname', trimmedNickname);

    if (!unlockedCharacterIds.includes(selectedChar.id)) {
      alert('잠금 해제 후 출격할 수 있는 캐릭터입니다.');
      return;
    }

    if (!isStageUnlocked(selectedStage) || !isDifficultyUnlocked(selectedStage, selectedDifficulty)) {
      alert('이전 단계 완료 조건을 달성해야 출격할 수 있습니다.');
      return;
    }

    onStartGame({
      character: selectedChar,
      stageId: selectedStage,
      difficulty: selectedDifficulty,
      nickname: trimmedNickname,
    });
  };

  return (
    <div className="school-3d-shell h-[100dvh] bg-slate-950 text-slate-100 flex flex-col relative overflow-x-hidden overflow-y-auto font-sans no-callout">
      <div className="school-3d-hero" aria-hidden="true" />
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/25 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-rose-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <header className="relative w-full px-3 pt-[max(0.75rem,env(safe-area-inset-top))] flex flex-col gap-3 border-b border-slate-900 pb-3">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1.5">
            <span className="text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2.5 py-0.5 rounded-full font-bold tracking-wider animate-pulse">
              RETRO SURVIVAL
            </span>
            <span className="text-xs bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-2.5 py-0.5 rounded-full font-bold tracking-wider">
              MOBILE SUPPORT
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-cyan-400 via-indigo-400 to-rose-400 bg-clip-text text-transparent filter drop-shadow-[0_2px_8px_rgba(99,102,241,0.3)]">
            크리스의 스쿨어택!
          </h1>
          <p className="text-xs text-slate-400 mt-1">선생님이 도착할 때까지 학교를 지키고 생존하세요!</p>
        </div>

        <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-3 border border-slate-800 rounded-xl">
          <div className="text-left">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">누적 획득 점수</div>
            <div className="text-sm font-black text-cyan-400">{totalScore.toLocaleString()} PTS</div>
          </div>
          <div className="text-left">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">강화 포인트</div>
            <div className="text-sm font-black text-yellow-400">{points.toLocaleString()} PTS</div>
          </div>
          <button
            onClick={() => setShowUpgrade(true)}
            className="flex items-center justify-center gap-1.5 bg-yellow-400 active:scale-95 text-slate-950 font-black px-3 py-2.5 rounded-lg text-xs transition-all cursor-pointer shadow-md"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>영구 능력 강화</span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="flex items-center justify-center gap-1.5 bg-slate-950 border border-slate-800 text-slate-300 px-3 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md"
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5 text-cyan-400" /> : <Maximize className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{isFullscreen ? '창모드' : '전체화면'}</span>
          </button>
        </div>
      </header>

      <main className="flex-1 w-full px-3 py-4 pb-28 flex flex-col gap-4 relative z-10">
        <section className="space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="school-3d-panel bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80">
              <label htmlFor="nickname" className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-cyan-400" />
                출격 대원 명찰 (닉네임)
              </label>
              <input
                id="nickname"
                type="text"
                maxLength={20}
                value={nickname}
                onChange={(e) => setNickname(e.target.value.replace(/[^A-Za-z]/g, '').slice(0, 20))}
                placeholder="English nickname"
                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-cyan-400 px-4 py-3 rounded-xl text-slate-100 font-bold focus:outline-none transition-colors text-sm"
              />
              <p className="text-[10px] text-slate-500 mt-2 flex justify-between"><span>영문 알파벳만 입력 가능</span><span>{nickname.length}/20</span></p>
            </div>

            <div className="school-3d-panel bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80">
              <span className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">구역 선택 (STAGES)</span>
              <div className="space-y-2.5">
                {STAGES.map((stg) => {
                  const isSelected = selectedStage === stg.id;
                  const isUnlocked = isStageUnlocked(stg.id);
                  return (
                    <button
                      key={stg.id}
                      disabled={!isUnlocked}
                      onClick={() => {
                        setSelectedStage(stg.id);
                        setSelectedDifficulty('하');
                      }}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-1 ${
                        !isUnlocked ? 'border-slate-900 bg-slate-950/70 opacity-55 cursor-not-allowed' : 'cursor-pointer'
                      } ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-950/15 ring-2 ring-cyan-400/20'
                          : 'border-slate-800 bg-slate-950/40 hover:bg-slate-900/40 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className={`font-black text-sm ${isSelected ? 'text-cyan-400' : 'text-slate-200'}`}>
                          {isUnlocked ? stg.name : `🔒 ${stg.name}`}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isSelected ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-500'
                        }`}>
                          획득 점수 x{stg.multiplier.toFixed(1)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-normal">
                        {isUnlocked ? stg.description : stg.id === 'middle' ? '초등학교 상 난이도 완료 시 개방' : '중학교 상 난이도 완료 시 개방'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="school-3d-panel bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80">
              <span className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">난이도 설정</span>
              <div className="grid grid-cols-2 gap-2">
                {DIFFICULTIES.map((diff) => {
                  const isSelected = selectedDifficulty === diff.id;
                  const isUnlocked = isDifficultyUnlocked(selectedStage, diff.id);
                  const isCompleted = isMapCompleted(selectedStage, diff.id);
                  return (
                    <button
                      key={diff.id}
                      disabled={!isUnlocked}
                      onClick={() => setSelectedDifficulty(diff.id)}
                      className={`relative p-3 rounded-xl border text-center font-bold text-xs transition-all flex flex-col items-center justify-center gap-1 ${
                        !isUnlocked ? 'opacity-45 cursor-not-allowed border-slate-900 bg-slate-950/70' : 'cursor-pointer'
                      } ${
                        isSelected
                          ? 'border-indigo-400 bg-indigo-950/20 ring-2 ring-indigo-400/25 text-indigo-200'
                          : 'border-slate-800 bg-slate-950/40 hover:bg-slate-900/40 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      {isCompleted && <CheckCircle2 className="absolute top-1.5 right-1.5 w-3.5 h-3.5 text-emerald-400" />}
                      <span className="text-sm font-black">{isUnlocked ? diff.label : `🔒 ${diff.label}`}</span>
                      <span className="text-[10px] text-slate-500">
                        {isUnlocked
                          ? `배율 x${diff.multiplier}`
                          : diff.id === '상'
                            ? '하 또는 중 완료 필요'
                            : '상 완료 필요'}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-cyan-800/60 bg-cyan-950/25 px-3 py-2.5 text-xs font-bold text-cyan-100">
                <Clock3 className="w-4 h-4 text-cyan-400" />
                <span>
                  {STAGES.find((stage) => stage.id === selectedStage)?.name} · 선생님 도착까지{' '}
                  <strong className="text-yellow-300">{STAGE_DURATION_SECONDS[selectedStage] / 60}분</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 p-4 border border-indigo-950/40 rounded-xl bg-gradient-to-r from-indigo-950/10 to-transparent mt-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">오늘의 챌린지</span>
            </div>
            <p className="text-xs text-indigo-200 leading-normal">{challenge}</p>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
              <Gamepad2 className="w-4 h-4 text-cyan-400" />
              출격할 학생 기체 (교복 카드 선택)
            </h2>

            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3 -mx-3 px-3 mobile-card-scroll">
              {CHARACTERS.map((char) => {
                const isLocked = !unlockedCharacterIds.includes(char.id);
                const canUnlock = isLocked && points >= char.unlockScore;
                const isSelected = selectedChar.id === char.id;

                return (
                  <button
                    type="button"
                    key={char.id}
                    aria-pressed={isSelected}
                    onClick={() => {
                      if (isLocked && canUnlock && onUnlockCharacter(char)) {
                        setUnlockingCharacterId(char.id);
                        setSelectedChar(char);
                        window.setTimeout(() => setUnlockingCharacterId(null), 1200);
                      } else if (!isLocked) {
                        setSelectedChar(char);
                      }
                    }}
                    className={`school-3d-card relative min-w-[84vw] snap-center text-left rounded-2xl border p-4 flex flex-col justify-between transition-all duration-300 min-h-[230px] group ${
                      isLocked
                        ? canUnlock
                          ? 'bg-purple-950/40 border-yellow-400 cursor-pointer shadow-[0_0_24px_rgba(250,204,21,0.25)]'
                          : 'bg-slate-950/30 border-slate-900/80 cursor-not-allowed opacity-60'
                        : isSelected
                        ? 'border-2 bg-slate-900/80 shadow-2xl scale-[1.02]'
                        : 'border-slate-800 bg-slate-900/30 hover:border-slate-700 cursor-pointer'
                    }`}
                    style={{
                      borderColor: !isLocked && isSelected ? char.imageColor : undefined,
                      boxShadow: !isLocked && isSelected ? `${char.imageColor}20 0px 10px 30px` : undefined,
                    }}
                  >
                    {isLocked && (
                      <div className={`absolute inset-0 rounded-2xl flex flex-col items-center justify-center p-4 z-10 text-center ${canUnlock ? 'bg-purple-950/75' : 'bg-slate-950/85'}`}>
                        <Lock className={`w-8 h-8 mb-2 ${canUnlock ? 'text-yellow-300 animate-bounce' : 'text-slate-500'}`} />
                        <span className={`text-sm font-black block mb-1 ${canUnlock ? 'text-yellow-200' : 'text-slate-400'}`}>
                          {canUnlock ? '잠금 해제 가능!' : '잠긴 캐릭터'}
                        </span>
                        <span className={`text-xs font-black ${canUnlock ? 'text-white' : 'text-rose-400'}`}>
                          {canUnlock ? '카드를 눌러 직접 해제' : '필요 포인트'}<br />
                          {char.unlockScore.toLocaleString()} PTS
                        </span>
                      </div>
                    )}
                    {unlockingCharacterId === char.id && (
                      <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-purple-900/80 animate-scale-up overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(253,224,71,0.9)_0%,transparent_65%)] animate-ping" />
                        <div className="relative text-center">
                          <Sparkles className="w-12 h-12 mx-auto text-yellow-300 animate-spin" />
                          <strong className="block text-xl text-white drop-shadow-lg">잠금 해제!</strong>
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="relative h-48 -mx-4 -mt-4 mb-3 overflow-hidden rounded-t-2xl border-b border-slate-800/80 bg-[radial-gradient(circle_at_50%_35%,rgba(56,189,248,0.22),rgba(15,23,42,0.92)_72%)]">
                        <img
                          src={CHARACTER_CARD_IMAGES[char.id]}
                          alt={`${char.name} 캐릭터`}
                          loading="lazy"
                          draggable={false}
                          className="absolute inset-0 w-full h-full object-contain object-center p-1 drop-shadow-[0_14px_18px_rgba(0,0,0,0.55)] transition-transform duration-300 group-hover:scale-105"
                        />
                        <span
                          className="absolute left-3 bottom-2 rounded-full border px-2.5 py-1 text-[9px] font-black tracking-widest backdrop-blur-md"
                          style={{ color: char.imageColor, borderColor: `${char.imageColor}88`, backgroundColor: `${char.imageColor}18` }}
                        >
                          3D STUDENT UNIT
                        </span>
                      </div>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{char.title}</span>
                          <h3 className="text-2xl font-black tracking-tight" style={{ color: char.imageColor }}>
                            {char.name}
                          </h3>
                        </div>
                      </div>

                      <p className="text-xs text-slate-400 leading-normal mb-5">{char.description}</p>
                    </div>

                    <div className="space-y-2 border-t border-slate-800/80 pt-4">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">기본 체력</span>
                        <span className="font-bold text-slate-300">{char.baseHp} HP</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">기본 기동력</span>
                        <span className="font-bold text-slate-300">{char.baseSpeed}m/s</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500">기본 공격계수</span>
                        <span className="font-bold text-slate-300">x{(char.baseDamage / 10).toFixed(1)}</span>
                      </div>

                      <div className="mt-3 bg-slate-950/40 p-2.5 rounded-lg border border-slate-900">
                        <span className="text-[10px] font-bold text-yellow-500 block">특기 스킬 : {char.specialSkill}</span>
                        <span className="text-[10px] text-slate-400 leading-snug mt-0.5 block">{char.specialSkillDesc}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-1">
            <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3.5">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest">글로벌 실시간 랭킹 TOP 5</h3>
              </div>
              <div className="space-y-2">
                {rankingsLoading ? (
                  <p className="text-xs text-cyan-400 py-4 text-center animate-pulse">글로벌 랭킹 연결 중...</p>
                ) : rankingsError ? (
                  <p className="text-xs text-rose-400 py-4 text-center">{rankingsError}</p>
                ) : globalRankings.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">아직 등록된 글로벌 기록이 없습니다.</p>
                ) : (
                  globalRankings.slice(0, 5).map((rk, idx) => (
                    <div key={`${rk.nickname}-${rk.score}-${idx}`} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/50 border border-slate-900 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center font-bold ${
                          idx === 0 ? 'bg-yellow-400 text-slate-950' : idx === 1 ? 'bg-slate-300 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-300">{rk.nickname}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-cyan-400 block">{rk.score.toLocaleString()}</span>
                        <span className="text-[9px] text-slate-500">{rk.stage} / {Math.floor(rk.survivalTime / 60)}분{rk.survivalTime % 60}초</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <HelpCircle className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-black text-slate-300 uppercase tracking-widest font-mono">생존용 안전 조작 매뉴얼</h3>
                </div>
                <ul className="text-xs text-slate-400 space-y-2.5 pl-1 leading-relaxed">
                  <li>💻 <strong className="text-slate-200">PC 조작:</strong> WASD 또는 방향키로 교복 수트 이동. 자동 발사 사격.</li>
                  <li>🏃‍♂️ <strong className="text-slate-200">대시 회피:</strong> Space 키를 눌러 바라보는 방향으로 무적 대시.</li>
                  <li>📱 <strong className="text-slate-200">모바일 조작:</strong> 화면 아무 곳이나 드래그해 가상 조이스틱 이동. 두 손가락 탭 또는 대시용 전용 터치 버튼 클릭 시 대시 가능!</li>
                  <li>🎒 <strong className="text-slate-200">레벨업 보상:</strong> 획득한 비타민 연필 경험치 보석으로 레벨업하고 다양한 학용품 배리어를 진화시키십시오.</li>
                </ul>
              </div>

            </div>
          </div>
        </section>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 w-full border-t border-slate-800 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-slate-950/95 backdrop-blur-xl z-40">
        <div className="px-3 flex flex-col items-center gap-1.5">
          <button
            onClick={handleStart}
            className="school-3d-button group relative w-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-rose-500 text-slate-950 font-black text-base py-3.5 px-4 rounded-2xl transition-all active:scale-[0.98] shadow-2xl border-t border-white/20 cursor-pointer text-center flex items-center justify-center gap-2"
          >
            <Swords className="w-6 h-6 animate-pulse" />
            <span className="tracking-widest">교복 나노수트 장착 & 스쿨어택 출격!</span>
          </button>
          <span className="text-[9px] text-slate-500 font-mono">위 설정으로 즉시 출격</span>
        </div>
      </footer>

      {showUpgrade && (
        <UpgradeMenu
          upgrades={upgrades}
          points={points}
          onUpgrade={onUpgrade}
          onReset={onResetUpgrades}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </div>
  );
}
