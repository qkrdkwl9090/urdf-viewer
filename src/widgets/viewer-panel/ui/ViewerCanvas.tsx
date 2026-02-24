import { useMemo, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { useViewerStore } from '@entities/robot'
import {
  DEFAULT_CAMERA_FOV,
  DEFAULT_CAMERA_POSITION,
} from '@shared/constants'
import { SceneContent } from './SceneContent'
import styles from './ViewerCanvas.module.css'

/**
 * 3D 뷰포트 — R3F Canvas를 감싸는 최상위 컴포넌트
 * 컨테이너 크기에 맞춰 자동 리사이즈됨
 */
export function ViewerCanvas(): ReactNode {
  const backgroundColor = useViewerStore((s) => s.backgroundColor)

  // 카메라 초기 설정 — Canvas가 재마운트되지 않도록 memo 처리
  const cameraConfig = useMemo(
    () => ({
      fov: DEFAULT_CAMERA_FOV,
      position: [
        DEFAULT_CAMERA_POSITION[0],
        DEFAULT_CAMERA_POSITION[1],
        DEFAULT_CAMERA_POSITION[2],
      ] as [number, number, number],
      near: 0.01,
      far: 1000,
    }),
    [],
  )

  return (
    <div className={styles.canvasContainer}>
      <Canvas
        camera={cameraConfig}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.setClearColor(backgroundColor)
        }}
      >
        {/* 배경색을 R3F 씬에 반영 */}
        <color attach="background" args={[backgroundColor]} />
        <SceneContent />
      </Canvas>
    </div>
  )
}
