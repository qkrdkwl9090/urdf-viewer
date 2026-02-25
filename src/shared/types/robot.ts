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

/** URDF에서 참조하는 메시의 해석 상태 */
export interface MeshReference {
  /** URDF에 기록된 원본 경로 (e.g., package://robot/meshes/link.stl) */
  urdfPath: string
  /** FileMap에서 해석 성공 여부 */
  resolved: boolean
  /** 파일 확장자 */
  extension: string
}

/** XACRO에서 참조하는 include 파일의 해석 상태 */
export interface XacroIncludeReference {
  /** xacro:include에 기록된 경로 */
  path: string
  /** FileMap에서 해석 성공 여부 */
  resolved: boolean
}

/** 업로드된 파일 정보 */
export interface UploadedFileInfo {
  /** 파일 경로 (webkitRelativePath 또는 name) */
  path: string
  /** Blob URL */
  blobUrl: string
  /** 파일 크기 (bytes) */
  size: number
  /** URDF/XACRO 파일 여부 */
  isRobotDescription: boolean
}
