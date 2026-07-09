import React, { useRef, useEffect, useState } from 'react';
import { Character, StageId, Difficulty, UpgradeState, InGameItem } from '../types';
import { LEVEL_UP_CHOICES } from '../constants';
import { Pause, Play, ShieldAlert, Award, Zap, HelpCircle, FastForward, Maximize, Minimize } from 'lucide-react';
import LevelUpModal from './LevelUpModal';

interface GameCanvasProps {
  character: Character;
  stageId: StageId;
  difficulty: Difficulty;
  upgrades: UpgradeState;
  onGameEnd: (result: {
    victory: boolean;
    survivalTime: number;
    kills: number;
    level: number;
    score: number;
    damageBreakdown: Record<string, number>;
  }) => void;
  onPauseToggle: (isPaused: boolean) => void;
}

// Internal structures for canvas physics/rendering
const WORLD_WIDTH = 3000;
const WORLD_HEIGHT = 3000;

function getRequiredExpForLevel(level: number): number {
  if (level <= 2) return 30;
  if (level <= 4) return 45;
  if (level <= 6) return 70;
  if (level <= 10) return 100 + level * 15;
  if (level <= 20) return 180 + level * 30;
  return 500 + level * 55;
}

interface Bullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  pierce: number; // Remaining enemies it can pierce
  color: string;
  type: string; // 'pencil' | 'chalk' | 'enemy'
  angle?: number;
  targetEnemyId?: string;
}

interface Enemy {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  damage: number;
  color: string;
  type: 'swarm' | 'blaster' | 'hazard' | 'reinforced' | 'boss';
  typeName: string;
  isBoss: boolean;
  scoreValue: number;
  lastAttackTime: number;
  attackCooldown: number; // ms
  angle?: number;
  lastShotTime?: number;
  shape?: 'circle' | 'square' | 'triangle' | 'pentagon' | 'star' | 'cross' | 'hexagon';
}

interface Gem {
  x: number;
  y: number;
  value: number; // Experience value
  radius: number;
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number; // current life frame
  maxLife: number; // max life frame
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  isCritical: boolean;
}

interface StrikeArea {
  x: number;
  y: number;
  radius: number;
  timer: number; // countdown to hit
  maxTimer: number;
  triggered: boolean;
  type: 'mother';
}

