import { useRef, useCallback, type ReactNode, type ChangeEvent } from 'react'
import { FileText, Upload, FolderOpen, Github } from 'lucide-react'
import { Button } from '@shared/ui'
import styles from './WizardStepUrdf.module.css'

/** Step 1에서는 URDF/XACRO만 허용 */
const URDF_ACCEPT = '.urdf,.xacro'

interface WizardStepUrdfProps {
  onFileSelect: (files: FileList) => void
  onFolderSelect: (files: FileList) => void
  onSwitchToGitHub: () => void
}

/**
 * 업로드 위자드 Step 1 — URDF/XACRO 파일 선택.
 * 개별 파일 또는 폴더 업로드를 지원한다.
 */
export function WizardStepUrdf({
  onFileSelect,
  onFolderSelect,
  onSwitchToGitHub,
}: WizardStepUrdfProps): ReactNode {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        onFileSelect(files)
      }
      e.target.value = ''
    },
    [onFileSelect],
  )

  const handleFolderChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        onFolderSelect(files)
      }
      e.target.value = ''
    },
    [onFolderSelect],
  )

  return (
    <div className={styles.container}>
      <div className={styles.iconContainer}>
        <FileText size={28} />
      </div>

      <h2 className={styles.title}>Upload Robot Description</h2>
      <p className={styles.description}>
        Select a URDF or XACRO file that defines your robot&apos;s structure
      </p>

      <div className={styles.formats}>
        <span className={styles.formatBadge}>.urdf</span>
        <span className={styles.formatBadge}>.xacro</span>
      </div>

      <div className={styles.buttonGroup}>
        <Button
          variant="primary"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={14} />
          Select File
        </Button>
        <Button
          variant="secondary"
          onClick={() => folderInputRef.current?.click()}
        >
          <FolderOpen size={14} />
          Upload Folder
        </Button>
      </div>

      <div className={styles.divider}>
        <span className={styles.dividerLine} />
        <span>or drag and drop</span>
        <span className={styles.dividerLine} />
      </div>

      <Button variant="ghost" size="sm" onClick={onSwitchToGitHub}>
        <Github size={14} />
        Load from GitHub
      </Button>

      <p className={styles.tip}>
        Tip: Drop your entire ROS package folder to auto-detect URDF and mesh
        files.
      </p>

      {/* 숨겨진 파일 input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={URDF_ACCEPT}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      {/* 폴더 업로드용 input */}
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory는 비표준이지만 모든 주요 브라우저가 지원
        webkitdirectory=""
        directory=""
        multiple
        onChange={handleFolderChange}
        style={{ display: 'none' }}
      />
    </div>
  )
}
