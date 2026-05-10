import { useCallback } from 'react'
import { useRobotStore } from '@entities/robot'
import {
  processFiles,
  processDataTransferItems,
  readFileAsText,
  parseURDF,
  parseSDF,
  expandXacro,
  extractMeshReferences,
  extractSdfMeshReferences,
  extractXacroIncludes,
} from '@shared/lib'
import type {
  FileMap,
  UploadedFileInfo,
} from '@shared/types'
import { extractJointStates, extractLinkStates } from './robotStateExtractors'

/** URDF/XACRO/SDF 확장자 판별용 */
const URDF_EXTENSIONS = ['.urdf', '.xacro', '.sdf'] as const

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
 * URDF/XACRO/SDF 파일의 텍스트 내용을 읽는다.
 */
async function readModelContent(file: File): Promise<string> {
  const content = await readFileAsText(file)
  if (!content.trim()) {
    throw new Error('The description file is empty.')
  }
  return content
}

interface UseURDFLoaderReturn {
  /** Step 1: URDF/XACRO/SDF 파일 파싱 (로봇 미생성). 모든 메시 해석 시 true 반환 */
  parseUrdfFile: (files: FileList | File[]) => Promise<boolean>
  /** Step 1 (드래그 앤 드롭): DataTransferItem에서 파싱 */
  parseUrdfFromDrop: (items: DataTransferItemList) => Promise<boolean>
  /** Step 2: 메시 파일 추가 후 참조 재평가. 모든 메시 해석 시 true 반환 */
  addMeshFiles: (files: FileList | File[]) => Promise<boolean>
  /** Step 2 (드래그 앤 드롭): 폴더에서 메시 파일 추가 */
  addMeshFilesFromDrop: (items: DataTransferItemList) => Promise<boolean>
  /** 파싱된 내용 + 현재 fileMap으로 모델 생성 */
  buildRobot: () => Promise<void>
  /** 전체 초기화 */
  clearRobot: () => void
}

