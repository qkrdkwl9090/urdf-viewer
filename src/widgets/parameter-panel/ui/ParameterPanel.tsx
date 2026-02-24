import { useCallback, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useUIStore } from '@entities/robot'
import { JointPanel } from '@features/joint-control'
import { SettingsPanel } from '@features/viewer-settings'
import { IconButton } from '@shared/ui'
import { PanelTabs } from './PanelTabs'
import styles from './ParameterPanel.module.css'

/**
 * 우측 파라미터 패널 — 탭으로 Joints / Settings 전환.
 * 패널 접기/펼치기를 지원한다.
 */
export function ParameterPanel(): ReactNode {
  const isPanelOpen = useUIStore((s) => s.isPanelOpen)
  const togglePanel = useUIStore((s) => s.togglePanel)
  const activeTab = useUIStore((s) => s.activeTab)

  const handleToggle = useCallback(() => {
    togglePanel()
  }, [togglePanel])

  const wrapperClass = [
    styles.wrapper,
    isPanelOpen ? styles.wrapperOpen : styles.wrapperClosed,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={wrapperClass}>
      {/* 패널 접기/펼치기 토글 버튼 */}
      <IconButton
        className={styles.collapseButton}
        icon={isPanelOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        tooltip={isPanelOpen ? 'Collapse panel' : 'Expand panel'}
        size="sm"
        onClick={handleToggle}
      />

      {isPanelOpen && (
        <div className={styles.content}>
          <PanelTabs />
          {/* 활성 탭에 따라 조인트 패널 또는 설정 패널 렌더링 */}
          <div className={styles.tabContent}>
            {activeTab === 'joints' && <JointPanel />}
            {activeTab === 'settings' && <SettingsPanel />}
          </div>
        </div>
      )}
    </div>
  )
}
