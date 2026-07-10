import { InGameItem } from '../types';
import { Sparkles, Award } from 'lucide-react';

interface LevelUpModalProps {
  level: number;
  choices: InGameItem[];
  weaponLevels: Record<string, number>;
  onSelect: (item: InGameItem) => void;
}

const ULTIMATE_EFFECTS: Record<string, string> = {
  pencil: '연필 5발 · 관통 4회 · 최종 피해 1.5배',
  book: '회전책 7권 · 최종 피해 1.6배 · 탄막 방어 확대',
  chalk: '유도분필 7발 · 폭발 범위 확대 · 최종 피해 1.6배',
  mother: '낙뢰가 동시에 2곳에 발생',
  move_speed: '이동 속도 총 60% 증가',
  attack_speed: '기본 공격 속도 2배',
  attack_power: '기본·스킬 공격력 총 75% 증가',
  dash_boost: '대시 재사용 대기시간 50% 감소',
  critical_milk: '치명타 확률 50% · 치명타 피해 2.3배',
};

export default function LevelUpModal({ level, choices, weaponLevels, onSelect }: LevelUpModalProps) {
  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-start justify-center p-2 pt-[max(0.5rem,env(safe-area-inset-top))] overflow-y-auto overscroll-contain">
      {/* Visual background lights */}
      <div className="absolute w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute w-96 h-96 bg-yellow-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="school-3d-panel bg-slate-900 border-2 border-slate-700 rounded-2xl w-full max-h-[calc(100dvh-1rem)] overflow-y-auto shadow-2xl relative z-10 animate-scale-up">
        {/* Header */}
        <div className="p-4 text-center bg-gradient-to-b from-slate-950 to-slate-900 border-b border-slate-800">
          <div className="flex justify-center items-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 text-yellow-400 animate-spin" />
            <span className="text-xs font-black text-cyan-400 uppercase tracking-widest font-mono">성적 우수 보상 프로토콜</span>
            <Sparkles className="w-6 h-6 text-yellow-400 animate-spin" />
          </div>
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 tracking-tight drop-shadow-lg uppercase">
            LEVEL {level} 달성!
          </h2>
          <p className="text-xs text-slate-400 mt-2">
            학교 생활 평점 상승! 아래의 강화 방침 또는 지원 학용품 중 <strong className="text-yellow-400 font-bold">1가지</strong>를 선택해 교복을 진화시키십시오.
          </p>
        </div>

        {/* Choices cards list */}
        <div className="p-3 space-y-2 bg-slate-950/40">
          {choices.map((item) => {
            const currentLvl = weaponLevels[item.id] || 0;
            const isNew = currentLvl === 0;
            const isUltimate = currentLvl === 4;

            let borderClass = isUltimate
              ? 'border-yellow-300 bg-gradient-to-br from-purple-950/95 via-violet-900/90 to-amber-950/90 hover:border-yellow-200'
              : 'border-slate-800 hover:border-slate-700 bg-slate-900/50';
            let bgLight = '';
            if (!isUltimate && item.rarity === '희귀') {
              borderClass = 'border-blue-900 hover:border-blue-700 bg-blue-950/10 hover:bg-blue-950/15';
              bgLight = 'bg-blue-500/10 text-blue-400';
            } else if (!isUltimate && item.rarity === '전설') {
              borderClass = 'border-yellow-900 hover:border-yellow-600 bg-yellow-950/10 hover:bg-yellow-950/15';
              bgLight = 'bg-yellow-500/10 text-yellow-400 animate-pulse';
            } else {
              bgLight = 'bg-slate-800 text-slate-400';
            }

            return (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                className={`school-3d-card w-full text-left p-3 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer relative group overflow-hidden ${isUltimate ? 'ring-2 ring-yellow-400 shadow-[0_0_24px_rgba(250,204,21,0.35)]' : ''} ${borderClass}`}
              >
                {/* Decorative hover overlay glow */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none"
                  style={{ backgroundColor: item.color }}
                />

                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  {/* Skill Color Badge */}
                  <div 
                    className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 text-slate-100 font-black text-lg select-none"
                    style={{ 
                      backgroundColor: `${item.color}15`, 
                      borderColor: item.color,
                      color: item.color
                    }}
                  >
                    {item.name[0]}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-sm text-slate-100 group-hover:text-white transition-colors truncate">
                        {item.name}
                      </h3>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${bgLight}`}>
                        {item.rarity}
                      </span>
                      <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-slate-800 text-slate-400">
                        {isNew ? 'NEW' : isUltimate ? 'Lv.5 궁극기 진화' : `Lv.${currentLvl} → ${currentLvl + 1}`}
                      </span>
                      {isUltimate && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-yellow-300 text-purple-950">ULTIMATE</span>}
                    </div>
                    
                    {/* Inline Enhancement Effect right below name */}
                    <div className="flex items-center gap-1.5 mt-1 min-w-0">
                      <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider shrink-0">강화:</span>
                      <span className="text-xs font-bold text-emerald-400 group-hover:text-emerald-300 transition-colors truncate">
                        {isUltimate ? ULTIMATE_EFFECTS[item.id] || item.effect : item.effect}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="hidden shrink-0 text-right">
                  <span className="text-[9px] text-slate-500 font-bold block uppercase tracking-widest">강화 효과</span>
                  <span className="text-xs font-bold text-emerald-400 block mt-0.5 group-hover:text-emerald-300 transition-colors">
                    {item.effect}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer info banner */}
        <div className="p-2.5 bg-slate-950 text-center border-t border-slate-800 flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-mono">
          <Award className="w-4 h-4 text-slate-600 animate-pulse" />
          <span>SCHOOL ATTACK EXCELLENT STUDENT EVALUATION PROTOCOL</span>
        </div>
      </div>
    </div>
  );
}
