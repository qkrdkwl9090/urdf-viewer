import type { ReactNode } from 'react'
import { Grid } from '@react-three/drei'
import { useViewerStore } from '@entities/robot'

/**
 * 3D 씬 보조 요소 — 그리드와 축 헬퍼
 * useViewerStore에서 토글 상태를 읽어 조건부 렌더링
 */
export function SceneHelpers(): ReactNode {
  const showGrid = useViewerStore((s) => s.showGrid)
  const showAxes = useViewerStore((s) => s.showAxes)

  return (
    <>
      {showGrid && (
        <Grid
          args={[20, 20]}
          cellSize={0.5}
          sectionSize={1}
          cellColor="#1a1a2e"
          sectionColor="#2a2a3e"
          fadeDistance={25}
          infiniteGrid
        />
      )}
      {showAxes && <axesHelper args={[1]} />}
    </>
  )
}
