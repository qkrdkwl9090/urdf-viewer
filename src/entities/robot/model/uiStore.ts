import { create } from 'zustand'

type ActiveTab = 'joints' | 'model' | 'settings'
type AngleUnit = 'rad' | 'deg'

/** 선택 가능한 항목 — 링크 또는 조인트 */
export interface SelectedItem {
  name: string
  kind: 'link' | 'joint'
}

interface UIState {
  /** 파라미터 패널 열림/닫힘 */
  isPanelOpen: boolean
  /** 활성 탭 */
  activeTab: ActiveTab
  /** 각도 단위 (라디안/디그리) */
  angleUnit: AngleUnit
  /** 조인트 리밋 무시 여부 */
  ignoreLimits: boolean
  /** 단축키 도움말 모달 표시 여부 */
  showShortcuts: boolean
  /** URDF 에디터 모달 표시 여부 */
  isEditorOpen: boolean
  /** 현재 선택된 항목 */
  selectedItem: SelectedItem | null
}

interface UIActions {
  togglePanel: () => void
  openPanel: () => void
  closePanel: () => void
  setActiveTab: (tab: ActiveTab) => void
  toggleAngleUnit: () => void
  toggleIgnoreLimits: () => void
  toggleShortcuts: () => void
  closeShortcuts: () => void
  openEditor: () => void
  closeEditor: () => void
  /** 항목 선택 — 같은 항목 재클릭 시 해제 (토글) */
  selectItem: (item: SelectedItem) => void
  /** 선택 해제 */
  clearSelection: () => void
}

export const useUIStore = create<UIState & UIActions>()((set) => ({
  isPanelOpen: true,
  activeTab: 'joints',
  angleUnit: 'rad',
  ignoreLimits: false,
  showShortcuts: false,
  isEditorOpen: false,
  selectedItem: null,

  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),

  openPanel: () => set({ isPanelOpen: true }),

  closePanel: () => set({ isPanelOpen: false }),

  setActiveTab: (tab) => set({ activeTab: tab }),

  toggleAngleUnit: () =>
    set((state) => ({ angleUnit: state.angleUnit === 'rad' ? 'deg' : 'rad' })),

  toggleIgnoreLimits: () =>
    set((state) => ({ ignoreLimits: !state.ignoreLimits })),

  toggleShortcuts: () =>
    set((state) => ({ showShortcuts: !state.showShortcuts })),

  closeShortcuts: () => set({ showShortcuts: false }),

  openEditor: () => set({ isEditorOpen: true }),

  closeEditor: () => set({ isEditorOpen: false }),

  selectItem: (item) =>
    set((state) => ({
      selectedItem:
        state.selectedItem?.name === item.name && state.selectedItem?.kind === item.kind
          ? null
          : item,
    })),

  clearSelection: () => set({ selectedItem: null }),
}))
