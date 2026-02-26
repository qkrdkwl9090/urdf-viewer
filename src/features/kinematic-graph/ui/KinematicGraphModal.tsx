import { type ReactNode } from 'react'
import { X } from 'lucide-react'
import { IconButton } from '@shared/ui'
import { KinematicGraphView } from './KinematicGraphView'
import styles from './KinematicGraphModal.module.css'

interface KinematicGraphModalProps {
  onClose: () => void
}

/**
 * 키네마틱 그래프 모달.
 * Model 탭의 "View Graph" 버튼 또는 K 단축키로 열린다.
 */
export function KinematicGraphModal({ onClose }: KinematicGraphModalProps): ReactNode {
  // ESC는 전역 키보드 단축키(useKeyboardShortcuts)에서 처리
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>Kinematic Graph</span>
          <IconButton
            icon={<X size={16} />}
            tooltip="Close"
            size="sm"
            onClick={onClose}
          />
        </div>
        <div className={styles.body}>
          <KinematicGraphView />
        </div>
      </div>
    </div>
  )
}
