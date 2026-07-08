import { Character, Stage, Difficulty, InGameItem } from './types';

export const CHARACTERS: Character[] = [
  {
    id: 'chris',
    name: '크리스',
    title: '성실한 모범생',
    description: '공부와 운동 모두 놓치지 않는 정석형 학생. 학습 능력이 뛰어나 아이템 획득 범위가 넓고 이동 속도가 빠릅니다.',
    unlockScore: 0,
    baseHp: 100,
    baseSpeed: 4.2,
    baseDamage: 12,
    baseMagnet: 70,
    specialSkill: '정밀 연필 연사',
    specialSkillDesc: '가장 가까운 적에게 빠른 속도로 뾰족한 연필을 투척합니다.',
    imageColor: '#38bdf8', // sky-400
    weaponId: 'pencil',
  },
  {
    id: 'minwoo',
    name: '민우',
    title: '강인한 반장',
    description: '의리가 넘치는 듬직한 반장. 불량학생의 공격에도 쉽게 흔들리지 않는 맷집과 수호력을 가졌습니다.',
    unlockScore: 15000,
    baseHp: 150,
    baseSpeed: 3.5,
    baseDamage: 15,
    baseMagnet: 60,
    specialSkill: '방패용 회전 자물쇠 책',
    specialSkillDesc: '자신 주위를 든든히 회전하며 다가오는 적들을 밀쳐내는 두꺼운 교과서를 소환합니다.',
    imageColor: '#4ade80', // green-400
    weaponId: 'book',
  },
  {
    id: 'haeun',
    name: '하은',
    title: '선도부 부장',
    description: '규율과 정의의 화신. 매우 공격적이고 민첩하며, 유도 성질을 가진 단단한 백분필 미사일을 난사합니다.',
    unlockScore: 50000,
    baseHp: 80,
    baseSpeed: 4.8,
    baseDamage: 22,
    baseMagnet: 80,
    specialSkill: '선도부 유도 분필',
    specialSkillDesc: '주변의 다수 적들을 정밀 조준해 유도 분필 탄환을 고속 사격합니다.',
    imageColor: '#f43f5e', // rose-500
    weaponId: 'chalk',
  },
];

export const STAGES: Stage[] = [
  {
    id: 'elementary',
    name: '초등학교 구역',
    description: '초등학생 일진과 급식 유해 환경이 잠식한 구역. 적들의 움직임이 비교적 단순하고 체력이 낮습니다.',
    multiplier: 1.0,
  },
  {
    id: 'middle',
    name: '중학교 구역',
    description: '중학생 허세 충만 블래스터와 중2병 스웜이 득실거리는 구역. 난이도가 급상승합니다.',
    multiplier: 1.8,
  },
  {
    id: 'high',
    name: '고등학교 구역',
    description: '무자비한 고3 입시 스트레스 스트라이커와 거대 보스 몹들이 상주하는 최종 위험 구역.',
    multiplier: 3.0,
  },
];

export const DIFFICULTIES: { id: Difficulty; label: string; multiplier: number; color: string }[] = [
  { id: '하', label: '하 (x1)', multiplier: 1.0, color: 'text-green-400 bg-green-950/40 border-green-800' },
  { id: '중', label: '중 (x2)', multiplier: 2.0, color: 'text-yellow-400 bg-yellow-950/40 border-yellow-800' },
  { id: '상', label: '상 (x4)', multiplier: 4.0, color: 'text-orange-400 bg-orange-950/40 border-orange-800' },
  { id: '해골', label: '해골 (x8)', multiplier: 8.0, color: 'text-red-500 bg-red-950/40 border-red-900 animate-pulse' },
];

export const LEVEL_UP_CHOICES: InGameItem[] = [
  {
    id: 'pencil',
    name: '정밀 연필 발사',
    description: '플레이어 방향 또는 가까운 적에게 뾰족하게 깎은 연필을 던져 피해를 줍니다.',
    effect: '투사체 개수 +1, 관통력 부여, 데미지 +15%',
    rarity: '일반',
    color: '#38bdf8',
  },
  {
    id: 'book',
    name: '철벽의 회전책',
    description: '플레이어 주변을 일정한 궤도로 회전하며 적들을 가격하고 밀쳐내는 학급 교과서입니다.',
    effect: '회전책 개수 +1, 회전 속도 +20%, 크기 +15%',
    rarity: '희귀',
    color: '#4ade80',
  },
  {
    id: 'chalk',
    name: '선도부 유도분필',
    description: '적을 자동으로 추적하여 폭발하는 눈부신 선도부 전용 백분필 유도 미사일입니다.',
    effect: '유도탄 개수 +1, 폭발 반경 +20%, 데미지 +10%',
    rarity: '희귀',
    color: '#f43f5e',
  },
  {
    id: 'mother',
    name: '엄마 소환 번개',
    description: '일정 시간마다 거대한 엄마의 잔상이 구름을 가르고 나타나 하늘에서 번개를 내리꽂아 화면을 쓸어버립니다.',
    effect: '엄마의 격노 쿨타임 -1.5초, 번개 범위 +30%, 기절 효과 부여',
    rarity: '전설',
    color: '#eab308', // yellow-500
  },
  {
    id: 'vitamin',
    name: '종합 비타민 보충',
    description: '급속 비타민 피로회복제. 체력을 가득 회복하고 최대 체력 한도를 영구적으로 높입니다.',
    effect: '최대 체력 +25 & 즉시 체력 40 회복',
    rarity: '일반',
    color: '#a855f7', // purple-500
  },
  {
    id: 'dash_boost',
    name: '초고속 체육복 대시',
    description: '바람을 가르는 체육 교복 대시! 대시의 쿨다운을 획기적으로 줄여 기동력을 극대화합니다.',
    effect: '대시 쿨다운 -20%, 대시 시 0.2초간 무적 시간 추가',
    rarity: '희귀',
    color: '#06b6d4', // cyan-500
  },
  {
    id: 'critical_milk',
    name: '고칼슘 급식 우유',
    description: '뼈를 튼튼하게 만들어 뼈 때리는 크리티컬 타격 확률과 데미지를 대폭 올립니다.',
    effect: '치명타 확률 +15% 및 치명타 피해량 +30%',
    rarity: '일반',
    color: '#f97316', // orange-500
  },
  {
    id: 'clean_badge',
    name: '모범생 수호 배지',
    description: '가슴에 빛나는 녹색 모범생 배지. 받는 모든 종류의 피해를 줄이고 불량 기운을 정화합니다.',
    effect: '받는 피해량 15% 영구 감소 및 체력 회복력 +0.5/초',
    rarity: '전설',
    color: '#10b981', // emerald-500
  },
];

export const CHALLENGES: string[] = [
  "초등학교 구역에서 대시를 쓰지 않고 5분 생존하기!",
  "중학교 구역에서 레벨 15 이상 달성하고 무사히 생존하기!",
  "엄마 소환 번개를 전설 레벨(3레벨 이상)까지 올려 적들을 참회시키기!",
  "한 판에서 불량학생 700명 이상 처치하고 명예 훈장 획득하기!",
  "고등학교 구역에서 해골 난이도로 3분간 극한 서바이벌 버티기!",
];
