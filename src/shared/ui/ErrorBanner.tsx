import type { ReactNode } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import styles from './ErrorBanner.module.css'

interface ErrorBannerProps {
  message: string
  onDismiss: () => void
}

/**
 * 에러 메시지를 표시하는 해제 가능한 배너 컴포넌트.
 * 빨간색 계열 배경 + 좌측 액센트 보더로 시각적 주의를 끈다.
 */
export function ErrorBanner({ message, onDismiss }: ErrorBannerProps): ReactNode {
  return (
    <div className={styles.banner} role="alert">
      <span className={styles.icon}>
        <AlertTriangle size={16} />
      </span>

      <p className={styles.message}>{message}</p>

      <button
        className={styles.dismiss}
        onClick={onDismiss}
        aria-label="Dismiss error"
      >
        <X size={14} />
      </button>
    </div>
  )
}