/**
 * 2단계 업로드 위자드를 지원하는 파일 업로드/파싱 훅.
 * Step 1에서 URDF/SDF를 파싱하고, Step 2에서 메시를 추가한 뒤,
 * buildRobot으로 최종 모델을 생성한다.
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
   * XACRO, URDF 또는 SDF 콘텐츠를 처리한다.
   * @returns 모든 메시가 해석되었으면 true
   */
  async function processDescriptionContent(
    content: string,
    fileMap: FileMap,
    filename: string,
  ): Promise<boolean> {
    const isXacro = filename.toLowerCase().endsWith('.xacro')
    const isSdf = filename.toLowerCase().endsWith('.sdf')

    if (isXacro) {
      // XACRO인 경우: include 의존성을 먼저 확인
      const includes = extractXacroIncludes(content, fileMap)
      const hasUnresolved = includes.some((ref) => !ref.resolved)

      if (hasUnresolved) {
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

    setUrdfContent(content)

    if (isSdf) {
      // SDF인 경우: 비동기로 메시 참조 추출 (include 탐색 포함)
      const meshRefs = await extractSdfMeshReferences(content, fileMap)
      setMeshReferences(meshRefs)
      setLoading(false)
      return meshRefs.every((ref) => ref.resolved)
    }

    // 일반 URDF인 경우
    const meshRefs = extractMeshReferences(content, fileMap)
    setMeshReferences(meshRefs)
    setLoading(false)
    return meshRefs.every((ref) => ref.resolved)
  }

  /**
   * Step 1: URDF/XACRO/SDF 파일을 파싱하고 메시 참조를 추출한다.
   */
  const parseUrdfFile = useCallback(
    async (files: FileList | File[]): Promise<boolean> => {
      setLoading(true)
      setError(null)

      try {
        const { fileMap, urdfFile, urdfFileObject } = await processFiles(files)

        if (!urdfFileObject || !urdfFile) {
          throw new Error(
            'No URDF, XACRO or SDF file found.',
          )
        }

        const content = await readModelContent(urdfFileObject)

        // 파일 데이터를 스토어에 저장
        const uploadedFileInfos = buildUploadedFileInfos(
          Array.from(files),
          fileMap,
        )
        setFileData(fileMap, uploadedFileInfos, urdfFile)

        return await processDescriptionContent(content, fileMap, urdfFile)
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to parse file'
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
   * Step 1 (드래그 앤 드롭): DataTransferItemList에서 파싱한다.
   */
  const parseUrdfFromDrop = useCallback(
    async (items: DataTransferItemList): Promise<boolean> => {
      setLoading(true)
      setError(null)

      try {
        const { fileMap, urdfFile, urdfFileObject } =
          await processDataTransferItems(items)

        if (!urdfFileObject || !urdfFile) {
          throw new Error(
            'No URDF, XACRO or SDF file found.',
          )
        }

        const content = await readModelContent(urdfFileObject)

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

        setFileData(fileMap, uploadedFileInfos, urdfFile)

        return await processDescriptionContent(content, fileMap, urdfFile)
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to parse file'
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
   * Step 2: 메시 파일 추가 및 참조 재평가.
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

        const state = useRobotStore.getState()
        const mergedFileMap = new Map(state.fileMap)
        for (const [key, value] of newFileMap) {
          mergedFileMap.set(key, value)
        }

        const filename = state.primaryDescriptionPath || ''

        // XACRO 미확장 상태
        if (state.rawXacroContent && !state.urdfContent) {
          const includes = extractXacroIncludes(
            state.rawXacroContent,
            mergedFileMap,
          )
          setXacroIncludes(includes)

          const hasUnresolved = includes.some((ref) => !ref.resolved)
          if (hasUnresolved) {
            setLoading(false)
            return false
          }

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

        const currentUrdfContent = state.urdfContent
        if (!currentUrdfContent) {
          setLoading(false)
          return false
        }

        // SDF 또는 URDF 재평가
        let meshRefs;
        if (filename.toLowerCase().endsWith('.sdf')) {
          meshRefs = await extractSdfMeshReferences(currentUrdfContent, mergedFileMap)
        } else {
          meshRefs = extractMeshReferences(currentUrdfContent, mergedFileMap)
        }

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
   * Step 2 (드래그 앤 드롭): 메시 파일 추가.
   */
  const addMeshFilesFromDrop = useCallback(
    async (items: DataTransferItemList): Promise<boolean> => {
      setLoading(true)
      setError(null)

      try {
        const { fileMap: newFileMap } = await processDataTransferItems(items)
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

        const state = useRobotStore.getState()
        const mergedFileMap = new Map(state.fileMap)
        for (const [key, value] of newFileMap) {
          mergedFileMap.set(key, value)
        }

        const filename = state.primaryDescriptionPath || ''

        if (state.rawXacroContent && !state.urdfContent) {
          const includes = extractXacroIncludes(
            state.rawXacroContent,
            mergedFileMap,
          )
          setXacroIncludes(includes)

          const hasUnresolved = includes.some((ref) => !ref.resolved)
          if (hasUnresolved) {
            setLoading(false)
            return false
          }

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

        const currentUrdfContent = state.urdfContent
        if (!currentUrdfContent) {
          setLoading(false)
          return false
        }

        let meshRefs;
        if (filename.toLowerCase().endsWith('.sdf')) {
          meshRefs = await extractSdfMeshReferences(currentUrdfContent, mergedFileMap)
        } else {
          meshRefs = extractMeshReferences(currentUrdfContent, mergedFileMap)
        }

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
   * 모델 생성.
   */
  const buildRobot = useCallback(async () => {
    const state = useRobotStore.getState()
    const { urdfContent, fileMap, primaryDescriptionPath } = state

    if (!urdfContent) return

    setLoading(true)
    setError(null)

    try {
      const isSdf = primaryDescriptionPath?.toLowerCase().endsWith('.sdf')

      let robot;
      if (isSdf) {
        robot = await parseSDF(urdfContent, fileMap)
      } else {
        robot = parseURDF(urdfContent, fileMap)
      }

      const joints = extractJointStates(robot)
      const links = extractLinkStates(robot)
      setRobot(robot.robotName || 'Unnamed Model', robot, joints, links)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to build model'
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
