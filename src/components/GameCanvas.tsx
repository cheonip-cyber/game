import { useRef, useEffect, useState } from 'react';
import { Character, StageId, Difficulty, UpgradeState, InGameItem } from '../types';
import { LEVEL_UP_CHOICES } from '../constants';
import { Pause, Play, ShieldAlert, Maximize, Minimize } from 'lucide-react';
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

const FIELD_BALANCE = {
  elementary: {
    '하': [20, 4, 30, 15, 1.0], '중': [40, 8, 60, 30, 1.3],
    '상': [60, 12, 90, 45, 1.6], '해골': [80, 16, 120, 62, 2.0],
  },
  middle: {
    '하': [40, 8, 60, 30, 1.2], '중': [80, 16, 120, 62, 1.5],
    '상': [120, 24, 180, 94, 1.9], '해골': [160, 32, 240, 125, 2.4],
  },
  high: {
    '하': [60, 12, 90, 47, 1.5], '중': [120, 24, 180, 94, 2.0],
    '상': [180, 36, 270, 140, 2.5], '해골': [240, 48, 360, 187, 3.0],
  },
} as const;

const SCORE_FIELD_WEIGHT: Record<StageId, number> = { elementary: 1, middle: 1.8, high: 3 };
const SCORE_DIFFICULTY_WEIGHT: Record<Difficulty, number> = { '하': 1, '중': 1.4, '상': 2, '해골': 3 };
const MAX_SKILL_LEVEL = 5;
const MAX_ENEMIES = 360;
const MAX_BULLETS = 420;
const MAX_GEMS = 220;
const MAX_PARTICLES = 520;
const MAX_FLOATING_TEXTS = 110;
const ENEMY_GRID_SIZE = 140;

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
  kind: 'exp' | 'magnet' | 'bomb';
  isMagnetized?: boolean;
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

