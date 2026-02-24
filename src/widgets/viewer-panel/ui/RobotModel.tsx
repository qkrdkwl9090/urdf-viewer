import { useEffect, type ReactNode } from 'react'
import { useThree } from '@react-three/fiber'
import { Box3, Vector3 } from 'three'
import { useRobotStore } from '@entities/robot'
import type { URDFRobot } from '@shared/types'

/**
 * 로봇 모델이 로드된 후 카메라를 바운딩 박스에 맞춰 자동 위치시킨다.
 */
function useAutoFrame(robot: URDFRobot | null): void {
  const { camera } = useThree()

  useEffect(() => {
    if (!robot) return

    // 바운딩 박스 계산
    const box = new Box3().setFromObject(robot)

    // 빈 바운딩 박스 방어 (메시가 없는 경우)
    if (box.isEmpty()) return

    const center = new Vector3()
    box.getCenter(center)
    const size = new Vector3()
    box.getSize(size)

    const maxDim = Math.max(size.x, size.y, size.z)
    // 최소 거리 보장 (매우 작은 로봇 대비)
    const distance = Math.max(maxDim * 2, 0.5)

    camera.position.set(
      center.x + distance * 0.7,
      center.y + distance * 0.5,
      center.z + distance * 0.7,
    )
    camera.lookAt(center)
    camera.updateProjectionMatrix()
  }, [robot, camera])
}

/**
 * URDFRobot을 R3F 씬에 렌더링하는 컴포넌트.
 * urdf-loader의 URDFRobot은 Three.js Object3D를 상속하므로
 * primitive 요소로 직접 씬에 추가한다.
 */
export function RobotModel(): ReactNode {
  const robot = useRobotStore((s) => s.robot)

  // 로봇 로드 시 카메라 자동 프레이밍
  useAutoFrame(robot)

  if (!robot) return null

  return <primitive object={robot} />
}
