# Survivor 3D: Routine Guardians

Phaser 3 + React + TypeScript + Vite 기반 탑다운 서바이버 게임 프로토타입입니다.

## 실행

```bash
npm install
npm run dev
```

## Vercel 배포

Vercel에서 `cheonip-cyber/game` 저장소를 Import한 뒤 Framework Preset을 `Vite`로 선택하면 됩니다.

- Build Command: `npm run build`
- Output Directory: `dist`

## 구현 범위

- WASD 이동 / Space 대시
- 대각선 이동 Normalize
- 0.2초 대시 무적 / 3초 쿨타임
- 적 FSM: SPAWN, CHASE, WANDER, ATTACK, DIE
- 화면 밖 Camera Edge Spawn
- 3/6/9분 엘리트 스폰 기믹
- 10분 보스 스폰 및 2페이즈 패턴
- EXP / 레벨업 / 카드 선택 팝업
- 버건디+화이트 UI
- Phaser Graphics 기반 임시 에셋 생성
- LocalStorage 기반 Action Point 저장

## 주의

이 버전은 외부 이미지/사운드 없이 실행 가능한 프로토타입입니다. 실제 상용 수준으로 가려면 사운드 생성, 세부 스킬 8종, 적 충돌 회피, 모바일 조작 UI, Vercel KV 랭킹 API를 추가해야 합니다.
