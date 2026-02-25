import { useCallback } from 'react'
import { useRobotStore } from '@entities/robot'
import {
  processFiles,
  processDataTransferItems,
  readFileAsText,
  parseURDF,
  expandXacro,
  extractMeshReferences,
  extractXacroIncludes,
} from '@shared/lib'
import type {
  FileMap,
  JointState,
  JointType,
  LinkState,
  URDFRobot,
  UploadedFileInfo,
} from '@shared/types'

/** URDF/XACRO 확장자 판별용 */
const URDF_EXTENSIONS = ['.urdf', '.xacro'] as const

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
 * File 배열에서 UploadedFileInfo 목록을 생성한다.
 */
function buildUploadedFileInfos(
  files: File[],
  fileMap: FileMap,
): UploadedFileInfo[] {
  return files.map((file) => {
    const path = file.webkitRelativePath || file.name
    const lowerPath = path.toLowerCase()
    const isRobotDescription = URDF_EXTENSIONS.some((ext) =>
      lowerPath.endsWith(ext),
    )
    return {
      path,
      blobUrl: fileMap.get(path) ?? '',
      size: file.size,
      isRobotDescription,
    }
  })
}

/**
 * URDF/XACRO 파일의 텍스트 내용을 읽는다.
 * XACRO 확장은 수행하지 않고 원본 텍스트만 반환한다.
 */
async function readUrdfContent(urdfFile: File): Promise<string> {
  const content = await readFileAsText(urdfFile)
  if (!content.trim()) {
    throw new Error('The URDF file is empty.')
  }
  return content
}

interface UseURDFLoaderReturn {
  /** Step 1: URDF/XACRO 파일 파싱 (로봇 미생성). 모든 메시 해석 시 true 반환 */
  parseUrdfFile: (files: FileList | File[]) => Promise<boolean>
  /** Step 1 (드래그 앤 드롭): DataTransferItem에서 URDF 파싱 */
  parseUrdfFromDrop: (items: DataTransferItemList) => Promise<boolean>
  /** Step 2: 메시 파일 추가 후 참조 재평가. 모든 메시 해석 시 true 반환 */
  addMeshFiles: (files: FileList | File[]) => Promise<boolean>
  /** Step 2 (드래그 앤 드롭): 폴더에서 메시 파일 추가 */
  addMeshFilesFromDrop: (items: DataTransferItemList) => Promise<boolean>
  /** 파싱된 URDF + 현재 fileMap으로 로봇 모델 생성 */
  buildRobot: () => void
  /** 전체 초기화 */
  clearRobot: () => void
}

/**
 * 2단계 업로드 위자드를 지원하는 파일 업로드/파싱 훅.
 * Step 1에서 URDF를 파싱하고, Step 2에서 메시를 추가한 뒤,
 * buildRobot으로 최종 로봇 모델을 생성한다.
 *
 * XACRO 파일의 경우 include 의존성을 프리스캔하여,
 * 미해석 include가 있으면 위자드 Step 2에서 추가 파일을 요청한다.
 */
