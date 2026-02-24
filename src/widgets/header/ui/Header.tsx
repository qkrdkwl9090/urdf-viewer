import { useCallback, type ReactNode } from 'react'
import { Box, Github, X } from 'lucide-react'
import { useRobotStore } from '@entities/robot'
import { useURDFLoader } from '@features/upload-robot'
import { IconButton } from '@shared/ui'
import styles from './Header.module.css'

/**
 * 상단 헤더 바.
 * 브랜드, 로봇 이름, 닫기 버튼만 표시한다.
 */
export function Header(): ReactNode {
  const robotName = useRobotStore((s) => s.robotName)
  const isLoading = useRobotStore((s) => s.isLoading)
  const { clearRobot } = useURDFLoader()

  const handleClear = useCallback(() => {
    clearRobot()
  }, [clearRobot])

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.brandIcon}>
          <Box size={20} />
        </span>
        <span className={styles.brandTitle}>URDF Viewer</span>

        {/* 로딩 중 표시 -- 타이틀 옆에 펄싱 도트 */}
        {isLoading && <span className={styles.loadingDot} />}

        {/* 로봇이 로드되면 이름을 표시 */}
        {robotName && !isLoading && (
          <>
            <span className={styles.separator} />
            <span className={styles.robotName}>{robotName}</span>
          </>
        )}
      </div>

      <div className={styles.actions}>
        {robotName && (
          <IconButton
            icon={<X size={14} />}
            tooltip="Close robot"
            size="sm"
            onClick={handleClear}
            disabled={isLoading}
          />
        )}
        <a
          href="https://github.com/qkrdkwl9090/urdf-viewer"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.githubLink}
        >
          <Github size={18} />
        </a>
      </div>
    </header>
  )
}
