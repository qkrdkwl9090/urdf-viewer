import { useCallback } from 'react'
import { useRobotStore } from '@entities/robot'
import {
  processFiles,
  processDataTransferItems,
  readFileAsText,
  parseURDF,
  expandXacro,
} from '@shared/lib'
import type {
  FileMap,
  JointState,
  JointType,
  LinkState,
  URDFRobot,
} from '@shared/types'

/**
 * URDFRobot에서 조인트 상태를 추출한다.
 * fixed 타입은 사용자가 조작할 수 없으므로 제외한다.
 */
function extractJointStates(robot: URDFRobot): Map<string, JointState> {
  const joints = new Map<string, JointState>()

  for (const [name, joint] of Object.entries(robot.joints)) {
    if (joint.jointType === 'fixed') continue

    const state: JointState = {
      name,
      type: joint.jointType as JointType,
      value: joint.jointValue[0] ?? 0,
      min: joint.limit.lower,
      max: joint.limit.upper,
      axis: [joint.axis.x, joint.axis.y, joint.axis.z],
    }

    joints.set(name, state)
  }

  return joints
}

/**
 * URDFRobot에서 링크 상태를 추출한다.
 * 모든 링크는 초기에 visible: true로 설정된다.
 */
function extractLinkStates(robot: URDFRobot): Map<string, LinkState> {
  const links = new Map<string, LinkState>()

  for (const name of Object.keys(robot.links)) {
    links.set(name, { name, visible: true })
  }

  return links
}

/**
 * FileMap과 URDF 파일 객체를 받아 로봇을 파싱하고 스토어에 저장하는 내부 함수
 */
async function loadFromProcessed(
  fileMap: FileMap,
  urdfFileObject: File,
  setRobot: (
    name: string,
    robot: URDFRobot,
    joints: Map<string, JointState>,
    links: Map<string, LinkState>,
  ) => void,
): Promise<void> {
  let urdfContent = await readFileAsText(urdfFileObject)

  if (!urdfContent.trim()) {
    throw new Error('The URDF file is empty.')
  }

  // XACRO 파일인 경우 URDF로 확장
  const isXacro = urdfFileObject.name.toLowerCase().endsWith('.xacro')
  if (isXacro) {
    urdfContent = await expandXacro(urdfContent, fileMap)
  }

  // URDF 파싱 + 메시 로딩
  const robot = parseURDF(urdfContent, fileMap)

  // 조인트/링크 상태 추출
  const joints = extractJointStates(robot)
  const links = extractLinkStates(robot)

  // 스토어에 저장
  setRobot(robot.robotName || 'Unnamed Robot', robot, joints, links)
}

/**
 * 파일 업로드 -> URDF 파싱 -> 로봇 렌더링까지의 전체 파이프라인을 관리하는 훅
 */
export function useURDFLoader(): {
  loadRobot: (files: FileList | File[]) => Promise<void>
  loadRobotFromDrop: (items: DataTransferItemList) => Promise<void>
  clearRobot: () => void
} {
  const setRobot = useRobotStore((s) => s.setRobot)
  const setLoading = useRobotStore((s) => s.setLoading)
  const setError = useRobotStore((s) => s.setError)
  const clearRobot = useRobotStore((s) => s.clearRobot)

  /** FileList 또는 File[] 기반 로딩 (input[type=file]에서 사용) */
  const loadRobot = useCallback(
    async (files: FileList | File[]) => {
      setLoading(true)
      setError(null)

      try {
        const { fileMap, urdfFileObject } = await processFiles(files)

        if (!urdfFileObject) {
          throw new Error(
            'No URDF or XACRO file found. Please include a .urdf or .xacro file.',
          )
        }

        await loadFromProcessed(fileMap, urdfFileObject, setRobot)
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to load robot model'
        setError(message)
        console.error('URDF loading error:', err)
      }
    },
    [setRobot, setLoading, setError],
  )

  /** DataTransferItemList 기반 로딩 (드래그 앤 드롭에서 사용) */
  const loadRobotFromDrop = useCallback(
    async (items: DataTransferItemList) => {
      setLoading(true)
      setError(null)

      try {
        const { fileMap, urdfFileObject } =
          await processDataTransferItems(items)

        if (!urdfFileObject) {
          throw new Error(
            'No URDF or XACRO file found. Please include a .urdf or .xacro file.',
          )
        }

        await loadFromProcessed(fileMap, urdfFileObject, setRobot)
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to load robot model'
        setError(message)
        console.error('URDF loading error:', err)
      }
    },
    [setRobot, setLoading, setError],
  )

  return { loadRobot, loadRobotFromDrop, clearRobot }
}
