import { useState, useCallback } from 'react'
import { useRobotStore } from '@entities/robot'
import {
  parseURDF,
  expandXacro,
  extractMeshReferences,
  extractXacroIncludes,
  parseGitHubUrl,
  fetchDefaultBranch,
  fetchRepoTree,
  fetchFileAsText,
  findUrdfFiles,
  buildFileMapFromTree,
  buildRawUrl,
} from '@shared/lib'
import type { GitHubRepoInfo, GitHubTreeEntry } from '@shared/lib'
import type { FileMap } from '@shared/types'
import { extractJointStates, extractLinkStates } from './robotStateExtractors'

/** GitHub 로더의 진행 단계 */
export type GitHubLoaderPhase =
  | 'idle'           // URL 입력 대기
  | 'fetching-tree'  // 레포 트리 조회중
  | 'select-urdf'    // URDF 파일 선택 대기
  | 'loading-urdf'   // URDF 로딩 + 로봇 빌드중
  | 'needs-meshes'   // 미해석 메시 존재 → Step 2 필요
  | 'done'           // 완료
  | 'error'          // 에러

export interface GitHubLoaderState {
  phase: GitHubLoaderPhase
  repoInfo: GitHubRepoInfo | null
  urdfFiles: GitHubTreeEntry[]
  /** fetchRepo에서 조회한 전체 트리 (selectUrdfFile에서 재활용) */
  tree: GitHubTreeEntry[]
  error: string | null
}

interface UseGitHubLoaderReturn {
  state: GitHubLoaderState
  /** URL 입력 → 레포 트리 fetch → URDF 파일 탐색 */
  fetchRepo: (url: string) => Promise<void>
  /** URDF 파일 선택 → fetch → FileMap 생성 → 로봇 빌드 */
  selectUrdfFile: (entry: GitHubTreeEntry) => Promise<void>
  /** 초기 상태로 복원 */
  reset: () => void
}

const INITIAL_STATE: GitHubLoaderState = {
  phase: 'idle',
  repoInfo: null,
  urdfFiles: [],
  tree: [],
  error: null,
}

/**
 * GitHub에서 URDF를 fetch하고 로봇을 빌드하는 핵심 로직.
 * useRobotStore.getState()를 직접 사용하여 stale closure를 방지한다.
 */
async function loadUrdfFromGitHub(
  info: GitHubRepoInfo,
  urdfEntry: GitHubTreeEntry,
  tree: GitHubTreeEntry[],
  setState: React.Dispatch<React.SetStateAction<GitHubLoaderState>>,
): Promise<void> {
  const store = useRobotStore.getState()
  store.setLoading(true)
  store.setError(null)

  try {
    // 1. URDF 텍스트 fetch
    const rawUrl = buildRawUrl(info, urdfEntry.path)
    const content = await fetchFileAsText(rawUrl)

    // 2. 전체 tree로 FileMap 구성 (path → raw URL)
    const fileMap: FileMap = buildFileMapFromTree(info, tree)

    // 스토어에 파일 데이터 저장
    const uploadedFiles = tree
      .filter((e) => e.type === 'blob')
      .map((e) => ({
        path: e.path,
        blobUrl: buildRawUrl(info, e.path),
        size: e.size ?? 0,
        isRobotDescription:
          e.path.toLowerCase().endsWith('.urdf') ||
          e.path.toLowerCase().endsWith('.xacro'),
      }))
    useRobotStore.getState().setFileData(fileMap, uploadedFiles)

    // 3. XACRO 처리
    const isXacro = urdfEntry.path.toLowerCase().endsWith('.xacro')
    let urdfContent: string

    if (isXacro) {
      useRobotStore.getState().setRawXacroContent(content)
      const includes = extractXacroIncludes(content, fileMap)
      useRobotStore.getState().setXacroIncludes(includes)

      // GitHub에서는 전체 파일이 FileMap에 있으므로 대부분 해석됨
      urdfContent = await expandXacro(content, fileMap)
    } else {
      urdfContent = content
    }

    useRobotStore.getState().setUrdfContent(urdfContent)

    // 메시 참조 추출
    const meshRefs = extractMeshReferences(urdfContent, fileMap)
    useRobotStore.getState().setMeshReferences(meshRefs)

    const allResolved = meshRefs.every((ref) => ref.resolved)

    if (!allResolved) {
      // 미해석 메시 존재 → Step 2에서 사용자가 추가 파일 업로드
      useRobotStore.getState().setLoading(false)
      setState((prev) => ({
        ...prev,
        phase: 'needs-meshes',
        error: null,
      }))
      return
    }

    // 4. 모든 메시 해석됨 → 로봇 모델 빌드
    const robot = parseURDF(urdfContent, fileMap)
    const joints = extractJointStates(robot)
    const links = extractLinkStates(robot)
    useRobotStore.getState().setRobot(
      robot.robotName || 'Unnamed Robot',
      robot,
      joints,
      links,
    )

    setState((prev) => ({
      ...prev,
      phase: 'done',
      error: null,
    }))
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to build robot model.'
    useRobotStore.getState().setError(message)
    setState((prev) => ({
      ...prev,
      phase: 'error',
      error: message,
    }))
  }
}

