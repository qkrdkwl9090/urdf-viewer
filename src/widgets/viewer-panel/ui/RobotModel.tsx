import { useEffect, useLayoutEffect, useCallback, useRef, type ReactNode } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import { Box3, Vector3, Mesh, MeshStandardMaterial, MeshPhongMaterial, Color } from 'three'
import type { Object3D, Material } from 'three'
import { useRobotStore, useViewerStore, useUIStore } from '@entities/robot'
import type { URDFRobot, URDFLink } from '@shared/types'

const HIGHLIGHT_COLOR = new Color(0x3b82f6)
const HIGHLIGHT_INTENSITY = 0.35

function useGeometryVisibilitySync(robot: URDFRobot | null): void {
  const showVisualGeometry = useViewerStore((s) => s.showVisualGeometry)
  const showCollisionGeometry = useViewerStore((s) => s.showCollisionGeometry)
  const { invalidate } = useThree()

  useLayoutEffect(() => {
    if (!robot) return

    robot.traverse((object) => {
      if ('isURDFVisual' in object && object.isURDFVisual) {
        object.visible = showVisualGeometry
      } else if ('isURDFCollider' in object && object.isURDFCollider) {
        object.visible = showCollisionGeometry
      }
    })
    invalidate()
  }, [robot, showVisualGeometry, showCollisionGeometry, invalidate])
}

/**
 * 카메라를 로봇의 바운딩 박스에 맞춰 자동 위치시키는 함수를 반환한다.
 * 로봇 로드 시와 카메라 리셋 요청 시 모두 사용된다.
 */
function useAutoFrame(robot: URDFRobot | null): () => void {
  const { camera } = useThree()

  const frameCamera = useCallback(() => {
    if (!robot) return

    // 바운딩 박스 계산
    const box = new Box3()
    robot.updateWorldMatrix(true, false)
    robot.traverseVisible((object) => {
      if (object instanceof Mesh) box.expandByObject(object)
    })

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
 * urdf-loader의 각 조인트 객체에 ignoreLimits 플래그를 동기화한다.
 * 이 플래그가 true이면 setJointValue 내부 클램핑이 비활성화된다.
 */
function useIgnoreLimitsSync(robot: URDFRobot | null): void {
  const ignoreLimits = useUIStore((s) => s.ignoreLimits)

  useEffect(() => {
    if (!robot) return

    for (const joint of Object.values(robot.joints)) {
      (joint as unknown as { ignoreLimits: boolean }).ignoreLimits = ignoreLimits
    }
  }, [robot, ignoreLimits])
}

/** 클릭된 메시에서 부모 URDFLink를 찾아 올라간다 */
function findParentLink(obj: Object3D): URDFLink | null {
  let current: Object3D | null = obj
  let link: URDFLink | null = null
  while (current) {
    if (!current.visible) return null
    if (!link && 'isURDFLink' in current && current.isURDFLink) {
      link = current as URDFLink
    }
    current = current.parent
  }
  return link
}

interface MaterialBackup {
  mesh: Mesh
  original: Material | Material[]
}

/**
 * 선택된 링크/조인트의 메시에 emissive glow를 적용한다.
 * 머티리얼을 clone해 원본을 보호하고, 선택 해제 시 복원한다.
 */
function useSelectionHighlight(robot: URDFRobot | null): void {
  const selectedItem = useUIStore((s) => s.selectedItem)
  const { invalidate } = useThree()
  const backupsRef = useRef<MaterialBackup[]>([])

  useEffect(() => {
    // 이전 하이라이트 복원
    for (const backup of backupsRef.current) {
      backup.mesh.material = backup.original
    }
    backupsRef.current = []

    if (!robot || !selectedItem) {
      invalidate()
      return
    }

    // 선택된 항목의 Object3D 찾기
    let targetObj: Object3D | undefined
    if (selectedItem.kind === 'link') {
      targetObj = robot.links[selectedItem.name]
    } else {
      // 조인트 선택 시 자식 링크를 하이라이트
      const joint = robot.joints[selectedItem.name]
      if (joint) {
        const childLink = joint.children.find(
          (c) => 'isURDFLink' in c && (c as unknown as { isURDFLink: boolean }).isURDFLink,
        )
        targetObj = childLink
      }
    }

    if (!targetObj) {
      invalidate()
      return
    }

    // 모든 자식 Mesh에 emissive glow 적용
    const backups: MaterialBackup[] = []
    targetObj.traverse((child) => {
      if (!(child instanceof Mesh) || !child.material) return

      backups.push({ mesh: child, original: child.material })

      if (Array.isArray(child.material)) {
        child.material = child.material.map((mat) => {
          const cloned = mat.clone()
          if (cloned instanceof MeshStandardMaterial || cloned instanceof MeshPhongMaterial) {
            cloned.emissive = HIGHLIGHT_COLOR
            cloned.emissiveIntensity = HIGHLIGHT_INTENSITY
          }
          return cloned
        })
      } else {
        const cloned = child.material.clone()
        if (cloned instanceof MeshStandardMaterial || cloned instanceof MeshPhongMaterial) {
          cloned.emissive = HIGHLIGHT_COLOR
          cloned.emissiveIntensity = HIGHLIGHT_INTENSITY
        }
        child.material = cloned
      }
    })

    backupsRef.current = backups
    invalidate()
  }, [robot, selectedItem, invalidate])
}

/**
 * URDFRobot을 R3F 씬에 렌더링하는 컴포넌트.
 * urdf-loader의 URDFRobot은 Three.js Object3D를 상속하므로
 * primitive 요소로 직접 씬에 추가한다.
 */
export function RobotModel(): ReactNode {
  const robot = useRobotStore((s) => s.robot)
  const selectItem = useUIStore((s) => s.selectItem)

  useGeometryVisibilitySync(robot)

  // 링크 가시성 동기화
  useLinkVisibilitySync(robot)

  // 로봇 로드 시 카메라 자동 프레이밍
  const frameCamera = useAutoFrame(robot)

  // 카메라 리셋 요청 처리
  useCameraReset(frameCamera)

  // 조인트 리밋 무시 플래그 동기화
  useIgnoreLimitsSync(robot)

  // 선택 하이라이트 동기화
  useSelectionHighlight(robot)

  // 3D 메시 클릭 → 부모 링크 선택
  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      const link = findParentLink(event.object)
      if (link) {
        event.stopPropagation()
        selectItem({ name: link.urdfName, kind: 'link' })
        // 조인트 탭으로 전환 + 패널 열기
        const { setActiveTab, openPanel } = useUIStore.getState()
        setActiveTab('joints')
        openPanel()
      }
    },
    [selectItem],
  )

  if (!robot) return null

  // URDF/ROS는 Z-up, Three.js는 Y-up이므로 X축 -90도 회전
  return <primitive object={robot} rotation={[-Math.PI / 2, 0, 0]} onClick={handleClick} />
}
