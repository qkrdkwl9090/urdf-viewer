import { create } from 'zustand'

type ActiveTab = 'joints' | 'settings'

interface UIState {
  /** 파라미터 패널 열림/닫힘 */
  isPanelOpen: boolean
  /** 활성 탭 */
  activeTab: ActiveTab
}

interface UIActions {
  togglePanel: () => void
  openPanel: () => void
  closePanel: () => void
  setActiveTab: (tab: ActiveTab) => void
}

export const useUIStore = create<UIState & UIActions>()((set) => ({
  isPanelOpen: true,
  activeTab: 'joints',

  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),

  openPanel: () => set({ isPanelOpen: true }),

  closePanel: () => set({ isPanelOpen: false }),

  setActiveTab: (tab) => set({ activeTab: tab }),
}))