/**
 * GitHub 공개 레포에서 URDF를 로딩하는 훅.
 * 상태 머신 기반으로 단계별 진행을 관리한다.
 */
export function useGitHubLoader(): UseGitHubLoaderReturn {
  const [state, setState] = useState<GitHubLoaderState>(INITIAL_STATE)

  const fetchRepo = useCallback(async (url: string) => {
    // URL 파싱
    const info = parseGitHubUrl(url)
    if (!info) {
      setState({
        ...INITIAL_STATE,
        phase: 'error',
        error: 'Invalid GitHub URL. Please enter a valid GitHub repository URL.',
      })
      return
    }

    setState({
      ...INITIAL_STATE,
      phase: 'fetching-tree',
      repoInfo: info,
    })

    try {
      // 브랜치가 없으면 기본 브랜치 조회 (info를 직접 변경하지 않고 새 객체 생성)
      const resolvedInfo: GitHubRepoInfo = info.branch
        ? info
        : { ...info, branch: await fetchDefaultBranch(info.owner, info.repo) }

      // 전체 파일 트리 조회
      const tree = await fetchRepoTree(resolvedInfo)
      const urdfFiles = findUrdfFiles(tree)

      if (urdfFiles.length === 0) {
        setState({
          ...INITIAL_STATE,
          phase: 'error',
          repoInfo: resolvedInfo,
          error: 'No URDF or XACRO files found in this repository.',
        })
        return
      }

      // URDF 파일이 1개면 자동 선택
      if (urdfFiles.length === 1) {
        setState({
          phase: 'loading-urdf',
          repoInfo: resolvedInfo,
          urdfFiles,
          tree,
          error: null,
        })
        await loadUrdfFromGitHub(resolvedInfo, urdfFiles[0], tree, setState)
        return
      }

      // 여러 개면 사용자 선택 대기 (tree 캐시)
      setState({
        phase: 'select-urdf',
        repoInfo: resolvedInfo,
        urdfFiles,
        tree,
        error: null,
      })
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch repository.'
      setState((prev) => ({
        ...prev,
        phase: 'error',
        error: message,
      }))
    }
  }, [])

  /**
   * URDF 파일을 선택하여 로봇을 로드한다.
   * 캐시된 tree를 사용하여 추가 API 호출을 방지한다.
   */
  const selectUrdfFile = useCallback(
    async (entry: GitHubTreeEntry) => {
      const { repoInfo, tree } = state
      if (!repoInfo || tree.length === 0) return

      setState((prev) => ({
        ...prev,
        phase: 'loading-urdf',
        error: null,
      }))

      try {
        await loadUrdfFromGitHub(repoInfo, entry, tree, setState)
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to load URDF file.'
        setState((prev) => ({
          ...prev,
          phase: 'error',
          error: message,
        }))
      }
    },
    [state.repoInfo, state.tree],
  )

  const reset = useCallback(() => {
    setState(INITIAL_STATE)
  }, [])

  return { state, fetchRepo, selectUrdfFile, reset }
}
