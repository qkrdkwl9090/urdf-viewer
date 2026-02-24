import type { ReactNode } from 'react'
import { Box, Upload } from 'lucide-react'
import { Button } from '@shared/ui'
import styles from './Header.module.css'

export function Header(): ReactNode {
  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.brandIcon}>
          <Box size={20} />
        </span>
        <span className={styles.brandTitle}>URDF Viewer</span>
      </div>
      <div className={styles.actions}>
        {/* 업로드 기능은 upload-robot feature에서 추가 예정 */}
        <Button disabled>
          <Upload size={14} />
          Upload URDF
        </Button>
      </div>
    </header>
  )
}
