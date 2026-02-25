import type { ReactNode } from 'react'
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
        <gridHelper args={[20, 20, '#444466', '#2a2a3e']} />
      )}
      {showAxes && <axesHelper args={[5]} />}
    </>
  )
}
