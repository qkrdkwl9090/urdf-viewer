import { create } from 'zustand'
import { useUIStore } from './uiStore'
import type {
  JointState,
  LinkState,
  URDFRobot,
  FileMap,
  UploadedFileInfo,
  MeshReference,
  XacroIncludeReference,
} from '@shared/types'

interface RobotState {
  /** 로봇 모델 이름 */
  robotName: string | null
  /** urdf-loader가 반환하는 THREE.Object3D 기반 로봇 객체 */
  robot: URDFRobot | null
  /** 조인트 이름 -> 상태 맵 */
  joints: Map<string, JointState>
  /** 링크 이름 -> 상태 맵 */
  links: Map<string, LinkState>
  /** 로딩 중 여부 */
  isLoading: boolean
  /** 에러 메시지 */
  error: string | null
  /** 업로드된 파일 맵 (경로 -> Blob URL) — 메시 추가 시 병합용 */
  fileMap: FileMap
  /** 업로드된 파일 목록 */
  uploadedFiles: UploadedFileInfo[]
  /** URDF에서 참조하는 모든 메시의 해석 상태 */
  meshReferences: MeshReference[]
  /** URDF 원본 텍스트 (재파싱용) */
  urdfContent: string | null
  /** 확장 전 XACRO 원본 텍스트 (include 해석 후 재확장용) */
  rawXacroContent: string | null
  /** XACRO include 해석 상태 */
  xacroIncludes: XacroIncludeReference[]
}

interface RobotActions {
  /** 파싱된 로봇 모델 설정 */
  setRobot: (
    name: string,
    robot: URDFRobot,
    joints: Map<string, JointState>,
    links: Map<string, LinkState>,
  ) => void
  /** 특정 조인트 값 업데이트 */
  setJointValue: (name: string, value: number) => void
  /** 모든 조인트를 초기값(0 또는 min)으로 리셋 */
  resetJoints: () => void
  /** 특정 링크의 가시성 토글 */
  toggleLinkVisibility: (name: string) => void
  /** 로봇 모델 초기화 */
  clearRobot: () => void
  /** 로딩 상태 설정 */
  setLoading: (v: boolean) => void
  /** 에러 메시지 설정 */
  setError: (e: string | null) => void
  /** 파일 맵 및 업로드 파일 정보 설정 */
  setFileData: (fileMap: FileMap, uploadedFiles: UploadedFileInfo[]) => void
  /** 기존 FileMap에 새 파일 병합 */
  mergeFileMap: (newFiles: FileMap, newFileInfos: UploadedFileInfo[]) => void
  /** 메시 참조 목록 설정 */
  setMeshReferences: (refs: MeshReference[]) => void
  /** URDF 원본 텍스트 저장 */
  setUrdfContent: (content: string) => void
  /** 개별 파일 제거 (경로 기반) */
  removeFile: (path: string) => void
  /** 확장 전 XACRO 원본 텍스트 저장 */
  setRawXacroContent: (content: string | null) => void
  /** XACRO include 해석 상태 설정 */
  setXacroIncludes: (refs: XacroIncludeReference[]) => void
}

const initialState: RobotState = {
  robotName: null,
  robot: null,
  joints: new Map(),
  links: new Map(),
  isLoading: false,
  error: null,
  fileMap: new Map(),
  uploadedFiles: [],
  meshReferences: [],
  urdfContent: null,
  rawXacroContent: null,
  xacroIncludes: [],
}

export const useRobotStore = create<RobotState & RobotActions>()((set) => ({
  ...initialState,

  setRobot: (name, robot, joints, links) =>
    set({
      robotName: name,
      robot,
      joints,
      links,
      isLoading: false,
      error: null,
    }),

  setJointValue: (name, value) =>
    set((state) => {
      const joint = state.joints.get(name)
      if (!joint) return state

      // ignoreLimits가 켜져 있거나 continuous 타입이면 클램핑 스킵
      const { ignoreLimits } = useUIStore.getState()
      const clampedValue =
        ignoreLimits || joint.type === 'continuous'
          ? value
          : Math.min(Math.max(value, joint.min), joint.max)

      // urdf-loader의 Three.js 객체에 직접 조인트 값 적용
      if (state.robot) {
        state.robot.setJointValue(name, clampedValue)
      }

      const nextJoints = new Map(state.joints)
      nextJoints.set(name, { ...joint, value: clampedValue })
      return { joints: nextJoints }
    }),

  resetJoints: () =>
    set((state) => {
      const nextJoints = new Map<string, JointState>()
      // 모든 조인트를 0 또는 하한 값으로 리셋
      for (const [name, joint] of state.joints) {
        const resetValue =
          joint.min <= 0 && joint.max >= 0 ? 0 : joint.min
        nextJoints.set(name, { ...joint, value: resetValue })

        // Three.js 객체에도 리셋 값 적용
        if (state.robot) {
          state.robot.setJointValue(name, resetValue)
        }
      }
      return { joints: nextJoints }
    }),

  toggleLinkVisibility: (name) =>
    set((state) => {
      const link = state.links.get(name)
      if (!link) return state

      const nextLinks = new Map(state.links)
      nextLinks.set(name, { ...link, visible: !link.visible })
      return { links: nextLinks }
    }),

  clearRobot: () =>
    set((state) => {
      // Blob URL 메모리 해제
      for (const blobUrl of state.fileMap.values()) {
        URL.revokeObjectURL(blobUrl)
      }
      // 선택 상태 초기화
      useUIStore.getState().clearSelection()
      return { ...initialState }
    }),

  setLoading: (v) => set({ isLoading: v }),

  setError: (e) => set({ error: e, isLoading: false }),

  setFileData: (fileMap, uploadedFiles) =>
    set({ fileMap, uploadedFiles }),

  mergeFileMap: (newFiles, newFileInfos) =>
    set((state) => {
      // 기존 FileMap에 새 파일을 병합
      const nextFileMap = new Map(state.fileMap)
      for (const [key, value] of newFiles) {
        nextFileMap.set(key, value)
      }

      // 기존 파일 목록에 새 파일 정보 추가 (중복 경로는 덮어쓰기)
      const existingPaths = new Set(state.uploadedFiles.map((f) => f.path))
      const deduped = newFileInfos.filter((f) => !existingPaths.has(f.path))
      const nextUploadedFiles = [...state.uploadedFiles, ...deduped]

      return { fileMap: nextFileMap, uploadedFiles: nextUploadedFiles }
    }),

  setMeshReferences: (refs) => set({ meshReferences: refs }),

  setUrdfContent: (content) => set({ urdfContent: content }),

  setRawXacroContent: (content) => set({ rawXacroContent: content }),

  setXacroIncludes: (refs) => set({ xacroIncludes: refs }),

  removeFile: (path) =>
    set((state) => {
      const blobUrl = state.fileMap.get(path)
      if (blobUrl) URL.revokeObjectURL(blobUrl)

      const nextFileMap = new Map(state.fileMap)
      nextFileMap.delete(path)

      const nextUploadedFiles = state.uploadedFiles.filter((f) => f.path !== path)

      return { fileMap: nextFileMap, uploadedFiles: nextUploadedFiles }
    }),
}))
