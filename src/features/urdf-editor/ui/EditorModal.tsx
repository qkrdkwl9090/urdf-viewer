import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { IconButton } from '@shared/ui'
import { EditorPanel } from './EditorPanel'
import styles from './EditorModal.module.css'

interface EditorModalProps {
  onClose: () => void
}

/**
 * URDF 에디터 모달.
 * Settings에서 "Edit URDF" 클릭 시 열리며, 바깥 클릭 또는 ESC로 닫힌다.
 */
export function EditorModal({ onClose }: EditorModalProps): ReactNode {
  // CodeMirror는 contentEditable 요소를 사용하므로
  // useKeyboardShortcuts의 ESC 핸들러가 무시된다.
  // 모달 내부에서도 ESC로 닫을 수 있도록 별도 리스너를 등록한다.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>URDF Editor</span>
          <IconButton
            icon={<X size={16} />}
            tooltip="Close"
            size="sm"
            onClick={onClose}
          />
        </div>
        <div className={styles.body}>
          <EditorPanel />
        </div>
      </div>
    </div>
  )
}
