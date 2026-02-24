// urdf-loader의 URDFRobot 타입 re-export
export type { URDFRobot, URDFJoint, URDFLink } from 'urdf-loader'

// 조인트 타입 (URDF 스펙 기반)
export type JointType =
  | 'revolute'
  | 'prismatic'
  | 'continuous'
  | 'fixed'
  | 'floating'
  | 'planar'

export interface JointState {
  name: string
  type: JointType
  /** 현재 값 */
  value: number
  /** 하한 (limit lower) */
  min: number
  /** 상한 (limit upper) */
  max: number
  /** 회전/이동 축 */
  axis: [number, number, number]
}

export interface LinkState {
  name: string
  visible: boolean
}

/** 업로드된 파일 맵 (파일경로 -> Blob URL) */
export type FileMap = Map<string, string>
