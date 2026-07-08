import React, { useState, useEffect, useRef } from 'react';
import { Play, FastForward, Terminal, ShieldAlert } from 'lucide-react';

interface IntroScreenProps {
  onComplete: () => void;
}

const INTRO_TEXTS = [
  "[SYSTEM LOG ENTRY: 2026.07.08 - 위험 통제 자율 교육구역]",
  "==================================================",
  "🚨 경고: 학교 전 지역 내 유해 환경 호르몬 및 불량 기운 임계치 초과.",
  "🚨 교내 '스마트폰 중독 스웜(Swarm)' 및 '침뱉는 블래스터(Blaster)' 부대 발생.",
  "🚨 '섹터 해저드(Sector Hazard)'의 유해 구역 확장으로 학생들의 지능 저하 진행 중.",
  "==================================================",
  "🏫 작전 구역: 대한민국 학교 (초등학교, 중학교, 고등학교)",
  "🎒 플레이어: 모범생 크리스 및 선도 위원단",
  "🛡️ 목표: 학급 질서를 유지하며, 담임 선생님(주임쌤)이 도착할 때까지 끝까지 버틸 것.",
  "==================================================",
  "[!] 교복 나노 슈트 부트스트랩 완료...",
  "[!] 학업용 투사 무기 승인: 정밀 연필, 교과서 배리어, 선도부 유도 분필.",
  "[!] 준비가 완료되었다면 '전투 개시' 프로토콜을 수행하십시오.",
];

export default function IntroScreen({ onComplete }: IntroScreenProps) {
  const [displayText, setDisplayText] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Typing speed in ms
  const typingSpeed = 30;

  useEffect(() => {
    if (currentLineIndex < INTRO_TEXTS.length) {
      const currentLine = INTRO_TEXTS[currentLineIndex];
      if (currentCharIndex < currentLine.length) {
        const timer = setTimeout(() => {
          setDisplayText((prev) => {
            const next = [...prev];
            if (next[currentLineIndex] === undefined) {
              next[currentLineIndex] = '';
            }
            next[currentLineIndex] += currentLine[currentCharIndex];
            return next;
          });
          setCurrentCharIndex((prev) => prev + 1);
        }, typingSpeed);
        return () => clearTimeout(timer);
      } else {
        // Line complete, move to next
        const timer = setTimeout(() => {
          setCurrentLineIndex((prev) => prev + 1);
          setCurrentCharIndex(0);
        }, 300);
        return () => clearTimeout(timer);
      }
    } else {
      setIsFinished(true);
    }
  }, [currentLineIndex, currentCharIndex]);

  // Scroll to bottom on updates
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayText]);

  const handleSkip = () => {
    if (!isFinished) {
      // Immediately display all texts
      setDisplayText(INTRO_TEXTS);
      setIsFinished(true);
    } else {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 bg-black text-emerald-400 font-mono flex flex-col justify-between p-4 md:p-8 overflow-hidden z-50 select-none">
      {/* Scanline Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(16,185,129,0.05)_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] pointer-events-none" />

      {/* Terminal Header */}
      <div className="flex items-center justify-between border-b border-emerald-900/60 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 animate-pulse text-emerald-400" />
          <span className="text-xs md:text-sm font-bold tracking-widest text-emerald-300">CHRIS_SCHOOL_ATTACK_v1.0.9</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs text-red-500 hidden sm:inline">LIVE CONNECTION SECURED</span>
        </div>
      </div>

      {/* Terminal Screen Body */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-2 text-sm md:text-base leading-relaxed scrollbar-thin scrollbar-thumb-emerald-900 scrollbar-track-transparent">
        {displayText.map((line, index) => {
          let colorClass = "text-emerald-400";
          if (line.startsWith("🚨")) colorClass = "text-rose-400 font-semibold";
          if (line.startsWith("==================")) colorClass = "text-emerald-800";
          if (line.startsWith("[!]")) colorClass = "text-cyan-300";
          if (line.startsWith("🏫") || line.startsWith("🎒") || line.startsWith("🛡️")) colorClass = "text-yellow-300";

          return (
            <div key={index} className={`${colorClass} flex items-start gap-1`}>
              <span className="text-emerald-700 select-none">&gt;</span>
              <span>{line}</span>
            </div>
          );
        })}
        
        {!isFinished && (
          <div className="flex items-center gap-1">
            <span className="text-emerald-700 select-none">&gt;</span>
            <span className="w-2 h-4 bg-emerald-400 animate-blink" />
          </div>
        )}
        <div ref={terminalEndRef} />
      </div>

      {/* Terminal Footer Controls */}
      <div className="mt-6 border-t border-emerald-900/60 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-emerald-600 flex items-center gap-1">
          <ShieldAlert className="w-4 h-4 text-emerald-600" />
          경고: 임무 포기 시 정학 조치에 처해질 수 있습니다.
        </p>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Skip / Fast Forward Button */}
          {!isFinished && (
            <button
              onClick={handleSkip}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 border border-emerald-800/80 bg-emerald-950/20 hover:bg-emerald-900/30 text-emerald-400 hover:text-emerald-300 px-5 py-2.5 rounded-lg text-sm transition-all duration-200 active:scale-95 cursor-pointer"
            >
              <FastForward className="w-4 h-4 animate-bounce-horizontal" />
              <span>빨리감기</span>
            </button>
          )}

          {/* Launch Combat Button */}
          <button
            onClick={() => {
              if (!isFinished) {
                handleSkip();
              } else {
                onComplete();
              }
            }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 font-bold px-6 py-2.5 rounded-lg text-sm transition-all duration-300 active:scale-95 shadow-lg shadow-emerald-950 cursor-pointer ${
              isFinished
                ? "bg-emerald-500 hover:bg-emerald-400 text-black animate-pulse"
                : "bg-emerald-900/40 text-emerald-600 border border-emerald-900"
            }`}
          >
            <Play className="w-4 h-4" />
            <span>{isFinished ? "전투 개시" : "스킵 및 전투 진행"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
