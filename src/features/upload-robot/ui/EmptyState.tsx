import {
  useCallback,
  useRef,
  useState,
  type ReactNode,
  type DragEvent,
  type ChangeEvent,
} from 'react'
import { Upload, FolderOpen } from 'lucide-react'
import { useRobotStore } from '@entities/robot'
import { Button } from '@shared/ui'
import { useURDFLoader } from '../lib/useURDFLoader'
import styles from './EmptyState.module.css'

const SUPPORTED_FORMATS = ['.urdf', '.xacro', '.stl', '.dae'] as const

/** 개별 파일 업로드용 accept 속성 */
const FILE_ACCEPT = '.urdf,.xacro,.stl,.dae,.obj'

/**
 * 로봇이 로드되지 않았을 때 뷰포트 위에 표시되는 빈 상태 오버레이.
 * 클릭 업로드와 드래그 앤 드롭을 모두 지원한다.
 */
export function EmptyState(): ReactNode {
  const { loadRobot, loadRobotFromDrop } = useURDFLoader()
  const isLoading = useRobotStore((s) => s.isLoading)
  const error = useRobotStore((s) => s.error)

  const [isDragging, setIsDragging] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        void loadRobot(files)
      }
      // input 값 초기화 -- 같은 파일을 다시 업로드할 수 있도록
      e.target.value = ''
    },
    [loadRobot],
  )

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    // relatedTarget이 uploadZone 밖으로 나갔을 때만 비활성화
    const target = e.currentTarget
    const related = e.relatedTarget as Node | null
    if (!related || !target.contains(related)) {
      setIsDragging(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const { items, files } = e.dataTransfer

      // webkitGetAsEntry가 지원되면 폴더 구조까지 재귀 탐색
      const firstEntry = items.length > 0 ? items[0].webkitGetAsEntry?.() : null
      if (firstEntry) {
        void loadRobotFromDrop(items)
        return
      }

      // 일반 파일 드롭 폴백
      if (files.length > 0) {
        void loadRobot(files)
      }
    },
    [loadRobot, loadRobotFromDrop],
  )

  const uploadZoneClass = [
    styles.uploadZone,
    isDragging ? styles.uploadZoneDragging : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={styles.overlay}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={uploadZoneClass}>
        {isLoading ? (
          <LoadingIndicator />
        ) : (
          <>
            <div className={styles.iconContainer}>
              <Upload size={48} strokeWidth={1.5} />
            </div>

            <h2 className={styles.title}>Upload a URDF File</h2>

            <p className={styles.subtitle}>
              Drag and drop your robot description files,
              <br />
              or use the buttons below
            </p>

            <div className={styles.buttonGroup}>
              <Button
                variant="primary"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={14} />
                Upload Files
              </Button>
              <Button
                variant="secondary"
                onClick={() => folderInputRef.current?.click()}
              >
                <FolderOpen size={14} />
                Upload Folder
              </Button>
            </div>

            <div className={styles.formats}>
              <span className={styles.formatLabel}>Supported:</span>
              {SUPPORTED_FORMATS.map((fmt) => (
                <span key={fmt} className={styles.formatBadge}>
                  {fmt}
                </span>
              ))}
            </div>

            <p className={styles.tip}>
              Tip: Upload the entire robot package folder to include all mesh
              files
            </p>

            {error && <p className={styles.error}>{error}</p>}
          </>
        )}
      </div>

      {/* 숨겨진 파일 input 요소들 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={FILE_ACCEPT}
        onChange={handleFileChange}
        className={styles.hiddenInput}
      />
      {/* 폴더 업로드용 input */}
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory는 비표준이지만 모든 주요 브라우저가 지원
        webkitdirectory=""
        directory=""
        multiple
        onChange={handleFileChange}
        className={styles.hiddenInput}
      />
    </div>
  )
}

/** 로딩 중 표시 컴포넌트 */
function LoadingIndicator(): ReactNode {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.spinner} />
      <p className={styles.loadingText}>Loading robot model...</p>
    </div>
  )
}
