# URDF Viewer

Online URDF (Unified Robot Description Format) viewer that allows users to upload URDF, XACRO, STL, and DAE files to visualize and interact with robot models in the browser.

## Product Vision

A zero-setup, browser-based tool for robotics engineers to instantly visualize robot models. Upload files → see the robot → manipulate joints and parameters in real-time. Think "online CAD viewer" specifically optimized for URDF robots.

## Tech Stack

- **Framework**: React 19 + TypeScript (strict mode)
- **Build**: Vite 7, Bun as package manager
- **3D Rendering**: Three.js + @react-three/fiber + @react-three/drei
- **URDF Parsing**: urdf-loader (by NASA JPL)
- **XACRO Support**: xacro-parser
- **State Management**: Zustand
- **Icons**: Lucide React
- **Linting**: ESLint

## Commands

- `bun run dev` — Start dev server
- `bun run build` — Type-check and build for production
- `bun run lint` — Run ESLint
- `bun run preview` — Preview production build

## Architecture: Feature-Sliced Design (FSD)

```
src/
  app/                        — App 초기화, 프로바이더, 글로벌 스타일
    App.tsx
    main.tsx
    index.css                 — CSS custom properties, reset, 글로벌 스타일

  shared/                     — 프로젝트 전체에서 공유되는 코드 (비즈니스 로직 없음)
    ui/                       — 재사용 UI 프리미티브 (Slider, Toggle, Panel, Button, Tooltip)
    lib/                      — 유틸리티 함수, 헬퍼
    types/                    — 공통 타입 정의
    constants/                — 앱 전역 상수

  entities/                   — 비즈니스 엔티티 (데이터 모델 + 관련 UI)
    robot/                    — 로봇 모델 상태, 타입, 기본 UI
      model/                  — Zustand store, 타입 정의
      ui/                     — 로봇 관련 기본 UI 컴포넌트

  features/                   — 사용자 인터랙션 단위 기능
    upload-robot/             — URDF/XACRO 파일 업로드 + 파싱
    joint-control/            — 조인트 슬라이더 제어
    viewer-settings/          — 그리드/축 토글, 카메라 리셋

  widgets/                    — 독립적인 UI 블록 (feature + entity 조합)
    viewer-panel/             — 3D 뷰포트 (Canvas, Controls, Helpers)
    parameter-panel/          — 우측 파라미터 패널
    header/                   — 상단 헤더 바

  pages/                      — 페이지 단위 (라우팅 엔트리)
    viewer/                   — 메인 뷰어 페이지 (레이아웃 조합)
```

### FSD 레이어 규칙
- **상위 레이어는 하위 레이어만 import** 가능: pages → widgets → features → entities → shared
- **같은 레이어 간 cross-import 금지** (features 끼리 직접 참조 불가)
- 각 슬라이스는 `index.ts`로 public API를 노출

## Key Features

### 3D Viewport (center)
- Render loaded URDF robot model with full mesh support (STL, DAE)
- OrbitControls for camera manipulation (rotate, pan, zoom)
- Optional AxesHelper and GridHelper (user-toggleable)
- Responsive to window resizing

### Parameter Panel (right, fixed ~320-360px)
- Display all joints from URDF with type, limits (min/max), current value
- Slider + numeric input for each controllable joint
- Real-time 3D update on parameter change
- Accordion sections grouped by joint/link hierarchy
- Mesh visibility toggles per link
- Collapsible panel

### File Upload (top bar)
- Drag-and-drop or click-to-upload for URDF/XACRO + mesh files
- Support uploading a folder or zip containing all assets
- Error feedback for malformed files

### Viewer Settings
- Toggle AxesHelper, GridHelper
- Background color options
- Reset camera / Reset joints buttons

## Design System

- **Theme**: Dark-first (#0a0a0b base)
- **Accent**: Electric blue (#3b82f6)
- **Typography**: System font stack, monospace for values
- **Spacing**: 4px grid
- **Borders**: Subtle (#2a2a2e), 6-8px radius
- **Transitions**: 150-200ms ease-out
- **Style**: Modern 2025-26 — subtle glass morphism, micro-interactions, layered surfaces

## Conventions

- TypeScript strict mode, no `any`, `unknown` + type guard 사용
- `React.FC` 사용 금지 — 일반 함수 컴포넌트로 작성
- 파일 1개 = 컴포넌트 1개 (파일명 = 컴포넌트명)
- Functional components with hooks only
- Components under 200 lines
- 설명이 필요한 로직에는 한글 주석 추가
- English for all user-facing text
- Tooltips for engineering terms
- Semantic commit messages (feat:, fix:, chore:, refactor:, docs:)
- Dark theme CSS custom properties in index.css
- FSD 레이어 import 규칙 준수 (상위 → 하위만 가능)

## Workflow

This project follows a 3-phase workflow using custom agents:
1. **Planning** (`planner` agent) — Feature specs, user stories, UX flow
2. **Design** (`designer` agent) — Visual specs, component design, layout
3. **Development** (`developer` agent) — Implementation, testing, build verification
