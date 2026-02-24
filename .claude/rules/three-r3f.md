---
paths:
  - "src/components/viewer/**"
  - "src/hooks/use*Three*"
  - "src/hooks/use*URDF*"
---

# Three.js / React Three Fiber Rules

- Use declarative R3F `<mesh>`, `<group>` over imperative `new THREE.Mesh()`
- Always dispose geometries and materials in cleanup functions
- Use `useFrame` for per-frame updates, never `requestAnimationFrame` directly
- Keep the R3F `<Canvas>` component thin — delegate scene content to child components
- Use `drei` helpers (OrbitControls, Grid, Environment) instead of reimplementing
- Handle WebGL context loss with error boundaries
- Avoid creating new objects inside `useFrame` — cache with `useRef` or `useMemo`