export function useURDFLoader(): UseURDFLoaderReturn {
  const setRobot = useRobotStore((s) => s.setRobot)
  const setLoading = useRobotStore((s) => s.setLoading)
  const setError = useRobotStore((s) => s.setError)
  const clearRobotAction = useRobotStore((s) => s.clearRobot)
  const setFileData = useRobotStore((s) => s.setFileData)
  const mergeFileMap = useRobotStore((s) => s.mergeFileMap)
  const setMeshReferences = useRobotStore((s) => s.setMeshReferences)
  const setUrdfContent = useRobotStore((s) => s.setUrdfContent)
  const setRawXacroContent = useRobotStore((s) => s.setRawXacroContent)
  const setXacroIncludes = useRobotStore((s) => s.setXacroIncludes)

  /**
   * XACRO 또는 일반 URDF 콘텐츠를 처리한다.
   * XACRO이면 include를 프리스캔하여 미해석 include가 있으면 스토어에 저장하고 false를 반환.
   * 모든 include가 해석되면 확장 후 메시 참조까지 추출한다.
   *
   * @returns 모든 메시가 해석되었으면 true, 미해석 include가 있으면 false
   */
  async function processUrdfOrXacroContent(
    content: string,
    fileMap: FileMap,
    isXacro: boolean,
  ): Promise<boolean> {
    if (isXacro) {
      // XACRO인 경우: include 의존성을 먼저 확인
      const includes = extractXacroIncludes(content, fileMap)
      const hasUnresolved = includes.some((ref) => !ref.resolved)

      if (hasUnresolved) {
        // 미해석 include가 있으면 rawXacroContent와 includes만 저장하고 반환
        // urdfContent는 설정하지 않음 (확장 전이므로)
        setRawXacroContent(content)
        setXacroIncludes(includes)
        setLoading(false)
        return false
      }

      // 모든 include가 해석됨 -> XACRO 확장
      const expandedContent = await expandXacro(content, fileMap)
      setRawXacroContent(content)
      setXacroIncludes(includes)
      setUrdfContent(expandedContent)

      // 메시 참조 추출
      const meshRefs = extractMeshReferences(expandedContent, fileMap)
      setMeshReferences(meshRefs)
      setLoading(false)
      return meshRefs.every((ref) => ref.resolved)
    }

    // 일반 URDF인 경우: 바로 메시 참조 추출
    setUrdfContent(content)

    const meshRefs = extractMeshReferences(content, fileMap)
    setMeshReferences(meshRefs)
    setLoading(false)
    return meshRefs.every((ref) => ref.resolved)
  }

  /**
   * Step 1: URDF/XACRO 파일을 파싱하고 메시 참조를 추출한다.
   * 로봇 Three.js 모델은 아직 생성하지 않는다.
   * XACRO의 경우 include 의존성을 프리스캔하여, 미해석 파일이 있으면
   * rawXacroContent와 xacroIncludes만 저장하고 false를 반환한다.
   * @returns 모든 메시가 해석되었으면 true
   */
  const parseUrdfFile = useCallback(
    async (files: FileList | File[]): Promise<boolean> => {
      setLoading(true)
      setError(null)

      try {
        const { fileMap, urdfFileObject } = await processFiles(files)

        if (!urdfFileObject) {
          throw new Error(
            'No URDF or XACRO file found. Please include a .urdf or .xacro file.',
          )
        }

        const content = await readUrdfContent(urdfFileObject)
        const isXacro = urdfFileObject.name.toLowerCase().endsWith('.xacro')

        // 파일 데이터를 스토어에 저장
        const uploadedFileInfos = buildUploadedFileInfos(
          Array.from(files),
          fileMap,
        )
        setFileData(fileMap, uploadedFileInfos)

        // XACRO/URDF 콘텐츠 처리 (include 프리스캔 포함)
        return await processUrdfOrXacroContent(content, fileMap, isXacro)
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to parse URDF file'
        setError(message)
        return false
      }
    },
    [
      setLoading,
      setError,
      setFileData,
      setUrdfContent,
      setMeshReferences,
      setRawXacroContent,
      setXacroIncludes,
    ],
  )

  /**
   * Step 1 (드래그 앤 드롭): DataTransferItemList에서 URDF를 파싱한다.
   * 폴더 구조를 재귀 탐색하여 모든 파일을 수집한다.
   */
  const parseUrdfFromDrop = useCallback(
    async (items: DataTransferItemList): Promise<boolean> => {
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

        const content = await readUrdfContent(urdfFileObject)
        const isXacro = urdfFileObject.name.toLowerCase().endsWith('.xacro')

        // DataTransfer에서는 정확한 파일 크기를 알 수 없음
        const uploadedFileInfos: UploadedFileInfo[] = []
        for (const [path, blobUrl] of fileMap) {
          const lowerPath = path.toLowerCase()
          const isRobotDescription = URDF_EXTENSIONS.some((ext) =>
            lowerPath.endsWith(ext),
          )
          uploadedFileInfos.push({
            path,
            blobUrl,
            size: 0,
            isRobotDescription,
          })
        }

        setFileData(fileMap, uploadedFileInfos)

        // XACRO/URDF 콘텐츠 처리 (include 프리스캔 포함)
        return await processUrdfOrXacroContent(content, fileMap, isXacro)
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to parse URDF file'
        setError(message)
        return false
      }
    },
    [
      setLoading,
      setError,
      setFileData,
      setUrdfContent,
      setMeshReferences,
      setRawXacroContent,
      setXacroIncludes,
    ],
  )

  /**
   * Step 2: 메시 파일(또는 XACRO include 파일)을 추가하고 참조를 재평가한다.
   * XACRO가 아직 확장되지 않은 경우(rawXacroContent 존재, urdfContent 없음)
   * include 재평가 후 모두 해석되면 XACRO 확장까지 시도한다.
   * @returns 모든 메시가 해석되었으면 true
   */
  const addMeshFiles = useCallback(
    async (files: FileList | File[]): Promise<boolean> => {
      setLoading(true)
      setError(null)

      try {
        const { fileMap: newFileMap } = await processFiles(files)
        const newFileInfos = buildUploadedFileInfos(
          Array.from(files),
          newFileMap,
        )
        mergeFileMap(newFileMap, newFileInfos)

        // 병합된 fileMap 구성
        const state = useRobotStore.getState()
        const mergedFileMap = new Map(state.fileMap)
        for (const [key, value] of newFileMap) {
          mergedFileMap.set(key, value)
        }

        // XACRO가 아직 확장되지 않은 경우 (include 미해석 상태)
        if (state.rawXacroContent && !state.urdfContent) {
          const includes = extractXacroIncludes(
            state.rawXacroContent,
            mergedFileMap,
          )
          setXacroIncludes(includes)

          const hasUnresolved = includes.some((ref) => !ref.resolved)
          if (hasUnresolved) {
            // 아직 미해석 include가 남아있음
            setLoading(false)
            return false
          }

          // 모든 include 해석 완료 -> XACRO 확장 시도
          const expandedContent = await expandXacro(
            state.rawXacroContent,
            mergedFileMap,
          )
          setUrdfContent(expandedContent)

          const meshRefs = extractMeshReferences(expandedContent, mergedFileMap)
          setMeshReferences(meshRefs)
          setLoading(false)
          return meshRefs.every((ref) => ref.resolved)
        }

        // urdfContent가 이미 존재하는 경우: 메시 참조만 재평가
        const currentUrdfContent = state.urdfContent
        if (!currentUrdfContent) {
          setLoading(false)
          return false
        }

        const meshRefs = extractMeshReferences(
          currentUrdfContent,
          mergedFileMap,
        )
        setMeshReferences(meshRefs)

        setLoading(false)
        return meshRefs.every((ref) => ref.resolved)
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to add mesh files'
        setError(message)
        return false
      }
    },
    [
      setLoading,
      setError,
      mergeFileMap,
      setMeshReferences,
      setUrdfContent,
      setXacroIncludes,
    ],
  )

  /**
   * Step 2 (드래그 앤 드롭): DataTransferItemList에서 메시 파일을 추가한다.
   * 폴더 드롭 시 재귀 탐색하여 메시 파일을 수집한다.
   * XACRO include 의존성 재평가 로직도 포함한다.
   */
  const addMeshFilesFromDrop = useCallback(
    async (items: DataTransferItemList): Promise<boolean> => {
      setLoading(true)
      setError(null)

      try {
        const { fileMap: newFileMap } = await processDataTransferItems(items)

        // DataTransfer에서는 File 객체에 접근 불가하므로 fileMap 기반으로 info 생성
        const newFileInfos: UploadedFileInfo[] = []
        for (const [path, blobUrl] of newFileMap) {
          const lowerPath = path.toLowerCase()
          const isRobotDescription = URDF_EXTENSIONS.some((ext) =>
            lowerPath.endsWith(ext),
          )
          newFileInfos.push({
            path,
            blobUrl,
            size: 0,
            isRobotDescription,
          })
        }

        mergeFileMap(newFileMap, newFileInfos)

        // 병합된 fileMap 구성
        const state = useRobotStore.getState()
        const mergedFileMap = new Map(state.fileMap)
        for (const [key, value] of newFileMap) {
          mergedFileMap.set(key, value)
        }

        // XACRO가 아직 확장되지 않은 경우 (include 미해석 상태)
        if (state.rawXacroContent && !state.urdfContent) {
          const includes = extractXacroIncludes(
            state.rawXacroContent,
            mergedFileMap,
          )
          setXacroIncludes(includes)

          const hasUnresolved = includes.some((ref) => !ref.resolved)
          if (hasUnresolved) {
            // 아직 미해석 include가 남아있음
            setLoading(false)
            return false
          }

          // 모든 include 해석 완료 -> XACRO 확장 시도
          const expandedContent = await expandXacro(
            state.rawXacroContent,
            mergedFileMap,
          )
          setUrdfContent(expandedContent)

          const meshRefs = extractMeshReferences(expandedContent, mergedFileMap)
          setMeshReferences(meshRefs)
          setLoading(false)
          return meshRefs.every((ref) => ref.resolved)
        }

        // urdfContent가 이미 존재하는 경우: 메시 참조만 재평가
        const currentUrdfContent = state.urdfContent
        if (!currentUrdfContent) {
          setLoading(false)
          return false
        }

        const meshRefs = extractMeshReferences(
          currentUrdfContent,
          mergedFileMap,
        )
        setMeshReferences(meshRefs)

        setLoading(false)
        return meshRefs.every((ref) => ref.resolved)
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to add mesh files'
        setError(message)
        return false
      }
    },
    [
      setLoading,
      setError,
      mergeFileMap,
      setMeshReferences,
      setUrdfContent,
      setXacroIncludes,
    ],
  )

  /**
   * 파싱된 URDF 텍스트와 현재 fileMap으로 Three.js 로봇 모델을 생성한다.
   * Step 2 완료 후 또는 모든 메시가 해석된 경우 호출한다.
   */
  const buildRobot = useCallback(() => {
    const state = useRobotStore.getState()
    const { urdfContent, fileMap } = state

    if (!urdfContent) return

    setLoading(true)
    setError(null)

    try {
      const robot = parseURDF(urdfContent, fileMap)
      const joints = extractJointStates(robot)
      const links = extractLinkStates(robot)
      setRobot(robot.robotName || 'Unnamed Robot', robot, joints, links)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to build robot model'
      setError(message)
    }
  }, [setRobot, setLoading, setError])

  const clearRobot = useCallback(() => {
    clearRobotAction()
  }, [clearRobotAction])

  return {
    parseUrdfFile,
    parseUrdfFromDrop,
    addMeshFiles,
    addMeshFilesFromDrop,
    buildRobot,
    clearRobot,
  }
}
