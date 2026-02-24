import type { ReactNode } from 'react'
import { Upload } from 'lucide-react'
import styles from './EmptyState.module.css'

const SUPPORTED_FORMATS = ['.urdf', '.xacro', '.stl', '.dae'] as const

/**
 * 로봇이 로드되지 않았을 때 뷰포트 위에 표시되는 빈 상태 오버레이
 * 업로드 로직은 아직 미구현 — 순수 프레젠테이셔널 컴포넌트
 */
export function EmptyState(): ReactNode {
  return (
    <div className={styles.overlay}>
      <div className={styles.uploadZone}>
        <div className={styles.iconContainer}>
          <Upload size={48} strokeWidth={1.5} />
        </div>

        <h2 className={styles.title}>Upload a URDF File</h2>

        <p className={styles.subtitle}>
          Drag and drop your robot description files,
          <br />
          or click to browse
        </p>

        <div className={styles.formats}>
          <span className={styles.formatLabel}>Supported:</span>
          {SUPPORTED_FORMATS.map((fmt) => (
            <span key={fmt} className={styles.formatBadge}>
              {fmt}
            </span>
          ))}
        </div>

        <p className={styles.tip}>
          Tip: Upload the entire robot package folder to include all mesh files
        </p>
      </div>
    </div>
  )
}
