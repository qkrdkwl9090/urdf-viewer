<p align="center">
  <img src="public/banner.svg" alt="URDF Viewer" width="800" />
</p>

<p align="center">
  A browser-based URDF viewer for visualizing and interacting with robot models.<br/>
  No installation required — just upload and view.
</p>

<p align="center">
  <a href="https://urdf-viewer-pi.vercel.app/"><strong>https://urdf-viewer-pi.vercel.app</strong></a>
</p>

## Features

- **URDF & XACRO** — Upload `.urdf` and `.xacro` files with full macro expansion
- **Mesh Support** — STL and DAE mesh file loading
- **Real-time Joint Control** — Slider controls for all movable joints with live 3D feedback
- **3D Viewport** — Orbit, pan, and zoom with mouse controls
- **Viewer Settings** — Toggle grid, axes helpers, and reset camera/joints
- **Drag & Drop** — Drop files directly onto the browser to load

## Tech Stack

- React 19, TypeScript, Vite
- Three.js + @react-three/fiber + @react-three/drei
- urdf-loader (NASA JPL) + xacro-parser
- Zustand for state management

## Getting Started

```bash
# Install dependencies
bun install

# Start dev server
bun run dev

# Build for production
bun run build
```

## Project Structure

```
src/
  app/          — App initialization, global styles
  shared/       — Reusable UI primitives, utilities, types
  entities/     — Business entities (robot model, store)
  features/     — User interaction features (upload, joint control, settings)
  widgets/      — Composed UI blocks (viewer panel, parameter panel, header)
  pages/        — Page-level layout
```

Follows [Feature-Sliced Design](https://feature-sliced.design/) architecture.

## License

MIT
