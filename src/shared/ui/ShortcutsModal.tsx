import { type ReactNode } from 'react'
import styles from './ShortcutsModal.module.css'

const SHORTCUTS = [
  { key: 'G', description: 'Toggle Grid' },
  { key: 'A', description: 'Toggle Axes' },
  { key: 'H', description: 'Reset Camera' },
  { key: 'R', description: 'Reset Joints' },
  { key: 'D', description: 'Toggle Degrees / Radians' },
  { key: 'L', description: 'Toggle Ignore Joint Limits' },
  { key: 'P', description: 'Toggle Panel' },
  { key: '1', description: 'Joints Tab' },
  { key: '2', description: 'Model Tab' },
  { key: '3', description: 'Settings Tab' },
  { key: '?', description: 'Show Shortcuts' },
] as const

interface ShortcutsModalProps {
  onClose: () => void
}

export function ShortcutsModal({ onClose }: ShortcutsModalProps): ReactNode {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>Keyboard Shortcuts</h2>
        <div className={styles.list}>
          {SHORTCUTS.map(({ key, description }) => (
            <div key={key} className={styles.row}>
              <kbd className={styles.kbd}>{key}</kbd>
              <span className={styles.description}>{description}</span>
            </div>
          ))}
        </div>
        <p className={styles.hint}>Press <kbd className={styles.kbdInline}>Esc</kbd> or click outside to close</p>
      </div>
    </div>
  )
}
