import { useCallback, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Bot } from 'lucide-react'
import { useUIStore, useRobotStore } from '@entities/robot'
import { IconButton } from '@shared/ui'
import styles from './ParameterPanel.module.css'

export function ParameterPanel(): ReactNode {
  const isPanelOpen = useUIStore((s) => s.isPanelOpen)
  const togglePanel = useUIStore((s) => s.togglePanel)
  const robotName = useRobotStore((s) => s.robotName)

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
          {robotName ? (
            /* 로봇이 로드되면 JointPanel, SettingsPanel 등이 여기에 추가됨 */
            <div>Robot: {robotName}</div>
          ) : (
            <div className={styles.emptyMessage}>
              <Bot size={32} className={styles.emptyIcon} />
              <span>No robot loaded</span>
              <span>Upload a URDF file to get started</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
