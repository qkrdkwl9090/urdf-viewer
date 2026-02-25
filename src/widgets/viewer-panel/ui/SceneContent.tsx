import type { ReactNode } from 'react'
import { OrbitControls, GizmoHelper, GizmoViewcube } from '@react-three/drei'
import { SceneHelpers } from './SceneHelpers'
import { RobotModel } from './RobotModel'

/**
 * 3D 씬의 조명, 컨트롤, 헬퍼, 로봇 모델을 구성하는 컴포넌트.
 * Canvas 내부에서만 렌더링되어야 함.
 */
export function SceneContent(): ReactNode {
  return (
    <>
      {/* 카메라 컨트롤 -- 감쇠(damping) 활성화로 부드러운 조작 */}
      <OrbitControls enableDamping dampingFactor={0.1} makeDefault />

      {/* 방향 큐브 — 우측 상단에 XYZ 방향 표시, 클릭 시 해당 뷰로 전환 */}
      <GizmoHelper alignment="top-right" margin={[64, 64]}>
        <GizmoViewcube
          color="#2a2a2e"
          textColor="white"
          strokeColor="#555"
          opacity={1}
          hoverColor="#3b82f6"
        />
      </GizmoHelper>

      {/* 조명 설정 */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />
      {/* 반구 조명 -- 하늘/지면 색으로 자연스러운 채움 효과 */}
      <hemisphereLight
        color="#b1e1ff"
        groundColor="#b97a20"
        intensity={0.3}
      />

      {/* 그리드/축 헬퍼 */}
      <SceneHelpers />

      {/* URDF 로봇 모델 */}
      <RobotModel />
    </>
  )
}
