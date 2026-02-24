import type { ViewerSettings } from '@shared/types'

/** 기본 뷰어 설정 */
export const DEFAULT_VIEWER_SETTINGS: ViewerSettings = {
  showGrid: true,
  showAxes: true,
  backgroundColor: '#0a0a0b',
} as const

/** 기본 카메라 위치 */
export const DEFAULT_CAMERA_POSITION = [3, 3, 3] as const

/** 기본 카메라 FOV */
export const DEFAULT_CAMERA_FOV = 50