export default function GameCanvas({
  character,
  stageId,
  difficulty,
  upgrades,
  onGameEnd,
  onPauseToggle,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Time speed multiplier for testing (x1, x5, x20)
  const [timeMultiplier, setTimeMultiplier] = useState<number>(1);

  // Fullscreen States
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch((err) => console.error("Fullscreen error:", err));
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
          .then(() => setIsFullscreen(false))
          .catch((err) => console.error("Exit fullscreen error:", err));
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Pause States
  const [isPaused, setIsPaused] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const showLevelUpRef = useRef(false);
  const [levelUpChoices, setLevelUpChoices] = useState<InGameItem[]>([]);
  const [isDying, setIsDying] = useState(false);
  const isDyingRef = useRef(false);

  // HUD sync states
  const [hudHp, setHudHp] = useState(character.baseHp);
  const [hudMaxHp, setHudMaxHp] = useState(character.baseHp);
  const [hudLevel, setHudLevel] = useState(1);
  const [hudExp, setHudExp] = useState(0);
  const [hudMaxExp, setHudMaxExp] = useState(30);
  const [hudTime, setHudTime] = useState(0); // seconds
  const [hudKills, setHudKills] = useState(0);
  const [hudScore, setHudScore] = useState(0);
  const [hudDashReady, setHudDashReady] = useState(true);

  // Weapons Level Mapping (id -> level)
  const [weaponLevels, setWeaponLevels] = useState<Record<string, number>>(() => {
    return { [character.weaponId]: 1 };
  });

  // Keep mutables in refs for high-performance canvas loops
  const gameStats = useRef({
    hp: character.baseHp,
    maxHp: character.baseHp,
    level: 1,
    exp: 0,
    maxExp: 30,
    time: 0, // survival time in seconds
    kills: 0,
    score: 0,
    playerX: 1500,
    playerY: 1500,
    playerVx: 0,
    playerVy: 0,
    playerRadius: 16,
    speed: character.baseSpeed,
    magnetRange: character.baseMagnet,
    dashCooldown: 3000, // ms
    lastDashTime: 0, // timestamp
    isDashing: false,
    dashEndTime: 0,
    dashVx: 0,
    dashVy: 0,
    victoryTargetTime: 600, // 10 minutes (600s) survival
  });

  // Store weapon levels in a ref for bullet spawning
  const weaponLevelsRef = useRef<Record<string, number>>({ [character.weaponId]: 1 });

  // Damage stats breakdown
  const damageDealtRef = useRef<Record<string, number>>({
    '정밀 연필 발사': 0,
    '철벽의 회전책': 0,
    '선도부 유도분필': 0,
    '엄마 소환 번개': 0,
  });

  // Upgrades stat calculations
  useEffect(() => {
    // Apply permanent upgrades
    const hpBonus = 1 + upgrades.maxHpLevel * 0.1;
    const speedBonus = 1 + upgrades.speedLevel * 0.05;
    const damageMultiplier = 1 + upgrades.damageLevel * 0.1;
    const magnetBonus = 1 + upgrades.magnetLevel * 0.15;
    const dashCooldownReduction = upgrades.dashLevel * 0.1;

    gameStats.current.maxHp = Math.round(character.baseHp * hpBonus);
    gameStats.current.hp = gameStats.current.maxHp;
    gameStats.current.speed = character.baseSpeed * speedBonus;
    gameStats.current.magnetRange = character.baseMagnet * magnetBonus;
    gameStats.current.dashCooldown = Math.max(1000, 3000 * (1 - dashCooldownReduction));

    setHudMaxHp(gameStats.current.maxHp);
    setHudHp(gameStats.current.hp);
  }, [upgrades, character]);

  // Game assets / runtime lists
  const bulletsRef = useRef<Bullet[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const gemsRef = useRef<Gem[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const strikesRef = useRef<StrikeArea[]>([]);

  // Rotating books angle
  const bookAngleRef = useRef<number>(0);

  // Weapon fire timestamps
  const lastFiredRef = useRef<Record<string, number>>({
    pencil: 0,
    book: 0,
    chalk: 0,
    mother: 0,
  });

  // Controls
  const keysPressed = useRef<Record<string, boolean>>({});
  
  // Mobile touch joystick
  const joystickStart = useRef<{ x: number; y: number } | null>(null);
  const joystickCurrent = useRef<{ x: number; y: number } | null>(null);
  const [isTouchActive, setIsTouchActive] = useState(false);
  const joystickTouchId = useRef<number | null>(null);

  // Size constraints
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 800, height: 600 });

  // Handle window resizing to fit full screen
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setCanvasDimensions({ width: clientWidth, height: clientHeight });
        
        // Relocate player to center of world if game just loaded
        if (gameStats.current.time === 0) {
          gameStats.current.playerX = 1500;
          gameStats.current.playerY = 1500;
        }
      }
    };

    window.addEventListener('resize', handleResize);
    // Initial resize trigger
    setTimeout(handleResize, 100);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showLevelUp || isPaused) return;
      keysPressed.current[e.key.toLowerCase()] = true;

      // Space to dash
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        triggerDash();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [showLevelUp, isPaused]);

  // Dash implementation
  const triggerDash = () => {
    const now = Date.now();
    const stats = gameStats.current;
    if (now - stats.lastDashTime < stats.dashCooldown) return; // Cooldown active
    if (stats.isDashing) return;

    // Determine dash direction based on keys or current movement
    let dx = 0;
    let dy = 0;

    if (keysPressed.current['w'] || keysPressed.current['arrowup']) dy = -1;
    if (keysPressed.current['s'] || keysPressed.current['arrowdown']) dy = 1;
    if (keysPressed.current['a'] || keysPressed.current['arrowleft']) dx = -1;
    if (keysPressed.current['d'] || keysPressed.current['arrowright']) dx = 1;

    // Fallback to joystick movement if touch active
    if (dx === 0 && dy === 0 && joystickCurrent.current && joystickStart.current) {
      dx = joystickCurrent.current.x - joystickStart.current.x;
      dy = joystickCurrent.current.y - joystickStart.current.y;
    }

    // Default to right if stationary
    if (dx === 0 && dy === 0) dx = 1;

    // Normalize
    const length = Math.sqrt(dx * dx + dy * dy);
    dx /= length;
    dy /= length;

    // Activate Dash
    stats.isDashing = true;
    stats.lastDashTime = now;
    stats.dashEndTime = now + 200; // 0.2 seconds dash duration
    stats.dashVx = dx * stats.speed * 2.5;
    stats.dashVy = dy * stats.speed * 2.5;

    // Create dash particles trail
    for (let i = 0; i < 15; i++) {
      particlesRef.current.push({
        x: stats.playerX,
        y: stats.playerY,
        vx: -dx * (1 + Math.random() * 3),
        vy: -dy * (1 + Math.random() * 3),
        radius: 3 + Math.random() * 4,
        color: character.imageColor,
        life: 0,
        maxLife: 20 + Math.random() * 20,
      });
    }

    setHudDashReady(false);
  };

  // Touch controls handling (Joystick & Two-finger Dash) with native multi-touch tracking
  const handleTouchStart = (e: TouchEvent) => {
    if (showLevelUp || isPaused) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Process each new touch event independently
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      // Virtual Dash button region detection
      // Button center is at rect.width - 60, rect.height - 60, radius 28
      const buttonX = rect.width - 60;
      const buttonY = rect.height - 60;
      const distToDash = Math.hypot(x - buttonX, y - buttonY);

      if (distToDash < 45 || (x > rect.width - 110 && y > rect.height - 110)) {
        // Explicitly trigger dash for this touch
        e.preventDefault();
        triggerDash();
        continue;
      }

      // If we don't have an active joystick touch, assign it to this touch
      if (joystickTouchId.current === null) {
        e.preventDefault();
        joystickTouchId.current = touch.identifier;
        joystickStart.current = { x, y };
        joystickCurrent.current = { x, y };
        setIsTouchActive(true);
      }
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (joystickTouchId.current === null) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Track the touch registered with the joystick
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      if (touch.identifier === joystickTouchId.current) {
        e.preventDefault(); // Stop native page scroll / elastic bounce
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        joystickCurrent.current = { x, y };
        break;
      }
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (joystickTouchId.current === null) return;

    // Check if the joystick's original touch finger ended
    let joystickEnded = false;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchId.current) {
        joystickEnded = true;
        break;
      }
    }

    if (joystickEnded) {
      e.preventDefault();
      joystickTouchId.current = null;
      joystickStart.current = null;
      joystickCurrent.current = null;
      setIsTouchActive(false);
    }
  };

  // Register non-passive touch listeners natively on the canvas to completely prevent mobile scrolling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Wrapper functions to bypass TypeScript event signatures
    const onTouchStart = (e: TouchEvent) => handleTouchStart(e);
    const onTouchMove = (e: TouchEvent) => handleTouchMove(e);
    const onTouchEnd = (e: TouchEvent) => handleTouchEnd(e);
    const onTouchCancel = (e: TouchEvent) => handleTouchEnd(e);

    // Bind with passive: false to allow e.preventDefault()
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', onTouchCancel, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [canvasDimensions, isPaused, showLevelUp]);

  // Spawn Enemies algorithm
  const spawnEnemy = (type: 'swarm' | 'blaster' | 'hazard' | 'reinforced' | 'boss') => {
    const stats = gameStats.current;
    const width = canvasDimensions.width;
    const height = canvasDimensions.height;

    // Spawn slightly outside viewport bounds
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.max(width, height) / 2 + 50;
    let x = stats.playerX + Math.cos(angle) * distance;
    let y = stats.playerY + Math.sin(angle) * distance;
    
    // Clamp to school campus limits
    x = Math.max(40, Math.min(WORLD_WIDTH - 40, x));
    y = Math.max(40, Math.min(WORLD_HEIGHT - 40, y));

    let hp = 15;
    let speed = 2.0;
    let radius = 12;
    let damage = 8;
    let color = '#d946ef'; // pink-500
    let scoreValue = 100;
    let isBoss = false;
    let typeName = '스웜 (일진 짱짱벌레)';
    let attackCooldown = 1000;

    // Adjust based on Difficulty multiplier
    let mult = 1.0;
    if (difficulty === '중') mult = 1.8;
    else if (difficulty === '상') mult = 3.5;
    else if (difficulty === '해골') mult = 6.0;

    // Stage scaling
    let stageMult = 1.0;
    if (stageId === 'middle') stageMult = 1.6;
    else if (stageId === 'high') stageMult = 2.5;

    const scaleHp = (val: number) => Math.round(val * mult * stageMult);
    const scaleDmg = (val: number) => Math.round(val * (1 + (mult - 1) * 0.4) * stageMult);

    switch (type) {
      case 'swarm':
        typeName = '스마트폰 좀비 스웜';
        hp = scaleHp(12);
        speed = 2.4;
        radius = 11;
        damage = scaleDmg(6);
        color = '#a855f7'; // purple-500
        scoreValue = 80;
        break;
      case 'blaster':
        typeName = '침뱉기 일진 블래스터';
        hp = scaleHp(22);
        speed = 1.4;
        radius = 14;
        damage = scaleDmg(10);
        color = '#84cc16'; // lime-500
        scoreValue = 150;
        break;
      case 'hazard':
        typeName = '스마트폰 중독 섹터 해저드';
        hp = scaleHp(60);
        speed = 0.7;
        radius = 24;
        damage = scaleDmg(18);
        color = '#3b82f6'; // blue-500
        scoreValue = 250;
        break;
      case 'reinforced':
        typeName = '유해 담배연기 몬스터';
        hp = scaleHp(120);
        speed = 1.6;
        radius = 18;
        damage = scaleDmg(24);
        color = '#f97316'; // orange-500
        scoreValue = 400;
        break;
      case 'boss':
        typeName = '👹 폭주 학업스트레스 보스';
        hp = scaleHp(1200);
        speed = 1.2;
        radius = 32;
        damage = scaleDmg(35);
        color = '#ef4444'; // red-500
        scoreValue = 2000;
        isBoss = true;
        attackCooldown = 500;
        break;
    }

    // Shapes and slight color modifications for variety
    let shape: 'circle' | 'square' | 'triangle' | 'pentagon' | 'star' | 'cross' | 'hexagon' = 'circle';
    
    if (type === 'swarm') {
      const rShape = Math.random();
      shape = rShape < 0.45 ? 'triangle' : rShape < 0.8 ? 'square' : 'circle';
    } else if (type === 'blaster') {
      shape = Math.random() < 0.5 ? 'hexagon' : 'pentagon';
    } else if (type === 'hazard') {
      shape = Math.random() < 0.5 ? 'square' : 'cross';
    } else if (type === 'reinforced') {
      shape = Math.random() < 0.5 ? 'star' : 'hexagon';
    } else if (type === 'boss') {
      shape = 'star';
    }

    // Slightly randomize color palette for beautiful variety
    let finalColor = color;
    const variantRand = Math.random();
    if (type === 'swarm') {
      const swarmColors = ['#a855f7', '#c084fc', '#8b5cf6', '#d946ef', '#e879f9'];
      finalColor = swarmColors[Math.floor(variantRand * swarmColors.length)];
    } else if (type === 'blaster') {
      const blasterColors = ['#84cc16', '#a3e635', '#22c55e', '#10b981', '#4ade80'];
      finalColor = blasterColors[Math.floor(variantRand * blasterColors.length)];
    } else if (type === 'hazard') {
      const hazardColors = ['#3b82f6', '#60a5fa', '#6366f1', '#1d4ed8', '#0284c7'];
      finalColor = hazardColors[Math.floor(variantRand * hazardColors.length)];
    } else if (type === 'reinforced') {
      const reinfColors = ['#f97316', '#fb923c', '#ea580c', '#f59e0b', '#f43f5e'];
      finalColor = reinfColors[Math.floor(variantRand * reinfColors.length)];
    } else if (type === 'boss') {
      const bossColors = ['#ef4444', '#dc2626', '#b91c1c', '#f43f5e'];
      finalColor = bossColors[Math.floor(variantRand * bossColors.length)];
    }

    enemiesRef.current.push({
      id: Math.random().toString(),
      x,
      y,
      hp,
      maxHp: hp,
      speed,
      radius,
      damage,
      color: finalColor,
      type,
      typeName,
      isBoss,
      scoreValue,
      lastAttackTime: 0,
      attackCooldown,
      shape,
    });
  };

  // Main game logic loop
  useEffect(() => {
    let animationId: number;
    let lastTime = Date.now();
    let enemySpawnTimer = 0;
    let statsSyncTimer = 0;

    // Particle pool cleaner
    const loop = () => {
      const now = Date.now();
      // Calculate delta based on timeMultiplier for testing
      const baseDelta = (now - lastTime) / 1000; // in seconds
      const delta = Math.min(0.1, baseDelta) * timeMultiplier;
      lastTime = now;

      const stats = gameStats.current;

      if (!isPaused && !showLevelUp && (stats.hp > 0 || isDyingRef.current)) {
        if (!isDyingRef.current) {
          // 1. Survival Time Increaser
          stats.time += delta;
          setHudTime(Math.floor(stats.time));

          // Trigger victory condition (10 min = 600s)
          if (stats.time >= stats.victoryTargetTime) {
            handleGameOver(true);
            return;
          }

          // Periodic Health Regeneration (Permanent badge benefit)
          const regenBonus = upgrades.magnetLevel >= 5 ? 0.8 : upgrades.magnetLevel >= 3 ? 0.4 : 0;
          if (regenBonus > 0) {
            stats.hp = Math.min(stats.maxHp, stats.hp + regenBonus * delta);
            setHudHp(Math.round(stats.hp));
          }

          // 2. Dash cooldown indicators
          if (!hudDashReady && (now - stats.lastDashTime >= stats.dashCooldown)) {
            setHudDashReady(true);
          }

          // Dash runtime logic
          if (stats.isDashing) {
            if (now > stats.dashEndTime) {
              stats.isDashing = false;
            } else {
              // Move player at warp speed
              stats.playerX += stats.dashVx * delta * 60;
              stats.playerY += stats.dashVy * delta * 60;
              
              // Spawn trail particles
              if (Math.random() < 0.5) {
                particlesRef.current.push({
                  x: stats.playerX,
                  y: stats.playerY,
                  vx: (Math.random() - 0.5) * 2,
                  vy: (Math.random() - 0.5) * 2,
                  radius: 4,
                  color: character.imageColor,
                  life: 0,
                  maxLife: 15,
                });
              }
            }
          }

          // 3. Joystick / Keyboard player movement
          if (!stats.isDashing) {
            let moveX = 0;
            let moveY = 0;

            // Keyboard input detection
            if (keysPressed.current['w'] || keysPressed.current['arrowup']) moveY = -1;
            if (keysPressed.current['s'] || keysPressed.current['arrowdown']) moveY = 1;
            if (keysPressed.current['a'] || keysPressed.current['arrowleft']) moveX = -1;
            if (keysPressed.current['d'] || keysPressed.current['arrowright']) moveX = 1;

            // Touch virtual joystick handling
            if (isTouchActive && joystickStart.current && joystickCurrent.current) {
              const dx = joystickCurrent.current.x - joystickStart.current.x;
              const dy = joystickCurrent.current.y - joystickStart.current.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              
              if (dist > 5) {
                moveX = dx / dist;
                moveY = dy / dist;
              }
            }

            // Apply movement with normalize to prevent diagonal warp speed
            if (moveX !== 0 || moveY !== 0) {
              const len = Math.sqrt(moveX * moveX + moveY * moveY);
              stats.playerX += (moveX / len) * stats.speed * delta * 60;
              stats.playerY += (moveY / len) * stats.speed * delta * 60;
            }
          }

          // Keep player bounded in the virtual scrolling arena
          stats.playerX = Math.max(stats.playerRadius, Math.min(WORLD_WIDTH - stats.playerRadius, stats.playerX));
          stats.playerY = Math.max(stats.playerRadius, Math.min(WORLD_HEIGHT - stats.playerRadius, stats.playerY));

          // 4. Enemy Spawning Wave logic
          enemySpawnTimer += delta;
          
          // Spawn rates scale over time (shorter interval means faster spawning, with 1.5x spawn frequency boost)
          const spawnInterval = Math.max(0.3, (1.8 - Math.floor(stats.time / 60) * 0.15) / 1.15);
          if (enemySpawnTimer >= spawnInterval) {
            enemySpawnTimer = 0;

            // Determine group spawn count based on survival time (scaled up 1.5x, from 3 to 9)
            const baseGroupSize = Math.floor((2 + Math.floor(stats.time / 90)) * 1.5);
            const spawnCount = Math.min(10, baseGroupSize);

            for (let i = 0; i < spawnCount; i++) {
              // Randomly decide which enemy type based on survival time
              const r = Math.random();
              if (stats.time < 60) {
                // First 1 min: mostly swarms, occasionally a blaster
                spawnEnemy(r < 0.85 ? 'swarm' : 'blaster');
              } else if (stats.time < 180) {
                // 1-3 mins: swarms, blasters, occasional smartphone hazard
                if (r < 0.5) spawnEnemy('swarm');
                else if (r < 0.8) spawnEnemy('blaster');
                else spawnEnemy('hazard');
              } else if (stats.time < 360) {
                // 3-6 mins: include reinforced smoke monster
                if (r < 0.4) spawnEnemy('swarm');
                else if (r < 0.7) spawnEnemy('blaster');
                else if (r < 0.9) spawnEnemy('hazard');
                else spawnEnemy('reinforced');
              } else {
                // 6 mins+: highly aggressive all types
                if (r < 0.3) spawnEnemy('reinforced');
                else if (r < 0.6) spawnEnemy('hazard');
                else if (r < 0.8) spawnEnemy('blaster');
                else spawnEnemy('swarm');
              }
            }
          }

          // Trigger Boss Spawn every 3 minutes (180s, 360s, 540s)
          const currentThreeMin = Math.floor(stats.time / 180);
          if (currentThreeMin > 0 && Math.floor((stats.time - delta) / 180) < currentThreeMin) {
            // Warning Flash
            floatingTextsRef.current.push({
              x: canvasDimensions.width / 2,
              y: canvasDimensions.height / 3,
              text: '⚠️ 경고: 학교 규율 파괴 단속 위반 주임쌤 보스 출현!',
              color: '#f43f5e',
              life: 0,
              maxLife: 120,
              isCritical: true,
            });
            spawnEnemy('boss');
          }

          // 5. Automate Weapon Systems
          fireWeapons(delta, now);

          // 9. Update Gems Attraction & Magnet collect
          updateGems(delta);
        }

        // 6. Projectiles and Bullets Update
        updateProjectiles(delta);

        // 7. Update Strike Areas (Lightning / Mother Storm)
        updateStrikes(delta);

        // 8. Update Enemies (AI Tracking + Attack Player)
        updateEnemies(delta, now);

        // 10. Update Particles & Floating Text FX
        updateFX(delta);

        // 11. React UI HUD synchronization (reduced rate to optimize)
        statsSyncTimer += delta;
        if (statsSyncTimer >= 0.15) {
          statsSyncTimer = 0;
          setHudHp(Math.round(stats.hp));
          setHudKills(stats.kills);
          setHudScore(Math.round(stats.score));
          setHudLevel(stats.level);
          setHudExp(stats.exp);
          setHudMaxExp(stats.maxExp);
        }
      }

      // 12. Draw EVERYTHING to HTML Canvas
      drawCanvas();

      // Next frame
      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [canvasDimensions, isPaused, showLevelUp, timeMultiplier, isTouchActive]);

  // Weapon Firing Mechanism
  const fireWeapons = (delta: number, now: number) => {
    const stats = gameStats.current;
    const lvls = weaponLevelsRef.current;
    const damageMultiplier = 1 + upgrades.damageLevel * 0.1;

    // Check if character/weapon is active
    // PENCIL Weapon
    if (lvls.pencil > 0) {
      // Cooldown reduces as weapon level increases
      const cooldown = Math.max(200, 800 - lvls.pencil * 80);
      if (now - lastFiredRef.current.pencil >= cooldown) {
        lastFiredRef.current.pencil = now;

        // Target the closest enemy
        const closest = getClosestEnemy(stats.playerX, stats.playerY);
        if (closest) {
          const angle = Math.atan2(closest.y - stats.playerY, closest.x - stats.playerX);
          
          // Shoot bullets based on level
          const count = lvls.pencil >= 4 ? 3 : lvls.pencil >= 2 ? 2 : 1;
          const pierce = lvls.pencil >= 3 ? 2 : 1;
          const damage = Math.round(15 * (1 + lvls.pencil * 0.2) * damageMultiplier);

          for (let i = 0; i < count; i++) {
            const spreadAngle = angle + (i - (count - 1) / 2) * 0.15;
            bulletsRef.current.push({
              id: Math.random().toString(),
              x: stats.playerX,
              y: stats.playerY,
              vx: Math.cos(spreadAngle) * 8,
              vy: Math.sin(spreadAngle) * 8,
              radius: 5,
              damage,
              pierce,
              color: '#38bdf8', // sky-400
              type: 'pencil',
            });
          }
        }
      }
    }

    // ROTATING BOOK Weapon
    if (lvls.book > 0) {
      // Books are rendering directly orbiting the player, updating angle
      bookAngleRef.current += 0.04 * (1 + lvls.book * 0.1) * timeMultiplier;
      
      const bookCount = lvls.book >= 5 ? 5 : lvls.book >= 3 ? 3 : lvls.book >= 1 ? 2 : 1;
      const damage = Math.round(8 * (1 + lvls.book * 0.15) * damageMultiplier);

      // We do damage check in standard loop for books (collision with player surrounding radius)
      const bookRadius = 65 + lvls.book * 8;
      const bookSize = 12 + lvls.book * 2;

      for (let i = 0; i < bookCount; i++) {
        const offset = (Math.PI * 2 / bookCount) * i;
        const bx = stats.playerX + Math.cos(bookAngleRef.current + offset) * bookRadius;
        const by = stats.playerY + Math.sin(bookAngleRef.current + offset) * bookRadius;

        // Check collision with all enemies
        enemiesRef.current.forEach((enemy) => {
          const dist = Math.hypot(enemy.x - bx, enemy.y - by);
          if (dist < enemy.radius + bookSize) {
            // Apply damage if ready (avoiding multi-hit per frame, we use rate limiter)
            const attackKey = `book_hit_${enemy.id}_${i}`;
            const lastHit = lastFiredRef.current[attackKey] || 0;
            if (now - lastHit > 300) { // check cooldown per book hit
              lastFiredRef.current[attackKey] = now;
              dealDamageToEnemy(enemy, damage, '철벽의 회전책', bx, by);
              
              // Push enemy back (knockback)
              const pushAngle = Math.atan2(enemy.y - stats.playerY, enemy.x - stats.playerX);
              enemy.x += Math.cos(pushAngle) * 20;
              enemy.y += Math.sin(pushAngle) * 20;
            }
          }
        });
      }
    }

    // CHALK Homing Missiles
    if (lvls.chalk > 0) {
      const cooldown = Math.max(600, 1500 - lvls.chalk * 150);
      if (now - lastFiredRef.current.chalk >= cooldown) {
        lastFiredRef.current.chalk = now;

        // Fire homing bullets at random enemies
        const count = lvls.chalk >= 4 ? 4 : lvls.chalk >= 2 ? 2 : 1;
        const damage = Math.round(20 * (1 + lvls.chalk * 0.2) * damageMultiplier);

        for (let i = 0; i < count; i++) {
          if (enemiesRef.current.length > 0) {
            // Pick random target
            const randEnemy = enemiesRef.current[Math.floor(Math.random() * enemiesRef.current.length)];
            const angle = Math.atan2(randEnemy.y - stats.playerY, randEnemy.x - stats.playerX);
            
            bulletsRef.current.push({
              id: Math.random().toString(),
              x: stats.playerX,
              y: stats.playerY,
              vx: Math.cos(angle) * 5,
              vy: Math.sin(angle) * 5,
              radius: 6,
              damage,
              pierce: 1,
              color: '#f43f5e', // rose-500
              type: 'chalk',
              targetEnemyId: randEnemy.id,
              angle,
            });
          }
        }
      }
    }

    // MOTHER LIGHTNING Strike
    if (lvls.mother > 0) {
      const cooldown = Math.max(2500, 5000 - lvls.mother * 500);
      if (now - lastFiredRef.current.mother >= cooldown) {
        lastFiredRef.current.mother = now;

        // Target either boss or the dense group of enemies
        let targetX = stats.playerX + (Math.random() - 0.5) * 300;
        let targetY = stats.playerY + (Math.random() - 0.5) * 300;

        // Attempt to find boss or close enemy clump
        const boss = enemiesRef.current.find(e => e.isBoss);
        if (boss) {
          targetX = boss.x;
          targetY = boss.y;
        } else if (enemiesRef.current.length > 0) {
          const rand = enemiesRef.current[Math.floor(Math.random() * enemiesRef.current.length)];
          targetX = rand.x;
          targetY = rand.y;
        }

        // Add strike target Area
        strikesRef.current.push({
          x: targetX,
          y: targetY,
          radius: 80 + lvls.mother * 15,
          timer: 0.8, // 0.8s warning before strike
          maxTimer: 0.8,
          triggered: false,
          type: 'mother',
        });
      }
    }
  };

  const getClosestEnemy = (x: number, y: number): Enemy | null => {
    let minDist = Infinity;
    let closest: Enemy | null = null;
    enemiesRef.current.forEach((enemy) => {
      const dist = Math.hypot(enemy.x - x, enemy.y - y);
      if (dist < minDist) {
        minDist = dist;
        closest = enemy;
      }
    });
    return closest;
  };

  // Bullets physics update
  const updateProjectiles = (delta: number) => {
    const bullets = bulletsRef.current;
    const stats = gameStats.current;
    
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];

      // Homing chalk missile logic
      if (b.type === 'chalk' && b.targetEnemyId) {
        const target = enemiesRef.current.find(e => e.id === b.targetEnemyId);
        if (target) {
          const angleTo = Math.atan2(target.y - b.y, target.x - b.x);
          // Interpolate current angle with angle to target
          b.vx = Math.cos(angleTo) * 8;
          b.vy = Math.sin(angleTo) * 8;
        } else {
          // If target is dead, acquire a new closest target
          const newTarget = getClosestEnemy(b.x, b.y);
          if (newTarget) {
            b.targetEnemyId = newTarget.id;
          }
        }
      }

      // Translate
      b.x += b.vx * delta * 60;
      b.y += b.vy * delta * 60;

      // Bound check or distance check from player to prevent memory leaks
      const distFromPlayer = Math.hypot(b.x - stats.playerX, b.y - stats.playerY);
      const outOfBounds = distFromPlayer > 1200 || b.x < -200 || b.x > WORLD_WIDTH + 200 || b.y < -200 || b.y > WORLD_HEIGHT + 200;
      if (outOfBounds) {
        bullets.splice(i, 1);
        continue;
      }

      // Check collision against enemies
      if (b.type !== 'enemy') {
        let hit = false;
        for (let j = enemiesRef.current.length - 1; j >= 0; j--) {
          const enemy = enemiesRef.current[j];
          const dist = Math.hypot(enemy.x - b.x, enemy.y - b.y);
          
          if (dist < enemy.radius + b.radius) {
            const skillName = b.type === 'pencil' ? '정밀 연필 발사' : '선도부 유도분필';
            dealDamageToEnemy(enemy, b.damage, skillName, b.x, b.y);

            // Explosive effect for homing chalk
            if (b.type === 'chalk') {
              triggerAreaDamage(b.x, b.y, 45, b.damage * 0.6, '선도부 유도분필');
              // Chalk explosive sparks
              for (let k = 0; k < 8; k++) {
                particlesRef.current.push({
                  x: b.x,
                  y: b.y,
                  vx: (Math.random() - 0.5) * 5,
                  vy: (Math.random() - 0.5) * 5,
                  radius: 3,
                  color: '#f43f5e',
                  life: 0,
                  maxLife: 20,
                });
              }
            }

            b.pierce--;
            if (b.pierce <= 0) {
              hit = true;
              break;
            }
          }
        }

        if (hit) {
          bullets.splice(i, 1);
        }
      } else {
        // Enemy bullet colliding with Player
        const stats = gameStats.current;
        if (!stats.isDashing) {
          const dist = Math.hypot(stats.playerX - b.x, stats.playerY - b.y);
          if (dist < stats.playerRadius + b.radius) {
            damagePlayer(b.damage);
            bullets.splice(i, 1);
          }
        }
      }
    }
  };

  // Strikes trigger (Mother Storm Lightning)
  const updateStrikes = (delta: number) => {
    const strikes = strikesRef.current;
    const now = Date.now();
    const damageMultiplier = 1 + upgrades.damageLevel * 0.1;
    const lvls = weaponLevelsRef.current;

    for (let i = strikes.length - 1; i >= 0; i--) {
      const s = strikes[i];
      s.timer -= delta;

      if (s.timer <= 0 && !s.triggered) {
        s.triggered = true;

        // Strike impact damage
        const baseDamage = 80 * (1 + lvls.mother * 0.4) * damageMultiplier;
        triggerAreaDamage(s.x, s.y, s.radius, baseDamage, '엄마 소환 번개');

        // Apply stun to all enemies hit
        enemiesRef.current.forEach(enemy => {
          if (Math.hypot(enemy.x - s.x, enemy.y - s.y) < s.radius) {
            // Knockback + Stun by halving their speed momentarily
            enemy.x += (enemy.x - s.x) * 0.3;
            enemy.y += (enemy.y - s.y) * 0.3;
            
            // Stun effect text
            floatingTextsRef.current.push({
              x: enemy.x,
              y: enemy.y - 12,
              text: '💥 참회 (STUN)',
              color: '#facc15',
              life: 0,
              maxLife: 40,
              isCritical: false,
            });
          }
        });

        // Trigger flash lightning particles
        for (let j = 0; j < 30; j++) {
          particlesRef.current.push({
            x: s.x + (Math.random() - 0.5) * s.radius,
            y: s.y + (Math.random() - 0.5) * s.radius,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            radius: 4 + Math.random() * 5,
            color: '#eab308',
            life: 0,
            maxLife: 30 + Math.random() * 15,
          });
        }

        // Keep strike displayed briefly then delete
        setTimeout(() => {
          const index = strikesRef.current.indexOf(s);
          if (index > -1) {
            strikesRef.current.splice(index, 1);
          }
        }, 300);
      }
    }
  };

  const triggerAreaDamage = (x: number, y: number, radius: number, damage: number, source: string) => {
    enemiesRef.current.forEach((enemy) => {
      const dist = Math.hypot(enemy.x - x, enemy.y - y);
      if (dist < radius + enemy.radius) {
        dealDamageToEnemy(enemy, Math.round(damage), source, enemy.x, enemy.y);
      }
    });
  };

  // Damage calculation + Floating Text indicators
  const dealDamageToEnemy = (enemy: Enemy, baseDamage: number, source: string, hitX: number, hitY: number) => {
    // Critical strike chance
    const critChance = upgrades.magnetLevel >= 4 ? 0.25 : 0.10; // permanent milk levels give more criticals
    const isCritical = Math.random() < critChance;
    const finalDamage = Math.round(isCritical ? baseDamage * 1.8 : baseDamage);

    enemy.hp -= finalDamage;

    // Track damage breakdown
    damageDealtRef.current[source] = (damageDealtRef.current[source] || 0) + finalDamage;

    // Generate floating text
    floatingTextsRef.current.push({
      x: hitX || enemy.x,
      y: (hitY || enemy.y) - 10,
      text: `${finalDamage}${isCritical ? '!' : ''}`,
      color: isCritical ? '#f97316' : '#f8fafc', // orange crit, white regular
      life: 0,
      maxLife: isCritical ? 50 : 35,
      isCritical,
    });

    // Spawn tiny splatters
    for (let i = 0; i < 4; i++) {
      particlesRef.current.push({
        x: enemy.x,
        y: enemy.y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        radius: 2 + Math.random() * 2,
        color: enemy.color,
        life: 0,
        maxLife: 15,
      });
    }

    // Check death
    if (enemy.hp <= 0) {
      triggerEnemyDeath(enemy);
    }
  };

  const triggerEnemyDeath = (enemy: Enemy) => {
    const stats = gameStats.current;

    // Remove from array
    const idx = enemiesRef.current.findIndex(e => e.id === enemy.id);
    if (idx > -1) {
      enemiesRef.current.splice(idx, 1);
    }

    // Multipliers
    let scoreMult = 1.0;
    if (stageId === 'middle') scoreMult = 1.8;
    else if (stageId === 'high') scoreMult = 3.0;

    let diffMult = 1.0;
    if (difficulty === '중') diffMult = 2.0;
    else if (difficulty === '상') diffMult = 4.0;
    else if (difficulty === '해골') diffMult = 8.0;

    const baseScoreGained = enemy.scoreValue * scoreMult * diffMult;
    stats.score += baseScoreGained;
    stats.kills++;

    // Determine EXP gem value, radius, and distinct color depending on defeated enemy strength
    let gemValue = 10;
    let gemRadius = 4;
    let gemColor = '#22c55e'; // Standard green for swarm

    if (enemy.isBoss) {
      gemValue = Math.round(60 * 1.5);
      gemRadius = 9;
      gemColor = '#facc15'; // Radiant Gold
    } else if (enemy.type === 'reinforced') {
      gemValue = 30;
      gemRadius = 7;
      gemColor = '#f97316'; // Vivid Orange
    } else if (enemy.type === 'hazard') {
      gemValue = 20;
      gemRadius = 6;
      gemColor = '#a855f7'; // Purple/Violet
    } else if (enemy.type === 'blaster') {
      gemValue = 15;
      gemRadius = 5;
      gemColor = '#06b6d4'; // Glowing Cyan
    }

    if (!enemy.isBoss && stats.time < 180) {
      gemValue = Math.round(gemValue * 1.2);
    }

    // Spawn EXP Gem on location
    gemsRef.current.push({
      x: enemy.x,
      y: enemy.y,
      value: gemValue,
      radius: gemRadius,
      color: gemColor,
    });

    // Explode sparks
    for (let i = 0; i < (enemy.isBoss ? 30 : 10); i++) {
      particlesRef.current.push({
        x: enemy.x,
        y: enemy.y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        radius: 2 + Math.random() * 3,
        color: enemy.color,
        life: 0,
        maxLife: 20 + Math.random() * 20,
      });
    }
  };

  // Player Damage Receiver
  const damagePlayer = (amount: number) => {
    const stats = gameStats.current;
    if (stats.isDashing || stats.hp <= 0) return;

    // Apply clean badge defense upgrades
    const defenseBonus = upgrades.maxHpLevel >= 4 ? 0.30 : upgrades.maxHpLevel >= 2 ? 0.15 : 0;
    const finalAmount = Math.max(1, Math.round(amount * (1 - defenseBonus)));

    stats.hp -= finalAmount;
    setHudHp(Math.round(stats.hp));

    // Screen Shake or flash particles around player
    for (let i = 0; i < 8; i++) {
      particlesRef.current.push({
        x: stats.playerX,
        y: stats.playerY,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        radius: 3,
        color: '#f43f5e', // blood rose flash
        life: 0,
        maxLife: 15,
      });
    }

    // Floating combat text on player
    floatingTextsRef.current.push({
      x: stats.playerX + (Math.random() - 0.5) * 15,
      y: stats.playerY - 20,
      text: `-${finalAmount}`,
      color: '#f43f5e',
      life: 0,
      maxLife: 30,
      isCritical: false,
    });

    // Gameover check
    if (stats.hp <= 0 && !isDyingRef.current) {
      setIsDying(true);
      isDyingRef.current = true;
      
      // Spawn massive defeat sparks around player
      for (let i = 0; i < 40; i++) {
        particlesRef.current.push({
          x: stats.playerX,
          y: stats.playerY,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.5) * 8,
          radius: 2 + Math.random() * 4,
          color: '#ef4444',
          life: 0,
          maxLife: 45 + Math.random() * 30,
        });
      }

      // Smoothly transition to GameOver Screen after 2.5 seconds
      setTimeout(() => {
        handleGameOver(false);
      }, 2500);
    }
  };

  // AI Enemies Tracking Logic
  const updateEnemies = (delta: number, now: number) => {
    const enemies = enemiesRef.current;
    const stats = gameStats.current;

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];

      // Distance to Player
      const dx = stats.playerX - e.x;
      const dy = stats.playerY - e.y;
      const dist = Math.hypot(dx, dy);

      // Unit direction
      if (dist > 5) {
        const vx = (dx / dist) * e.speed;
        const vy = (dy / dist) * e.speed;
        
        // Move enemy
        e.x += vx * delta * 60;
        e.y += vy * delta * 60;
      }

      // Blaster shooting mechanism (ranged enemies)
      if (e.type === 'blaster') {
        const shotCooldown = 2500;
        const lastShot = e.lastShotTime || 0;
        if (now - lastShot > shotCooldown && dist < 220) {
          e.lastShotTime = now;
          // Fire spitting ball projectile at player
          const angle = Math.atan2(dy, dx);
          bulletsRef.current.push({
            id: Math.random().toString(),
            x: e.x,
            y: e.y,
            vx: Math.cos(angle) * 3.5,
            vy: Math.sin(angle) * 3.5,
            radius: 5,
            damage: e.damage,
            pierce: 1,
            color: '#84cc16', // acidic lime spit spit
            type: 'enemy',
          });
        }
      }

      // Collision damage with player
      if (dist < e.radius + stats.playerRadius) {
        if (now - e.lastAttackTime > e.attackCooldown) {
          e.lastAttackTime = now;
          damagePlayer(e.damage);
        }
      }
    }
  };

  // Attraction of gems & levelup
  const updateGems = (delta: number) => {
    const gems = gemsRef.current;
    const stats = gameStats.current;

    for (let i = gems.length - 1; i >= 0; i--) {
      const g = gems[i];
      const dx = stats.playerX - g.x;
      const dy = stats.playerY - g.y;
      const dist = Math.hypot(dx, dy);

      // Collect gem
      if (dist < stats.playerRadius + g.radius) {
        triggerGemCollect(g);
        gems.splice(i, 1);
        continue;
      }

      // Magnetic pull attraction
      if (dist < stats.magnetRange) {
        // Accelerate pull towards player
        const speed = (1 - dist / stats.magnetRange) * 12 + 2;
        g.x += (dx / dist) * speed * delta * 60;
        g.y += (dy / dist) * speed * delta * 60;
      }
    }
  };

  const triggerGemCollect = (gem: Gem) => {
    const stats = gameStats.current;
    stats.exp += gem.value;

    // Trigger score increase
    stats.score += gem.value * 2;

    // Particles sparkle
    for (let i = 0; i < 5; i++) {
      particlesRef.current.push({
        x: stats.playerX,
        y: stats.playerY,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        radius: 2,
        color: gem.color,
        life: 0,
        maxLife: 15,
      });
    }

    let leveledUp = false;
    while (stats.exp >= stats.maxExp) {
      stats.exp -= stats.maxExp;
      stats.level += 1;
      stats.maxExp = getRequiredExpForLevel(stats.level);
      leveledUp = true;
    }

    if (leveledUp) {
      // Spawn level up visual effect
      floatingTextsRef.current.push({
        x: stats.playerX,
        y: stats.playerY - 25,
        text: '🎓 LEVEL UP!',
        color: '#eab308',
        life: 0,
        maxLife: 60,
        isCritical: true,
      });

      // Restore some HP
      stats.hp = Math.min(stats.maxHp, stats.hp + stats.maxHp * 0.15);

      if (!showLevelUpRef.current) {
        triggerLevelUpOptions();
      }
    }
  };

  const triggerLevelUpOptions = () => {
    if (showLevelUpRef.current) return;
    showLevelUpRef.current = true;

    // Select 3 random level up items
    // Shuffle choices array
    const shuffled = [...LEVEL_UP_CHOICES].sort(() => 0.5 - Math.random());
    setLevelUpChoices(shuffled.slice(0, 3));
    setShowLevelUp(true);
  };

  const handleLevelUpChoice = (item: InGameItem) => {
    // Update weapon level
    setWeaponLevels((prev) => {
      const current = prev[item.id] || 0;
      const nextLvl = current + 1;
      const updated = { ...prev, [item.id]: nextLvl };
      
      // Keep mutable ref in sync for lightning/bullets speed
      weaponLevelsRef.current = updated;
      return updated;
    });

    // Special items instantaneous effect
    if (item.id === 'vitamin') {
      gameStats.current.maxHp += 25;
      gameStats.current.hp = Math.min(gameStats.current.maxHp, gameStats.current.hp + 40);
      setHudMaxHp(gameStats.current.maxHp);
      setHudHp(Math.round(gameStats.current.hp));
    }

    showLevelUpRef.current = false;
    setShowLevelUp(false);
  };

  // FX updates (particles & text)
  const updateFX = (delta: number) => {
    // Floating text
    const txts = floatingTextsRef.current;
    for (let i = txts.length - 1; i >= 0; i--) {
      const t = txts[i];
      t.life += delta * 60;
      t.y -= delta * 30; // Float upwards

      if (t.life >= t.maxLife) {
        txts.splice(i, 1);
      }
    }

    // Particles
    const parts = particlesRef.current;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life += delta * 60;
      p.x += p.vx * delta * 60;
      p.y += p.vy * delta * 60;

      // deceleration friction
      p.vx *= 0.96;
      p.vy *= 0.96;

      if (p.life >= p.maxLife) {
        parts.splice(i, 1);
      }
    }
  };

  // DRAW CANVAS LOOP
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const stats = gameStats.current;

    // Calculate camera offset to keep player centered
    // Bound camera to stay within [0, WORLD_WIDTH] x [0, WORLD_HEIGHT]
    const cameraX = Math.max(0, Math.min(WORLD_WIDTH - canvas.width, stats.playerX - canvas.width / 2));
    const cameraY = Math.max(0, Math.min(WORLD_HEIGHT - canvas.height, stats.playerY - canvas.height / 2));

    // Clear Canvas
    ctx.fillStyle = '#020617'; // slate-950 background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Decorative floor grid inside game field (Scrolling aware!)
    ctx.strokeStyle = '#0f172a'; // slate-900 grid lines
    ctx.lineWidth = 1;
    const gridSize = 80;
    
    const startX = Math.floor(cameraX / gridSize) * gridSize;
    const startY = Math.floor(cameraY / gridSize) * gridSize;
    const endX = startX + canvas.width + gridSize;
    const endY = startY + canvas.height + gridSize;

    for (let x = startX; x < endX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x - cameraX, 0);
      ctx.lineTo(x - cameraX, canvas.height);
      ctx.stroke();
    }
    for (let y = startY; y < endY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y - cameraY);
      ctx.lineTo(canvas.width, y - cameraY);
      ctx.stroke();
    }

    // Draw campus boundary walls (visualizing world boundaries)
    ctx.strokeStyle = '#312e81'; // deep indigo border
    ctx.lineWidth = 8;
    ctx.strokeRect(0 - cameraX, 0 - cameraY, WORLD_WIDTH, WORLD_HEIGHT);

    // 1. Draw Strike target warnings (Mother Lightning)
    strikesRef.current.forEach((s) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(s.x - cameraX, s.y - cameraY, s.radius, 0, Math.PI * 2);
      
      if (!s.triggered) {
        // Red Pulsing warning circle
        const pulse = Math.abs(Math.sin(Date.now() / 80)) * 0.3 + 0.1;
        ctx.fillStyle = `rgba(234, 179, 8, ${pulse})`; // Yellow pulsing
        ctx.fill();
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Warning Text overhead
        ctx.fillStyle = '#eab308';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ 엄마 소환: 격노 번개 지점!', s.x - cameraX, s.y - cameraY - s.radius - 6);
      } else {
        // Direct neon flash white & yellow lightning shaft
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Screen flash visual line representing lightning bolt
        ctx.beginPath();
        ctx.moveTo(s.x - cameraX, 0);
        ctx.lineTo(s.x - cameraX, s.y - cameraY);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 6;
        ctx.stroke();
      }
      ctx.restore();
    });

    // 2. Draw Experience Gems
    gemsRef.current.forEach((g) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(g.x - cameraX, g.y - cameraY, g.radius, 0, Math.PI * 2);
      ctx.fillStyle = g.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = g.color;
      ctx.fill();
      ctx.restore();
    });

    // 3. Draw Enemies
    enemiesRef.current.forEach((e) => {
      ctx.save();
      // Draw HP bar above enemy
      if (e.hp < e.maxHp) {
        const barW = e.radius * 2;
        const barH = 3;
        const pct = e.hp / e.maxHp;
        ctx.fillStyle = '#1e293b'; // slate-800
        ctx.fillRect(e.x - cameraX - barW / 2, e.y - cameraY - e.radius - 8, barW, barH);
        ctx.fillStyle = '#ef4444'; // red-500
        ctx.fillRect(e.x - cameraX - barW / 2, e.y - cameraY - e.radius - 8, barW * pct, barH);
      }

      // Aura on Reinforced and Boss
      if (e.isBoss || e.type === 'reinforced') {
        ctx.beginPath();
        ctx.arc(e.x - cameraX, e.y - cameraY, e.radius + 6, 0, Math.PI * 2);
        ctx.strokeStyle = `${e.color}1c`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw Enemy Core Circle or custom geometric shapes
      const cx = e.x - cameraX;
      const cy = e.y - cameraY;
      const r = e.radius;
      const shape = e.shape || 'circle';

      ctx.save();
      ctx.shadowBlur = e.isBoss ? 16 : 6;
      ctx.shadowColor = e.color;
      ctx.fillStyle = e.color;
      ctx.beginPath();

      if (shape === 'triangle') {
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx + r * 0.9, cy + r * 0.7);
        ctx.lineTo(cx - r * 0.9, cy + r * 0.7);
        ctx.closePath();
      } else if (shape === 'square') {
        ctx.rect(cx - r, cy - r, r * 2, r * 2);
      } else if (shape === 'pentagon') {
        for (let i = 0; i < 5; i++) {
          const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
          ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
        }
        ctx.closePath();
      } else if (shape === 'hexagon') {
        for (let i = 0; i < 6; i++) {
          const angle = (i * 2 * Math.PI) / 6;
          ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
        }
        ctx.closePath();
      } else if (shape === 'star') {
        const points = e.isBoss ? 8 : 5;
        const innerRadius = r * 0.45;
        for (let i = 0; i < points * 2; i++) {
          const angle = (i * Math.PI) / points - Math.PI / 2;
          const rad = i % 2 === 0 ? r : innerRadius;
          ctx.lineTo(cx + Math.cos(angle) * rad, cy + Math.sin(angle) * rad);
        }
        ctx.closePath();
      } else if (shape === 'cross') {
        const w = r * 0.35;
        ctx.moveTo(cx - r, cy - w);
        ctx.lineTo(cx - w, cy - w);
        ctx.lineTo(cx - w, cy - r);
        ctx.lineTo(cx + w, cy - r);
        ctx.lineTo(cx + w, cy - w);
        ctx.lineTo(cx + r, cy - w);
        ctx.lineTo(cx + r, cy + w);
        ctx.lineTo(cx + w, cy + w);
        ctx.lineTo(cx + w, cy + r);
        ctx.lineTo(cx - w, cy + r);
        ctx.lineTo(cx - w, cy + w);
        ctx.lineTo(cx - r, cy + w);
        ctx.closePath();
      } else {
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.restore();

      // Draw inner core representing enemy face or pupil
      ctx.beginPath();
      if (shape === 'square') {
        ctx.rect(cx - r * 0.4, cy - r * 0.4, r * 0.8, r * 0.8);
      } else if (shape === 'triangle') {
        ctx.moveTo(cx, cy - r * 0.3);
        ctx.lineTo(cx + r * 0.4, cy + r * 0.3);
        ctx.lineTo(cx - r * 0.4, cy + r * 0.3);
        ctx.closePath();
      } else {
        ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
      }
      ctx.fillStyle = '#020617';
      ctx.fill();

      // Text name on Boss
      if (e.isBoss) {
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'black 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(e.typeName, e.x - cameraX, e.y - cameraY - e.radius - 12);
      }

      ctx.restore();
    });

    // 4. Draw Projectiles
    bulletsRef.current.forEach((b) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(b.x - cameraX, b.y - cameraY, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = b.color;
      ctx.fill();
      ctx.restore();
    });

    // 5. Draw ROTATING BOOKS ( 배리어 ) orbiting player
    const lvls = weaponLevelsRef.current;
    if (lvls.book > 0) {
      const bookCount = lvls.book >= 5 ? 5 : lvls.book >= 3 ? 3 : lvls.book >= 1 ? 2 : 1;
      const bookRadius = 65 + lvls.book * 8;
      const bookSize = 12 + lvls.book * 2;

      for (let i = 0; i < bookCount; i++) {
        const offset = (Math.PI * 2 / bookCount) * i;
        const bx = stats.playerX + Math.cos(bookAngleRef.current + offset) * bookRadius;
        const by = stats.playerY + Math.sin(bookAngleRef.current + offset) * bookRadius;

        ctx.save();
        ctx.beginPath();
        // Drawing beautiful thick square matching book aspect
        ctx.rect(bx - cameraX - bookSize / 2, by - cameraY - bookSize / 2, bookSize, bookSize);
        ctx.fillStyle = '#4ade80'; // emerald green
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#4ade80';
        ctx.fill();
        ctx.stroke();

        // Inner bookmark detail
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(bx - cameraX - 2, by - cameraY - bookSize/2, 4, bookSize * 0.6);
        ctx.restore();
      }
    }

    // 6. Draw Player (모범생)
    ctx.save();
    // Shield Magnet circle overlay
    ctx.beginPath();
    ctx.arc(stats.playerX - cameraX, stats.playerY - cameraY, stats.playerRadius + (stats.isDashing ? 12 : 6), 0, Math.PI * 2);
    ctx.strokeStyle = stats.isDashing ? '#ffffff' : `${character.imageColor}30`;
    ctx.lineWidth = stats.isDashing ? 3 : 1;
    ctx.stroke();

    // Core Player Avatar
    ctx.beginPath();
    ctx.arc(stats.playerX - cameraX, stats.playerY - cameraY, stats.playerRadius, 0, Math.PI * 2);
    ctx.fillStyle = character.imageColor;
    ctx.shadowBlur = 15;
    ctx.shadowColor = character.imageColor;
    ctx.fill();

    // Student Glasses / Eye wear detail to emphasize School theme!
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(stats.playerX - cameraX - 10, stats.playerY - cameraY - 4, 7, 5); // left glass
    ctx.fillRect(stats.playerX - cameraX + 3, stats.playerY - cameraY - 4, 7, 5);  // right glass
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(stats.playerX - cameraX - 7, stats.playerY - cameraY - 2, 2, 2);
    ctx.fillRect(stats.playerX - cameraX + 6, stats.playerY - cameraY - 2, 2, 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(stats.playerX - cameraX - 3, stats.playerY - cameraY - 2);
    ctx.lineTo(stats.playerX - cameraX + 3, stats.playerY - cameraY - 2);
    ctx.stroke();

    ctx.restore();

    // 7. Draw Floating Text combat damage
    floatingTextsRef.current.forEach((t) => {
      ctx.save();
      ctx.fillStyle = t.color;
      ctx.font = t.isCritical ? 'black 16px sans-serif' : 'bold 11px sans-serif';
      ctx.shadowBlur = t.isCritical ? 10 : 0;
      ctx.shadowColor = t.color;
      ctx.textAlign = 'center';
      ctx.fillText(t.text, t.x - cameraX, t.y - cameraY);
      ctx.restore();
    });

    // 8. Draw Explosive Particles
    particlesRef.current.forEach((p) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x - cameraX, p.y - cameraY, p.radius * (1 - p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.restore();
    });

    // 9. Draw Touch Virtual Joystick (if active)
    if (isTouchActive && joystickStart.current && joystickCurrent.current) {
      const s = joystickStart.current;
      const c = joystickCurrent.current;
      const dist = Math.hypot(c.x - s.x, c.y - s.y);
      const angle = Math.atan2(c.y - s.y, c.x - s.x);
      
      const maxRadius = 55;
      const activeDist = Math.min(maxRadius, dist);
      const knobX = s.x + Math.cos(angle) * activeDist;
      const shadowY = s.y + Math.sin(angle) * activeDist;

      // Outer bounds
      ctx.save();
      ctx.beginPath();
      ctx.arc(s.x, s.y, maxRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fill();

      // Joystick Knob
      ctx.beginPath();
      ctx.arc(knobX, shadowY, 20, 0, Math.PI * 2);
      ctx.fillStyle = character.imageColor;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 8;
      ctx.shadowColor = character.imageColor;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 10. Draw Mobile Touch Dash Button (for Mobile view testing)
    const isMobileSize = window.innerWidth < 768;
    if (isMobileSize) {
      const buttonX = canvas.width - 60;
      const buttonY = canvas.height - 60;
      const bRad = 28;

      ctx.save();
      ctx.beginPath();
      ctx.arc(buttonX, buttonY, bRad, 0, Math.PI * 2);
      ctx.fillStyle = hudDashReady ? 'rgba(99, 102, 241, 0.35)' : 'rgba(30, 41, 59, 0.6)';
      ctx.strokeStyle = hudDashReady ? '#818cf8' : '#475569';
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = hudDashReady ? 12 : 0;
      ctx.shadowColor = '#818cf8';
      ctx.fill();
      ctx.stroke();

      // Dash symbol
      ctx.fillStyle = hudDashReady ? '#ffffff' : '#94a3b8';
      ctx.font = 'black 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(hudDashReady ? 'DASH' : 'WAIT', buttonX, buttonY);
      ctx.restore();
    }

    // 11. Draw a beautiful red vignette & '학교 정화 실패' warning overlay when player is dying
    if (isDying) {
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.width / 4,
        canvas.width / 2, canvas.height / 2, canvas.width / 1.1
      );
      gradient.addColorStop(0, 'rgba(244, 63, 94, 0)');
      gradient.addColorStop(1, 'rgba(244, 63, 94, 0.45)');
      
      ctx.save();
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Warning text
      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#f43f5e';
      ctx.fillText('🔴 학교 정화 실패 (체력 소진) 🔴', canvas.width / 2, canvas.height / 2 - 25);
      
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 13px sans-serif';
      ctx.shadowBlur = 0;
      ctx.fillText('선도부 주임 선생님들이 성적 경고장을 발부하는 중...', canvas.width / 2, canvas.height / 2 + 15);
      ctx.restore();
    }
  };

  const handleGameOver = (victory: boolean) => {
    setIsPaused(true);
    onPauseToggle(true);
    
    // Calculate final metrics
    const stats = gameStats.current;
    
    // Base survival points + kills reward
    const finalScore = Math.round(stats.score + (victory ? 10000 : 0));

    onGameEnd({
      victory,
      survivalTime: Math.floor(stats.time),
      kills: stats.kills,
      level: stats.level,
      score: finalScore,
      damageBreakdown: damageDealtRef.current,
    });
  };

  const togglePause = () => {
    const nextState = !isPaused;
    setIsPaused(nextState);
    onPauseToggle(nextState);
  };

  // Convert seconds to MM:SS
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Stage details name helper
  const getStageName = () => {
    if (stageId === 'elementary') return '초등학교 구역';
    if (stageId === 'middle') return '중학교 구역';
    return '고등학교 구역';
  };

  return (
    <div className="relative flex-1 w-full flex flex-col overflow-hidden" ref={containerRef}>
      {/* 0. TOP-EDGE FULLWIDTH NEON EXP BAR */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-slate-950/90 border-b border-slate-900/40 z-40 select-none pointer-events-none flex flex-col justify-end">
        <div 
          className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 shadow-[0_0_12px_rgba(52,211,153,0.8)] transition-all duration-150"
          style={{ width: `${Math.max(0, Math.min(100, (hudExp / hudMaxExp) * 100))}%` }}
        />
      </div>

      {/* 1. HUD OVERLAY PANEL (React UI absolute layout for beautiful rendering) */}
      <div className="absolute top-2 left-0 right-0 p-4 flex flex-col gap-2.5 z-30 select-none pointer-events-none">
        {/* UPPER HUD BAR */}
        <div className="flex justify-between items-start w-full">
          {/* Leftside: Player HP / EXP Progress */}
          <div className="flex flex-col gap-1.5 w-full max-w-[280px]">
            {/* HP Gauge */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-rose-400 font-mono tracking-wider">HP</span>
              <div className="relative flex-1 h-3.5 bg-slate-900 border border-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-rose-500 to-rose-400 transition-all duration-150"
                  style={{ width: `${Math.max(0, Math.min(100, (hudHp / hudMaxHp) * 100))}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white font-mono">
                  {hudHp} / {hudMaxHp}
                </span>
              </div>
            </div>

            {/* EXP Gauge */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-emerald-400 font-mono tracking-wider">EXP</span>
              <div className="relative flex-1 h-2.5 bg-slate-900 border border-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-150"
                  style={{ width: `${Math.max(0, Math.min(100, (hudExp / hudMaxExp) * 100))}%` }}
                />
              </div>
              <span className="text-[9px] font-bold text-slate-400 font-mono">
                {Math.floor((hudExp / hudMaxExp) * 100)}%
              </span>
            </div>
          </div>

          {/* Center Status Banner (MM:SS, Kills, Stage multiplier) */}
          <div className="flex flex-col items-center gap-1 bg-slate-950/80 border border-slate-900 px-5 py-2 rounded-2xl pointer-events-auto shadow-lg backdrop-blur">
            <span className="text-2xl font-black text-cyan-400 font-mono tracking-wider select-text">
              {formatTime(hudTime)}
            </span>
            <div className="flex items-center gap-2.5 text-[10px] text-slate-400 font-semibold font-mono">
              <span>Lv.{hudLevel}</span>
              <span className="text-slate-700">|</span>
              <span>처치 {hudKills}</span>
              <span className="text-slate-700">|</span>
              <span className="text-yellow-400 font-bold">{hudScore.toLocaleString()} PTS</span>
            </div>
          </div>

          {/* Rightside: Control Buttons (Pause, Fullscreen, Dash Cooldown Info) */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Fullscreen toggle button */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? "창모드로 전환" : "전체화면으로 전환"}
              className="p-2 bg-slate-900/90 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-100 hover:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center"
            >
              {isFullscreen ? <Minimize className="w-4 h-4 text-cyan-400" /> : <Maximize className="w-4 h-4 text-cyan-400" />}
            </button>

            <button
              onClick={togglePause}
              className="p-2 bg-slate-900/90 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-100 hover:text-white rounded-xl transition-all cursor-pointer"
            >
              {isPaused ? <Play className="w-4 h-4 fill-white" /> : <Pause className="w-4 h-4 fill-white" />}
            </button>
          </div>
        </div>

        {/* LOWER HUD BAR - Active Skills list */}
        <div className="flex flex-wrap gap-2.5 mt-1">
          {Object.entries(weaponLevels).map(([wId, lvl]) => {
            const detail = LEVEL_UP_CHOICES.find(item => item.id === wId);
            if (!detail) return null;

            return (
              <div 
                key={wId}
                className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-900/60 px-2.5 py-1 rounded-lg text-[9px] font-black shadow-sm"
                style={{ color: detail.color }}
              >
                <span>{detail.name}</span>
                <span className="bg-slate-800 px-1 py-0.5 rounded text-slate-400">Lv.{lvl}</span>
              </div>
            );
          })}

          <div className={`flex items-center gap-1 bg-slate-950/80 border border-slate-900/60 px-2.5 py-1 rounded-lg text-[9px] font-black shadow-sm ${
            hudDashReady ? 'text-indigo-400' : 'text-slate-500'
          }`}>
            <span>🏃‍♂️ 체육복 대시</span>
            <span className="bg-slate-800 px-1 py-0.5 rounded">
              {hudDashReady ? 'READY' : 'CD'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. GAME CANVAS TARGET */}
      <canvas
        ref={canvasRef}
        width={canvasDimensions.width}
        height={canvasDimensions.height}
        className="block flex-1 w-full h-full cursor-crosshair touch-none select-none"
      />

      {/* 3. PAUSED OVERLAY */}
      {isPaused && !showLevelUp && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-40 flex flex-col items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-8 max-w-sm w-full text-center space-y-6 shadow-2xl">
            <h3 className="text-3xl font-black text-cyan-400 tracking-tight flex justify-center items-center gap-2">
              <ShieldAlert className="w-7 h-7 text-cyan-400" />
              자습 시간 (PAUSE)
            </h3>
            <p className="text-xs text-slate-400 leading-normal">
              선생님 몰래 잠시 휴식 중입니다.<br />
              현재 구역: <strong className="text-slate-200">{getStageName()}</strong><br />
              현재 난이도: <strong className="text-slate-200">배율 x{difficulty === '하' ? 1 : difficulty === '중' ? 2 : difficulty === '상' ? 4 : 8}</strong>
            </p>
            <button
              onClick={togglePause}
              className="w-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black py-3 rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg shadow-cyan-400/25"
            >
              다시 수업 복귀
            </button>
          </div>
        </div>
      )}

      {/* 4. LEVEL UP CHOICE MODAL */}
      {showLevelUp && (
        <LevelUpModal
          level={hudLevel}
          choices={levelUpChoices}
          weaponLevels={weaponLevels}
          onSelect={handleLevelUpChoice}
        />
      )}
    </div>
  );
}