type PlayerFacing = 'down' | 'left' | 'right' | 'up';

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
  const heroImageRef = useRef<HTMLImageElement | null>(null);
  const expPrismImageRef = useRef<HTMLImageElement | null>(null);
  const playerFacingRef = useRef<PlayerFacing>('down');

  const timeMultiplier = 1;

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
  const lastBossTierRef = useRef(0);
  const lastHordeWaveRef = useRef(0);

  useEffect(() => {
    const heroImage = new Image();
    heroImage.src = '/assets/game/student-heroes-directional-v3.png';
    heroImage.onload = () => {
      heroImageRef.current = heroImage;
    };

    const expPrismImage = new Image();
    expPrismImage.src = '/assets/game/exp-prism.png';
    expPrismImage.onload = () => {
      expPrismImageRef.current = expPrismImage;
    };
  }, []);

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
  const [hudDashCooldown, setHudDashCooldown] = useState(0);

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
    const hpBonus = 1 + upgrades.maxHpLevel * 0.05;
    const speedBonus = 1 + upgrades.speedLevel * 0.02;
    const magnetBonus = 1 + upgrades.magnetLevel * 0.06;
    const dashCooldownReduction = upgrades.dashLevel * 0.04;

    gameStats.current.maxHp = Math.round(character.baseHp * hpBonus);
    gameStats.current.hp = gameStats.current.maxHp;
    const inGameSpeedBonus = 1 + (weaponLevelsRef.current.move_speed || 0) * 0.08;
    gameStats.current.speed = character.baseSpeed * speedBonus * inGameSpeedBonus;
    gameStats.current.magnetRange = character.baseMagnet * magnetBonus;
    gameStats.current.dashCooldown = Math.max(1500, 3000 * (1 - dashCooldownReduction));

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
  const enemyGridRef = useRef<Map<string, Enemy[]>>(new Map());

  const rebuildEnemyGrid = () => {
    const grid = enemyGridRef.current;
    grid.clear();
    for (const enemy of enemiesRef.current) {
      const key = `${Math.floor(enemy.x / ENEMY_GRID_SIZE)},${Math.floor(enemy.y / ENEMY_GRID_SIZE)}`;
      const cell = grid.get(key);
      if (cell) cell.push(enemy);
      else grid.set(key, [enemy]);
    }
  };

  const getNearbyEnemies = (x: number, y: number, radius: number) => {
    const result: Enemy[] = [];
    const minX = Math.floor((x - radius) / ENEMY_GRID_SIZE);
    const maxX = Math.floor((x + radius) / ENEMY_GRID_SIZE);
    const minY = Math.floor((y - radius) / ENEMY_GRID_SIZE);
    const maxY = Math.floor((y + radius) / ENEMY_GRID_SIZE);
    for (let cellX = minX; cellX <= maxX; cellX++) {
      for (let cellY = minY; cellY <= maxY; cellY++) {
        const cell = enemyGridRef.current.get(`${cellX},${cellY}`);
        if (cell) result.push(...cell);
      }
    }
    return result;
  };

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
    playerFacingRef.current = Math.abs(dx) > Math.abs(dy)
      ? dx < 0 ? 'left' : 'right'
      : dy < 0 ? 'up' : 'down';

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

      // The first touch controls movement; any additional finger dashes anywhere.
      if (joystickTouchId.current !== null && touch.identifier !== joystickTouchId.current) {
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
  const spawnEnemy = (
    type: 'swarm' | 'blaster' | 'hazard' | 'reinforced' | 'boss',
    clusterAnchor?: { x: number; y: number },
  ) => {
    if (enemiesRef.current.length >= MAX_ENEMIES) return;
    const stats = gameStats.current;
    const width = canvasDimensions.width;
    const height = canvasDimensions.height;

    // Spawn slightly outside viewport bounds
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.max(width, height) / 2 + 50;
    let x = clusterAnchor
      ? clusterAnchor.x + (Math.random() - 0.5) * 130
      : stats.playerX + Math.cos(angle) * distance;
    let y = clusterAnchor
      ? clusterAnchor.y + (Math.random() - 0.5) * 130
      : stats.playerY + Math.sin(angle) * distance;
    
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

    const [, , , enemyAttack] = FIELD_BALANCE[stageId][difficulty];
    const elapsedMinutes = stats.time / 60;
    const hpScale = 1 + 0.18 * elapsedMinutes;
    const damageScale = (1 + 0.12 * elapsedMinutes) * (1 + 0.02 * stats.level);
    const scaleHp = (val: number) => Math.round(val * hpScale);
    const scaleDmg = (ratio: number) => Math.max(1, Math.round(enemyAttack * ratio * damageScale * 0.6));
    const schoolSize = stageId === 'elementary' ? 0.88 : stageId === 'middle' ? 1 : 1.18;

    switch (type) {
      case 'swarm':
        typeName = '스마트폰 좀비 스웜';
        hp = scaleHp(12);
        speed = 2.4;
        radius = 11;
        damage = scaleDmg(0.4);
        color = '#a855f7'; // purple-500
        scoreValue = 80;
        break;
      case 'blaster':
        typeName = '침뱉기 일진 블래스터';
        hp = scaleHp(22);
        speed = 1.4;
        radius = 14;
        damage = scaleDmg(0.65);
        color = '#84cc16'; // lime-500
        scoreValue = 150;
        break;
      case 'hazard':
        typeName = '스마트폰 중독 섹터 해저드';
        hp = scaleHp(60);
        speed = 0.7;
        radius = 24;
        damage = scaleDmg(0.85);
        color = '#3b82f6'; // blue-500
        scoreValue = 250;
        break;
      case 'reinforced':
        typeName = '유해 담배연기 몬스터';
        hp = scaleHp(120);
        speed = 1.6;
        radius = 18;
        damage = scaleDmg(1);
        color = '#f97316'; // orange-500
        scoreValue = 400;
        break;
      case 'boss':
        typeName = '👹 폭주 학업스트레스 보스';
        hp = scaleHp(1200);
        speed = 1.2;
        radius = 32;
        damage = scaleDmg(1.35);
        color = '#ef4444'; // red-500
        scoreValue = 2000;
        isBoss = true;
        attackCooldown = 500;
        break;
    }

    speed += Math.min(1.8, Math.max(0, stats.level - 1) * 0.03);
    radius = Math.round(radius * schoolSize);

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
      const schoolColors = stageId === 'elementary' ? ['#38bdf8', '#22d3ee', '#34d399'] : stageId === 'middle' ? swarmColors : ['#f43f5e', '#dc2626', '#7c3aed'];
      finalColor = schoolColors[Math.floor(variantRand * schoolColors.length)];
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
              playerFacingRef.current = Math.abs(moveX) > Math.abs(moveY)
                ? moveX < 0 ? 'left' : 'right'
                : moveY < 0 ? 'up' : 'down';
              stats.playerX += (moveX / len) * stats.speed * delta * 60;
              stats.playerY += (moveY / len) * stats.speed * delta * 60;
            }
          }

          // Keep player bounded in the virtual scrolling arena
          stats.playerX = Math.max(stats.playerRadius, Math.min(WORLD_WIDTH - stats.playerRadius, stats.playerX));
          stats.playerY = Math.max(stats.playerRadius, Math.min(WORLD_HEIGHT - stats.playerRadius, stats.playerY));

          // 4. Level and survival time continuously raise enemy pressure.
          enemySpawnTimer += delta;

          const levelTier = Math.floor((stats.level - 1) / 3);
          const timeTier = Math.floor(stats.time / 90);
          const spawnFrequency = FIELD_BALANCE[stageId][difficulty][4];
          const spawnInterval = Math.max(0.18, (1.25 - levelTier * 0.08 - timeTier * 0.035) / spawnFrequency);
          if (enemySpawnTimer >= spawnInterval) {
            enemySpawnTimer = 0;

            const spawnCount = Math.min(24, 2 + levelTier + Math.floor(timeTier / 2));

            for (let i = 0; i < spawnCount; i++) {
              const r = Math.random();
              if (stats.level < 4) {
                spawnEnemy(r < 0.85 ? 'swarm' : 'blaster');
              } else if (stats.level < 8) {
                if (r < 0.5) spawnEnemy('swarm');
                else if (r < 0.8) spawnEnemy('blaster');
                else spawnEnemy('hazard');
              } else if (stats.level < 15) {
                if (r < 0.3) spawnEnemy('swarm');
                else if (r < 0.58) spawnEnemy('blaster');
                else if (r < 0.84) spawnEnemy('hazard');
                else spawnEnemy('reinforced');
              } else {
                if (r < 0.38) spawnEnemy('reinforced');
                else if (r < 0.68) spawnEnemy('hazard');
                else if (r < 0.88) spawnEnemy('blaster');
                else spawnEnemy('swarm');
              }
            }
          }

          const hordeWave = stats.level >= 10 ? Math.floor((stats.level - 5) / 5) : 0;
          if (hordeWave > lastHordeWaveRef.current) {
            lastHordeWaveRef.current = hordeWave;
            const hordeAngle = Math.random() * Math.PI * 2;
            const hordeDistance = Math.max(canvasDimensions.width, canvasDimensions.height) / 2 + 80;
            const anchor = {
              x: stats.playerX + Math.cos(hordeAngle) * hordeDistance,
              y: stats.playerY + Math.sin(hordeAngle) * hordeDistance,
            };
            const hordeSize = Math.min(50, hordeWave * 10);
            for (let i = 0; i < hordeSize; i++) {
              spawnEnemy(i % 7 === 0 && stats.level >= 10 ? 'reinforced' : 'swarm', anchor);
            }
            floatingTextsRef.current.push({
              x: stats.playerX,
              y: stats.playerY - 90,
              text: `⚠️ Lv.${stats.level} 대규모 군집 접근!`,
              color: '#fb7185',
              life: 0,
              maxLife: 120,
              isCritical: true,
            });
          }

          const bossTier = Math.floor(stats.level / 10);
          if (bossTier > lastBossTierRef.current) {
            lastBossTierRef.current = bossTier;
            floatingTextsRef.current.push({
              x: stats.playerX,
              y: stats.playerY - 120,
              text: `👹 Lv.${bossTier * 10} 보스 출현!`,
              color: '#f43f5e',
              life: 0,
              maxLife: 120,
              isCritical: true,
            });
            spawnEnemy('boss');
          }

          // 5. Automate Weapon Systems
          rebuildEnemyGrid();
          fireWeapons(now);

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

        if (bulletsRef.current.length > MAX_BULLETS) bulletsRef.current.splice(0, bulletsRef.current.length - MAX_BULLETS);
        if (particlesRef.current.length > MAX_PARTICLES) particlesRef.current.splice(0, particlesRef.current.length - MAX_PARTICLES);
        if (floatingTextsRef.current.length > MAX_FLOATING_TEXTS) floatingTextsRef.current.splice(0, floatingTextsRef.current.length - MAX_FLOATING_TEXTS);

        // 11. React UI HUD synchronization (reduced rate to optimize)
        statsSyncTimer += delta;
        if (statsSyncTimer >= 0.15) {
          statsSyncTimer = 0;
          setHudHp(Math.round(stats.hp));
          setHudTime(Math.floor(stats.time));
          setHudKills(stats.kills);
          setHudScore(Math.round(stats.score));
          setHudLevel(stats.level);
          setHudExp(stats.exp);
          setHudMaxExp(stats.maxExp);
          const dashRemainingMs = Math.max(0, stats.dashCooldown - (now - stats.lastDashTime));
          setHudDashReady(dashRemainingMs <= 0);
          setHudDashCooldown(dashRemainingMs / 1000);
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
  }, [canvasDimensions, isPaused, showLevelUp, isTouchActive]);

  // Weapon Firing Mechanism
  const fireWeapons = (now: number) => {
    const stats = gameStats.current;
    const lvls = weaponLevelsRef.current;
    const attackPowerLevel = lvls.attack_power || 0;
    const attackSpeedLevel = lvls.attack_speed || 0;
    const damageMultiplier = (1 + upgrades.damageLevel * 0.04) * (attackPowerLevel >= 5 ? 1.75 : 1 + attackPowerLevel * 0.08);
    const basicAttackSpeedMultiplier = attackSpeedLevel >= 5 ? 2 : 1 + attackSpeedLevel * 0.08;
    const [basicAttack, , skillAttack] = FIELD_BALANCE[stageId][difficulty];
    const levelAttackScale = 1 + 0.08 * Math.max(0, stats.level - 1);

    // Check if character/weapon is active
    // PENCIL Weapon
    if (lvls.pencil > 0) {
      // Cooldown reduces as weapon level increases
      const cooldown = Math.max(180, (800 - lvls.pencil * 80) / basicAttackSpeedMultiplier);
      if (now - lastFiredRef.current.pencil >= cooldown) {
        lastFiredRef.current.pencil = now;

        // Target the closest enemy
        const closest = getClosestEnemy(stats.playerX, stats.playerY);
        if (closest) {
          const angle = Math.atan2(closest.y - stats.playerY, closest.x - stats.playerX);
          
          // Shoot bullets based on level
          const count = lvls.pencil >= 5 ? 5 : lvls.pencil >= 4 ? 3 : lvls.pencil >= 2 ? 2 : 1;
          const pierce = lvls.pencil >= 5 ? 4 : lvls.pencil >= 3 ? 2 : 1;
          const ultimateMultiplier = lvls.pencil >= 5 ? 1.5 : 1;
          const damage = Math.round(basicAttack * levelAttackScale * (1 + (lvls.pencil - 1) * 0.15) * damageMultiplier * ultimateMultiplier);

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
      
      const bookCount = lvls.book >= 5 ? 7 : lvls.book >= 3 ? 3 : lvls.book >= 1 ? 2 : 1;
      const damage = Math.round(skillAttack * 0.45 * levelAttackScale * (1 + (lvls.book - 1) * 0.15) * damageMultiplier * (lvls.book >= 5 ? 1.6 : 1));

      // We do damage check in standard loop for books (collision with player surrounding radius)
      const bookRadius = 65 + lvls.book * 8;
      const bookSize = 12 + lvls.book * 2;

      for (let i = 0; i < bookCount; i++) {
        const offset = (Math.PI * 2 / bookCount) * i;
        const bx = stats.playerX + Math.cos(bookAngleRef.current + offset) * bookRadius;
        const by = stats.playerY + Math.sin(bookAngleRef.current + offset) * bookRadius;

        // Check collision with all enemies
        getNearbyEnemies(bx, by, 60).forEach((enemy) => {
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
      const cooldown = Math.max(500, 1500 - lvls.chalk * 150);
      if (now - lastFiredRef.current.chalk >= cooldown) {
        lastFiredRef.current.chalk = now;

        // Fire homing bullets at random enemies
        const count = lvls.chalk >= 5 ? 7 : lvls.chalk >= 4 ? 4 : lvls.chalk >= 2 ? 2 : 1;
        const damage = Math.round(skillAttack * levelAttackScale * (1 + (lvls.chalk - 1) * 0.15) * damageMultiplier * (lvls.chalk >= 5 ? 1.6 : 1));

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
      const cooldown = Math.max(2200, 5000 - lvls.mother * 500);
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
        const strikeCount = lvls.mother >= 5 ? 2 : 1;
        for (let strikeIndex = 0; strikeIndex < strikeCount; strikeIndex++) {
          strikesRef.current.push({
            x: targetX + (strikeIndex === 0 ? 0 : (Math.random() - 0.5) * 260),
            y: targetY + (strikeIndex === 0 ? 0 : (Math.random() - 0.5) * 260),
            radius: 80 + lvls.mother * 15,
            timer: 0.8,
            maxTimer: 0.8,
            triggered: false,
            type: 'mother',
          });
        }
      }
    }
  };

  const getClosestEnemy = (x: number, y: number): Enemy | null => {
    let minDist = Infinity;
    let closest: Enemy | null = null;
    getNearbyEnemies(x, y, 1000).forEach((enemy) => {
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
        const nearbyEnemies = getNearbyEnemies(b.x, b.y, 80);
        for (let j = nearbyEnemies.length - 1; j >= 0; j--) {
          const enemy = nearbyEnemies[j];
          if (enemy.hp <= 0) continue;
          const dist = Math.hypot(enemy.x - b.x, enemy.y - b.y);
          
          if (dist < enemy.radius + b.radius) {
            const skillName = b.type === 'pencil' ? '정밀 연필 발사' : '선도부 유도분필';
            dealDamageToEnemy(enemy, b.damage, skillName, b.x, b.y);

            // Explosive effect for homing chalk
            if (b.type === 'chalk') {
              const chalkLevel = weaponLevelsRef.current.chalk || 0;
              triggerAreaDamage(b.x, b.y, chalkLevel >= 5 ? 75 : 45, b.damage * (chalkLevel >= 5 ? 0.9 : 0.6), '선도부 유도분필');
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
        // Orbiting books intercept enemy bullets before they can reach the player.
        const stats = gameStats.current;
        const bookLevel = weaponLevelsRef.current.book || 0;
        if (bookLevel > 0) {
          const bookCount = bookLevel >= 5 ? 7 : bookLevel >= 3 ? 3 : 2;
          const bookRadius = 65 + bookLevel * 8;
          const bookSize = 12 + bookLevel * 2;
          let blocked = false;
          for (let bookIndex = 0; bookIndex < bookCount; bookIndex++) {
            const offset = (Math.PI * 2 / bookCount) * bookIndex;
            const bx = stats.playerX + Math.cos(bookAngleRef.current + offset) * bookRadius;
            const by = stats.playerY + Math.sin(bookAngleRef.current + offset) * bookRadius;
            if (Math.hypot(bx - b.x, by - b.y) < bookSize + b.radius) {
              blocked = true;
              for (let spark = 0; spark < 6; spark++) {
                particlesRef.current.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, radius: 2, color: '#4ade80', life: 0, maxLife: 18 });
              }
              break;
            }
          }
          if (blocked) {
            bullets.splice(i, 1);
            continue;
          }
        }

        // Enemy bullet colliding with Player
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
    const lvls = weaponLevelsRef.current;
    const damageMultiplier = (1 + upgrades.damageLevel * 0.04) * (1 + (lvls.attack_power || 0) * 0.08);

    for (let i = strikes.length - 1; i >= 0; i--) {
      const s = strikes[i];
      s.timer -= delta;

      if (s.timer <= 0 && !s.triggered) {
        s.triggered = true;

        // Strike impact damage
        const skillAttack = FIELD_BALANCE[stageId][difficulty][2];
        const levelAttackScale = 1 + 0.08 * Math.max(0, gameStats.current.level - 1);
        const baseDamage = skillAttack * levelAttackScale * (1 + (lvls.mother - 1) * 0.25) * damageMultiplier;
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
    [...enemiesRef.current].forEach((enemy) => {
      const dist = Math.hypot(enemy.x - x, enemy.y - y);
      if (dist < radius + enemy.radius) {
        dealDamageToEnemy(enemy, Math.round(damage), source, enemy.x, enemy.y);
      }
    });
  };

  // Damage calculation + Floating Text indicators
  const dealDamageToEnemy = (enemy: Enemy, baseDamage: number, source: string, hitX: number, hitY: number) => {
    // Critical strike chance
    const criticalLevel = weaponLevelsRef.current.critical_milk || 0;
    const critChance = criticalLevel >= 5 ? 0.5 : 0.1 + criticalLevel * 0.06;
    const isCritical = Math.random() < critChance;
    const finalDamage = Math.round(isCritical ? baseDamage * (criticalLevel >= 5 ? 2.3 : 1.8) : baseDamage);

    enemy.hp -= finalDamage;

    // Track damage breakdown
    damageDealtRef.current[source] = (damageDealtRef.current[source] || 0) + finalDamage;

    // Generate floating text
    if (isCritical || Math.random() < 0.3) {
      floatingTextsRef.current.push({
        x: hitX || enemy.x,
        y: (hitY || enemy.y) - 10,
        text: `${finalDamage}${isCritical ? '!' : ''}`,
        color: isCritical ? '#f97316' : '#f8fafc',
        life: 0,
        maxLife: isCritical ? 50 : 35,
        isCritical,
      });
    }

    // Spawn tiny splatters
    for (let i = 0; i < (isCritical ? 4 : 2); i++) {
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

    const baseScoreGained = enemy.scoreValue * SCORE_FIELD_WEIGHT[stageId] * SCORE_DIFFICULTY_WEIGHT[difficulty];
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

    let nearbyGem: Gem | undefined;
    for (let gemIndex = gemsRef.current.length - 1, checked = 0; gemIndex >= 0 && checked < 24; gemIndex--, checked++) {
      const candidate = gemsRef.current[gemIndex];
      if (candidate.kind === 'exp' && !candidate.isMagnetized && Math.hypot(candidate.x - enemy.x, candidate.y - enemy.y) < 42) {
        nearbyGem = candidate;
        break;
      }
    }
    if (nearbyGem) {
      nearbyGem.value += gemValue;
      nearbyGem.radius = Math.min(10, nearbyGem.radius + 0.25);
    } else if (gemsRef.current.length < MAX_GEMS) {
      gemsRef.current.push({ x: enemy.x, y: enemy.y, value: gemValue, radius: gemRadius, color: gemColor, kind: 'exp' });
    } else {
      const fallbackGem = gemsRef.current.find((gem) => gem.kind === 'exp');
      if (fallbackGem) fallbackGem.value += gemValue;
    }

    if (!enemy.isBoss) {
      const itemRoll = Math.random();
      const itemKind = itemRoll < 0.002 ? 'bomb' : itemRoll < 0.007 ? 'magnet' : null;
      if (itemKind) {
        gemsRef.current.push({
          x: enemy.x + (Math.random() - 0.5) * 24,
          y: enemy.y + (Math.random() - 0.5) * 24,
          value: 0,
          radius: 9,
          color: itemKind === 'magnet' ? '#f43f5e' : '#facc15',
          kind: itemKind,
        });
      }
    }

    // Explode sparks
    for (let i = 0; i < (enemy.isBoss ? 24 : 4); i++) {
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

    const baseDefense = FIELD_BALANCE[stageId][difficulty][1];
    const levelDefense = baseDefense + 0.5 * Math.max(0, stats.level - 1);
    const defenseReduction = levelDefense / (levelDefense + 100);
    const badgeReduction = Math.min(0.1, (weaponLevelsRef.current.clean_badge || 0) * 0.02);
    const finalAmount = Math.max(1, Math.round(amount * (1 - defenseReduction) * (1 - badgeReduction)));

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
        gems.splice(i, 1);
        triggerGemCollect(g);
        continue;
      }

      if (g.kind === 'exp' && (g.isMagnetized || dist < stats.magnetRange)) {
        const speed = g.isMagnetized ? Math.min(42, 14 + dist * 0.035) : (1 - dist / stats.magnetRange) * 12 + 2;
        g.x += (dx / dist) * speed * delta * 60;
        g.y += (dy / dist) * speed * delta * 60;
      }
    }
  };

  const triggerGemCollect = (gem: Gem) => {
    const stats = gameStats.current;
    const levelExpMultiplier = stats.level <= 5 ? 1 : stats.level <= 10 ? 0.72 : stats.level <= 15 ? 0.48 : stats.level <= 20 ? 0.3 : 0.18;
    let expGain = gem.kind === 'exp' ? Math.max(1, Math.round(gem.value * levelExpMultiplier)) : 0;

    if (gem.kind === 'magnet') {
      gemsRef.current.forEach((item) => {
        if (item.kind === 'exp') item.isMagnetized = true;
      });
    } else if (gem.kind === 'bomb') {
      const halfWidth = canvasDimensions.width / 2 + 60;
      const halfHeight = canvasDimensions.height / 2 + 60;
      for (let enemyIndex = enemiesRef.current.length - 1; enemyIndex >= 0; enemyIndex--) {
        const enemy = enemiesRef.current[enemyIndex];
        if (Math.abs(enemy.x - stats.playerX) > halfWidth || Math.abs(enemy.y - stats.playerY) > halfHeight) continue;
        if (enemy.isBoss) {
          const bombDamage = Math.max(100, Math.round(enemy.maxHp * 0.2));
          dealDamageToEnemy(enemy, bombDamage, '교내 정화 폭탄', enemy.x, enemy.y);
        } else {
          enemiesRef.current.splice(enemyIndex, 1);
          triggerEnemyDeath(enemy);
        }
      }
      floatingTextsRef.current.push({ x: stats.playerX, y: stats.playerY - 55, text: '💣 화면 정화!', color: '#facc15', life: 0, maxLife: 70, isCritical: true });
    }

    stats.exp += expGain;

    // Trigger score increase
    stats.score += expGain * 2;

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

    const availableChoices = LEVEL_UP_CHOICES.filter((item) => (weaponLevelsRef.current[item.id] || 0) < MAX_SKILL_LEVEL);
    if (availableChoices.length === 0) {
      gameStats.current.hp = Math.min(gameStats.current.maxHp, gameStats.current.hp + gameStats.current.maxHp * 0.2);
      setHudHp(Math.round(gameStats.current.hp));
      showLevelUpRef.current = false;
      return;
    }
    const shuffled = [...availableChoices].sort(() => 0.5 - Math.random());
    setLevelUpChoices(shuffled.slice(0, 3));
    setShowLevelUp(true);
  };

  const handleLevelUpChoice = (item: InGameItem) => {
    // Update weapon level
    setWeaponLevels((prev) => {
      const current = prev[item.id] || 0;
      const nextLvl = Math.min(MAX_SKILL_LEVEL, current + 1);
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
    if (item.id === 'move_speed') {
      const permanentSpeedBonus = 1 + upgrades.speedLevel * 0.02;
      const moveLevel = weaponLevelsRef.current.move_speed || 0;
      gameStats.current.speed = character.baseSpeed * permanentSpeedBonus * (moveLevel >= 5 ? 1.6 : 1 + moveLevel * 0.08);
    }
    if (item.id === 'dash_boost') {
      const dashLevel = weaponLevelsRef.current.dash_boost || 0;
      const permanentReduction = upgrades.dashLevel * 0.04;
      const skillReduction = dashLevel >= 5 ? 0.5 : dashLevel * 0.07;
      gameStats.current.dashCooldown = Math.max(900, 3000 * (1 - permanentReduction) * (1 - skillReduction));
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
    const isVisible = (x: number, y: number, margin = 80) => x >= cameraX - margin && x <= cameraX + canvas.width + margin && y >= cameraY - margin && y <= cameraY + canvas.height + margin;

    // Stage-specific clean school floors with a difficulty tint.
    const floorPalette = stageId === 'elementary'
      ? { top: '#164e63', bottom: '#082f49', tile: '#67e8f915', line: '#a5f3fc22' }
      : stageId === 'middle'
        ? { top: '#1e3a5f', bottom: '#111827', tile: '#93c5fd12', line: '#bfdbfe20' }
        : { top: '#3b1d52', bottom: '#170f2b', tile: '#e9d5ff12', line: '#f5d0fe20' };
    const difficultyTint = difficulty === '해골'
      ? 'rgba(127, 29, 29, 0.30)'
      : difficulty === '상'
        ? 'rgba(124, 45, 18, 0.18)'
        : difficulty === '중'
          ? 'rgba(113, 63, 18, 0.12)'
          : 'rgba(15, 23, 42, 0)';
    const floorGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    floorGradient.addColorStop(0, floorPalette.top);
    floorGradient.addColorStop(1, floorPalette.bottom);
    ctx.fillStyle = floorGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = difficultyTint;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = floorPalette.line;
    ctx.lineWidth = 1;
    const gridSize = 120;
    
    const startX = Math.floor(cameraX / gridSize) * gridSize;
    const startY = Math.floor(cameraY / gridSize) * gridSize;
    const endX = startX + canvas.width + gridSize;
    const endY = startY + canvas.height + gridSize;

    for (let x = startX; x < endX; x += gridSize) {
      for (let y = startY; y < endY; y += gridSize) {
        if (((x / gridSize) + (y / gridSize)) % 2 === 0) {
          ctx.fillStyle = floorPalette.tile;
          ctx.fillRect(x - cameraX, y - cameraY, gridSize, gridSize);
        }
      }
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
      if (!isVisible(s.x, s.y, s.radius)) return;
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

        // Layered jagged lightning bolts for a stronger mobile-readable impact.
        for (let bolt = 0; bolt < 3; bolt++) {
          ctx.beginPath();
          ctx.moveTo(s.x - cameraX + (bolt - 1) * 9, 0);
          const segments = 7;
          for (let segment = 1; segment <= segments; segment++) {
            const progress = segment / segments;
            const jitter = segment === segments ? 0 : (Math.random() - 0.5) * 30;
            ctx.lineTo(
              s.x - cameraX + (bolt - 1) * 9 + jitter,
              (s.y - cameraY) * progress,
            );
          }
          ctx.strokeStyle = bolt === 1 ? '#ffffff' : '#fde047';
          ctx.lineWidth = bolt === 1 ? 7 : 3;
          ctx.shadowBlur = 20;
          ctx.shadowColor = '#facc15';
          ctx.stroke();
        }
      }
      ctx.restore();
    });

    // 2. Draw Experience Prisms
    gemsRef.current.forEach((g) => {
      if (!isVisible(g.x, g.y, 30)) return;
      ctx.save();
      const gx = g.x - cameraX;
      const gy = g.y - cameraY;
      const prismSize = Math.max(18, g.radius * 3.2);
      ctx.translate(gx, gy);
      if (g.kind === 'exp') ctx.rotate(Math.sin(Date.now() / 350 + g.x * 0.01) * 0.18);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = g.kind === 'exp' ? 14 : 8;
      ctx.shadowColor = g.color;
      if (g.kind === 'magnet') {
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fillStyle = '#fff1f2';
        ctx.fill();
        ctx.strokeStyle = '#fb7185';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🧲', 0, 0);
      } else if (g.kind === 'bomb') {
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fillStyle = '#fefce8';
        ctx.fill();
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💣', 0, 0);
      } else if (expPrismImageRef.current) {
        ctx.drawImage(expPrismImageRef.current, -prismSize / 2, -prismSize / 2, prismSize, prismSize);
      } else {
        ctx.beginPath();
        ctx.moveTo(0, -prismSize / 2);
        ctx.lineTo(prismSize / 2, 0);
        ctx.lineTo(0, prismSize / 2);
        ctx.lineTo(-prismSize / 2, 0);
        ctx.closePath();
        ctx.fillStyle = g.color;
        ctx.fill();
      }
      ctx.restore();
    });

    // 3. Draw Enemies
    enemiesRef.current.forEach((e) => {
      if (!isVisible(e.x, e.y, e.radius + 20)) return;
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

    // 4. Draw Projectiles with weapon-specific neon silhouettes and trails.
    bulletsRef.current.forEach((b) => {
      if (!isVisible(b.x, b.y, 30)) return;
      ctx.save();
      const bx = b.x - cameraX;
      const by = b.y - cameraY;
      const angle = Math.atan2(b.vy, b.vx);
      ctx.translate(bx, by);
      ctx.rotate(angle);
      ctx.shadowBlur = b.type === 'chalk' ? 22 : 14;
      ctx.shadowColor = b.color;
      if (b.type === 'pencil') {
        ctx.strokeStyle = `${b.color}88`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-22, 0);
        ctx.lineTo(-5, 0);
        ctx.stroke();
        ctx.fillStyle = '#fde68a';
        ctx.fillRect(-7, -2.5, 13, 5);
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(5, -4);
        ctx.lineTo(5, 4);
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      } else if (b.type === 'chalk') {
        ctx.strokeStyle = `${b.color}99`;
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(-26, 0);
        ctx.lineTo(-4, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(0, -7);
        ctx.lineTo(-6, 0);
        ctx.lineTo(0, 7);
        ctx.closePath();
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = b.color;
        ctx.fill();
      }
      ctx.restore();
    });

    // 5. Draw ROTATING BOOKS ( 배리어 ) orbiting player
    const lvls = weaponLevelsRef.current;
    if (lvls.book > 0) {
      const bookCount = lvls.book >= 5 ? 7 : lvls.book >= 3 ? 3 : lvls.book >= 1 ? 2 : 1;
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

    const heroImage = heroImageRef.current;
    const playerScreenX = stats.playerX - cameraX;
    const playerScreenY = stats.playerY - cameraY;
    if (heroImage) {
      const heroIndex = character.id === 'haeun' ? 2 : character.id === 'minwoo' ? 1 : 0;
      const sourceWidth = heroImage.width / 3;
      const sourceHeight = heroImage.height / 4;
      const facingRow: Record<PlayerFacing, number> = {
        down: 0,
        left: 1,
        right: 2,
        up: 3,
      };
      const spriteSize = stats.isDashing ? 76 : 68;
      ctx.shadowBlur = stats.isDashing ? 28 : 16;
      ctx.shadowColor = character.imageColor;
      ctx.drawImage(
        heroImage,
        heroIndex * sourceWidth,
        facingRow[playerFacingRef.current] * sourceHeight,
        sourceWidth,
        sourceHeight,
        playerScreenX - spriteSize / 2,
        playerScreenY - spriteSize * 0.68,
        spriteSize,
        spriteSize,
      );
    } else {
      ctx.beginPath();
      ctx.arc(playerScreenX, playerScreenY, stats.playerRadius, 0, Math.PI * 2);
      ctx.fillStyle = character.imageColor;
      ctx.shadowBlur = 15;
      ctx.shadowColor = character.imageColor;
      ctx.fill();
    }

    ctx.restore();

    // 7. Draw Floating Text combat damage
    floatingTextsRef.current.forEach((t) => {
      if (!isVisible(t.x, t.y, 40)) return;
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
      if (!isVisible(p.x, p.y, 30)) return;
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
      const dashRemainingMs = Math.max(0, gameStats.current.dashCooldown - (Date.now() - gameStats.current.lastDashTime));
      const isDashReadyNow = dashRemainingMs <= 0;

      ctx.save();
      ctx.beginPath();
      ctx.arc(buttonX, buttonY, bRad, 0, Math.PI * 2);
      ctx.fillStyle = isDashReadyNow ? 'rgba(99, 102, 241, 0.35)' : 'rgba(30, 41, 59, 0.6)';
      ctx.strokeStyle = isDashReadyNow ? '#818cf8' : '#475569';
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = isDashReadyNow ? 12 : 0;
      ctx.shadowColor = '#818cf8';
      ctx.fill();
      ctx.stroke();

      // Dash symbol
      ctx.fillStyle = isDashReadyNow ? '#ffffff' : '#e0e7ff';
      ctx.font = 'black 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const dashProgress = dashRemainingMs / gameStats.current.dashCooldown;
      if (!isDashReadyNow) {
        ctx.beginPath();
        ctx.arc(buttonX, buttonY, bRad - 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * dashProgress);
        ctx.strokeStyle = '#a5b4fc';
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      ctx.fillText(isDashReadyNow ? 'DASH' : `${(dashRemainingMs / 1000).toFixed(1)}s`, buttonX, buttonY);
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
      <div className="absolute top-2 left-0 right-0 px-2 py-2 flex flex-col gap-2 z-30 select-none pointer-events-none">
        {/* UPPER HUD BAR */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 items-start w-full">
          {/* Leftside: Player HP / EXP Progress */}
          <div className="flex flex-col gap-1.5 w-full min-w-0">
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
          <div className="col-span-2 row-start-2 flex items-center justify-between gap-2 bg-slate-950/80 border border-slate-900 px-3 py-1.5 rounded-xl pointer-events-auto shadow-lg backdrop-blur">
            <span className="text-lg font-black text-cyan-400 font-mono tracking-wider select-text">
              <span className="block text-[8px] text-cyan-200 tracking-normal leading-none mb-0.5">선생님 도착까지</span>
              {formatTime(Math.max(0, gameStats.current.victoryTargetTime - hudTime))}
            </span>
            <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-semibold font-mono">
              <span className="text-cyan-300 text-xs font-black">LV.{hudLevel}</span>
              <span className="text-slate-700">|</span>
              <span>처치 {hudKills}</span>
              <span className="text-slate-700">|</span>
              <span className="text-yellow-300 text-xs font-black drop-shadow">{hudScore.toLocaleString()} PTS</span>
            </div>
          </div>

          {/* Rightside: Control Buttons (Pause, Fullscreen, Dash Cooldown Info) */}
          <div className="col-start-2 row-start-1 flex items-center gap-1.5 pointer-events-auto">
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
        <div className="flex gap-1.5 overflow-x-auto whitespace-nowrap pb-1 mobile-card-scroll">
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
              {hudDashReady ? 'READY' : `${hudDashCooldown.toFixed(1)}s`}
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
