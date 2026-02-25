import { create } from 'zustand'

type ActiveTab = 'joints' | 'model' | 'settings'
type AngleUnit = 'rad' | 'deg'

interface UIState {
  /** 파라미터 패널 열림/닫힘 */
  isPanelOpen: boolean
  /** 활성 탭 */
  activeTab: ActiveTab
  /** 각도 단위 (라디안/디그리) */
  angleUnit: AngleUnit
}

interface UIActions {
  togglePanel: () => void
  openPanel: () => void
  closePanel: () => void
  setActiveTab: (tab: ActiveTab) => void
  toggleAngleUnit: () => void
}

export const useUIStore = create<UIState & UIActions>()((set) => ({
  isPanelOpen: true,
  activeTab: 'joints',
  angleUnit: 'rad',

  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),

  openPanel: () => set({ isPanelOpen: true }),

  closePanel: () => set({ isPanelOpen: false }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  toggleAngleUnit: () =>
    set((state) => ({ angleUnit: state.angleUnit === 'rad' ? 'deg' : 'rad' })),
}))
