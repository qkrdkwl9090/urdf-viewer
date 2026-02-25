import { useEffect, useCallback, type ReactNode } from 'react'
import { useThree } from '@react-three/fiber'
import { Box3, Vector3 } from 'three'
import { useRobotStore, useViewerStore } from '@entities/robot'
import type { URDFRobot } from '@shared/types'

/**
 * 카메라를 로봇의 바운딩 박스에 맞춰 자동 위치시키는 함수를 반환한다.
 * 로봇 로드 시와 카메라 리셋 요청 시 모두 사용된다.
 */
function useAutoFrame(robot: URDFRobot | null): () => void {
  const { camera } = useThree()

  const frameCamera = useCallback(() => {
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

  // 로봇 로드 시 자동 프레이밍
  useEffect(() => {
    frameCamera()
  }, [frameCamera])

  return frameCamera
}

/**
 * 카메라 리셋 요청을 감지해 자동 프레이밍을 다시 실행한다.
 */
function useCameraReset(frameCamera: () => void): void {
  const shouldResetCamera = useViewerStore((s) => s.shouldResetCamera)
  const clearCameraReset = useViewerStore((s) => s.clearCameraReset)

  useEffect(() => {
    if (!shouldResetCamera) return

    frameCamera()
    clearCameraReset()
  }, [shouldResetCamera, frameCamera, clearCameraReset])
}

/**
 * 링크 가시성 상태를 실제 Three.js 오브젝트에 동기화한다.
 * store의 links Map이 변경되면 각 링크의 Object3D.visible을 갱신한다.
 */
function useLinkVisibilitySync(robot: URDFRobot | null): void {
  const links = useRobotStore((s) => s.links)
  const { invalidate } = useThree()

  useEffect(() => {
    if (!robot) return

    for (const [name, state] of links) {
      const linkObj = robot.links[name]
      if (linkObj) {
        linkObj.visible = state.visible
      }
    }
    // Three.js 씬 갱신 요청 (frameloop="demand" 대비)
    invalidate()
  }, [robot, links, invalidate])
}

/**
 * URDFRobot을 R3F 씬에 렌더링하는 컴포넌트.
 * urdf-loader의 URDFRobot은 Three.js Object3D를 상속하므로
 * primitive 요소로 직접 씬에 추가한다.
 */
export function RobotModel(): ReactNode {
  const robot = useRobotStore((s) => s.robot)

  // 로봇 로드 시 카메라 자동 프레이밍
  const frameCamera = useAutoFrame(robot)

  // 카메라 리셋 요청 처리
  useCameraReset(frameCamera)

  // 링크 가시성 동기화
  useLinkVisibilitySync(robot)

  if (!robot) return null

  // URDF/ROS는 Z-up, Three.js는 Y-up이므로 X축 -90도 회전
  return <primitive object={robot} rotation={[-Math.PI / 2, 0, 0]} />
}
