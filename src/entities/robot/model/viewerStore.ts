import { create } from 'zustand'
import type { ViewerSettings } from '@shared/types'
import { DEFAULT_VIEWER_SETTINGS } from '@shared/constants'

interface ViewerState extends ViewerSettings {
  /** 카메라 리셋 요청 플래그 — true로 설정 후 뷰어가 처리하면 false로 되돌림 */
  shouldResetCamera: boolean
}

interface ViewerActions {
  toggleGrid: () => void
  toggleAxes: () => void
  setBackgroundColor: (color: string) => void
  /** 조명 밝기 배율 설정 */
  setLightIntensity: (v: number) => void
  /** 카메라 리셋 요청 (뷰어 컴포넌트가 소비) */
  requestCameraReset: () => void
  /** 카메라 리셋 처리 완료 */
  clearCameraReset: () => void
}

export const useViewerStore = create<ViewerState & ViewerActions>()((set) => ({
  ...DEFAULT_VIEWER_SETTINGS,
  shouldResetCamera: false,

  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),

  toggleAxes: () => set((state) => ({ showAxes: !state.showAxes })),

  setBackgroundColor: (color) => set({ backgroundColor: color }),

  setLightIntensity: (v) => set({ lightIntensity: v }),

  requestCameraReset: () => set({ shouldResetCamera: true }),

  clearCameraReset: () => set({ shouldResetCamera: false }),
}))
