import { useCallback, useRef, type ReactNode, type ChangeEvent } from 'react'
import { Box, Upload, X } from 'lucide-react'
import { useRobotStore } from '@entities/robot'
import { useURDFLoader } from '@features/upload-robot'
import { Button, IconButton } from '@shared/ui'
import styles from './Header.module.css'

/** 개별 파일 업로드용 accept 속성 */
const FILE_ACCEPT = '.urdf,.xacro,.stl,.dae,.obj'

export function Header(): ReactNode {
  const robotName = useRobotStore((s) => s.robotName)
  const isLoading = useRobotStore((s) => s.isLoading)
  const { loadRobot, clearRobot } = useURDFLoader()

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        void loadRobot(files)
      }
      e.target.value = ''
    },
    [loadRobot],
  )

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

        {/* 로딩 중 표시 — 타이틀 옆에 펄싱 도트 */}
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
            tooltip="Clear robot"
            size="sm"
            onClick={handleClear}
            disabled={isLoading}
          />
        )}

        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
        >
          <Upload size={14} />
          {isLoading ? 'Loading...' : 'Upload URDF'}
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={FILE_ACCEPT}
          onChange={handleFileChange}
          className={styles.hiddenInput}
        />
      </div>
    </header>
  )
}
