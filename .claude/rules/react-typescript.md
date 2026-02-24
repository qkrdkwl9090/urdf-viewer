---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---

# React + TypeScript Rules

- Functional components only, no class components
- `React.FC` 사용 금지 — props interface를 직접 타이핑
- Use `interface` for component props, `type` for unions
- No `any` types — use `unknown` + type guards if type is uncertain
- Explicit return types on all exported functions
- Use `const` for component definitions: `const Foo = () => { ... }`
- Prefer named exports over default exports (except App.tsx)
- Destructure props in function signature
- One component per file; file name matches component name (파일 1개 = 컴포넌트 1개)
- Keep components under 200 lines
- 설명이 필요한 로직에는 한글 주석 추가
- FSD 레이어 import 규칙: 상위 레이어는 하위 레이어만 import 가능
