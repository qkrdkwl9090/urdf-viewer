import { useCallback, type ReactNode } from 'react'
import { Sliders, Network, Settings, Code } from 'lucide-react'
import { useUIStore } from '@entities/robot'
import styles from './PanelTabs.module.css'

type TabId = 'joints' | 'model' | 'settings' | 'editor'

interface TabItem {
  id: TabId
  label: string
  icon: ReactNode
}

const TABS: readonly TabItem[] = [
  { id: 'joints', label: 'Joints', icon: <Sliders size={14} /> },
  { id: 'model', label: 'Model', icon: <Network size={14} /> },
  { id: 'editor', label: 'Editor', icon: <Code size={14} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={14} /> },
] as const

/**
 * 파라미터 패널 상단의 탭 네비게이션.
 * Joints, Settings 탭을 전환한다.
 */
export function PanelTabs(): ReactNode {
  const activeTab = useUIStore((s) => s.activeTab)
  const setActiveTab = useUIStore((s) => s.setActiveTab)

  const handleTabClick = useCallback(
    (tabId: TabId) => {
      setActiveTab(tabId)
    },
    [setActiveTab],
  )

  return (
    <div className={styles.tabs}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id
        const tabClass = [styles.tab, isActive && styles.tabActive]
          .filter(Boolean)
          .join(' ')

        return (
          <button
            key={tab.id}
            className={tabClass}
            onClick={() => handleTabClick(tab.id)}
            type="button"
          >
            {tab.icon}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
