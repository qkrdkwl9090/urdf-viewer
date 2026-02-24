import { create } from 'zustand'
import type { JointState, LinkState, URDFRobot } from '@shared/types'

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
}

const initialState: RobotState = {
  robotName: null,
  robot: null,
  joints: new Map(),
  links: new Map(),
  isLoading: false,
  error: null,
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

      // 조인트 범위 내로 클램핑 (continuous 타입은 제한 없음)
      const clampedValue =
        joint.type === 'continuous'
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

  // TODO: Blob URL 메모리 누수 방지 — clearRobot 시 fileMap의 모든 blob URL을
  // URL.revokeObjectURL()로 해제해야 한다. MVP 이후 최적화 대상.
  clearRobot: () => set(initialState),

  setLoading: (v) => set({ isLoading: v }),

  setError: (e) => set({ error: e, isLoading: false }),
}))
