import { type ReactNode, useCallback, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import styles from './Panel.module.css'

interface PanelProps {
  title: string
  icon?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}

export function Panel({
  title,
  icon,
  defaultOpen = true,
  children,
}: PanelProps): ReactNode {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const chevronClass = [styles.chevron, isOpen && styles.chevronOpen]
    .filter(Boolean)
    .join(' ')

  const contentWrapperClass = [
    styles.contentWrapper,
    isOpen && styles.contentWrapperOpen,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={styles.panel}>
      <div
        className={styles.header}
        role="button"
        tabIndex={0}
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleToggle()
          }
        }}
        aria-expanded={isOpen}
      >
        {icon && <span className={styles.icon}>{icon}</span>}
        <span className={styles.title}>{title}</span>
        <span className={chevronClass}>
          <ChevronDown size={16} />
        </span>
      </div>
      <div className={contentWrapperClass}>
        <div className={styles.contentInner}>
          <div className={styles.content}>{children}</div>
        </div>
      </div>
    </div>
  )
}
