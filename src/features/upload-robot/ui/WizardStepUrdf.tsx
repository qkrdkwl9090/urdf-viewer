import { useRef, useCallback, type ReactNode, type ChangeEvent } from 'react'
import { Bot, Upload, FolderOpen, Github, ChevronRight } from 'lucide-react'
import { Button } from '@shared/ui'
import { SAMPLE_ROBOTS } from '@shared/constants'
import type { SampleRobot, SampleRobotType } from '@shared/constants'
import styles from './WizardStepUrdf.module.css'

/** Step 1에서는 URDF/XACRO만 허용 */
const URDF_ACCEPT = '.urdf,.xacro'

/** 타입 → 컬러 도트 CSS 클래스 */
const TYPE_DOT_CLASS: Record<SampleRobotType, string> = {
  arm: styles.typeDotArm,
  mobile: styles.typeDotMobile,
  quadruped: styles.typeDotQuadruped,
  rover: styles.typeDotRover,
  educational: styles.typeDotEducational,
}

interface WizardStepUrdfProps {
  onFileSelect: (files: FileList) => void
  onFolderSelect: (files: FileList) => void
  onSwitchToGitHub: () => void
  /** 샘플 로봇 선택 */
  onSampleSelect: (sample: SampleRobot) => void
  /** 현재 로딩 중인 샘플 ID */
  loadingSampleId: string | null
}

/**
 * 업로드 위자드 Step 1.
 * 시각적 우선순위: 파일 업로드(Primary) → GitHub(Secondary) → 샘플(Tertiary)
 */
export function WizardStepUrdf({
  onFileSelect,
  onFolderSelect,
  onSwitchToGitHub,
  onSampleSelect,
  loadingSampleId,
}: WizardStepUrdfProps): ReactNode {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) onFileSelect(files)
      e.target.value = ''
    },
    [onFileSelect],
  )

  const handleFolderChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) onFolderSelect(files)
      e.target.value = ''
    },
    [onFolderSelect],
  )

  return (
    <div className={styles.container}>
      {/* 헤더 */}
      <div className={styles.iconContainer}>
        <Bot size={28} />
      </div>
      <h2 className={styles.title}>URDF Viewer</h2>
      <p className={styles.description}>Drop files here to get started</p>

      {/* Primary: 업로드 존 */}
      <div className={styles.uploadZone}>
        <div className={styles.buttonRow}>
          <Button variant="primary" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} />
            Upload File
          </Button>
          <Button variant="secondary" onClick={() => folderInputRef.current?.click()}>
            <FolderOpen size={14} />
            Upload Folder
          </Button>
        </div>
        <p className={styles.formatHint}>
          Supports <code>.urdf</code> and <code>.xacro</code> files
        </p>
      </div>

      {/* Secondary: GitHub 행 */}
      <button
        className={styles.githubRow}
        onClick={onSwitchToGitHub}
        type="button"
      >
        <Github size={16} className={styles.githubRowIcon} />
        <span className={styles.githubRowLabel}>Load from GitHub URL</span>
        <ChevronRight size={14} className={styles.githubRowIcon} />
      </button>

      {/* 구분선 */}
      <div className={styles.divider}>
        <span className={styles.dividerLine} />
        <span>or try a sample</span>
        <span className={styles.dividerLine} />
      </div>

      {/* Tertiary: 샘플 칩 */}
      <div className={styles.sampleList}>
        {SAMPLE_ROBOTS.map((robot) => {
          const isLoading = loadingSampleId === robot.id
          const isDisabled = loadingSampleId !== null && loadingSampleId !== robot.id

          const chipClass = [
            styles.sampleChip,
            isLoading ? styles.sampleChipLoading : '',
            isDisabled ? styles.sampleChipDisabled : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <button
              key={robot.id}
              className={chipClass}
              onClick={() => onSampleSelect(robot)}
              disabled={isLoading || isDisabled}
              aria-label={`Load ${robot.name} sample robot`}
              type="button"
            >
              <span className={`${styles.typeDot} ${TYPE_DOT_CLASS[robot.type]}`} />
              {isLoading ? (
                <>
                  <span className={styles.chipSpinner} />
                  Loading...
                </>
              ) : (
                robot.chipLabel
              )}
            </button>
          )
        })}
      </div>

      {/* 숨겨진 input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={URDF_ACCEPT}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
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
