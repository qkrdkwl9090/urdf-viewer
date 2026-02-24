import {
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
  type ChangeEvent,
} from 'react'
import { Check, AlertTriangle, Plus, FolderPlus, ArrowLeft } from 'lucide-react'
import type { MeshReference } from '@shared/types'
import { Button } from '@shared/ui'
import styles from './WizardStepMeshes.module.css'

/** 메시 파일 업로드용 accept 속성 */
const MESH_ACCEPT = '.stl,.dae,.obj'

interface WizardStepMeshesProps {
  meshReferences: MeshReference[]
  onAddFiles: (files: FileList) => void
  onAddFolder: (files: FileList) => void
  onBuildRobot: () => void
  onBack: () => void
}

/**
 * 업로드 위자드 Step 2 — 메시 파일 추가.
 * URDF에서 참조하는 메시의 해석 상태를 보여주고,
 * 미해석 메시를 위한 파일 업로드를 지원한다.
 */
export function WizardStepMeshes({
  meshReferences,
  onAddFiles,
  onAddFolder,
  onBuildRobot,
  onBack,
}: WizardStepMeshesProps): ReactNode {
  const meshInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const handleMeshFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        onAddFiles(files)
      }
      e.target.value = ''
    },
    [onAddFiles],
  )

  const handleFolderChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        onAddFolder(files)
      }
      e.target.value = ''
    },
    [onAddFolder],
  )

  // 메시 해석 통계
  const stats = useMemo(() => {
    const total = meshReferences.length
    const resolved = meshReferences.filter((r) => r.resolved).length
    return { total, resolved }
  }, [meshReferences])

  // 미해석 우선 정렬
  const sortedRefs = useMemo(() => {
    return [...meshReferences].sort((a, b) => {
      if (a.resolved === b.resolved) return 0
      return a.resolved ? 1 : -1
    })
  }, [meshReferences])

  const isComplete = stats.resolved === stats.total
  const percentage =
    stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0

  const progressLabelClass = [
    styles.progressLabel,
    isComplete ? styles.progressLabelComplete : '',
  ]
    .filter(Boolean)
    .join(' ')

  const progressFillClass = [
    styles.progressFill,
    isComplete ? styles.progressFillComplete : '',
  ]
    .filter(Boolean)
    .join(' ')

  const progressText = isComplete
    ? `All ${String(stats.total)} meshes resolved`
    : `${String(stats.resolved)} / ${String(stats.total)} meshes resolved`

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Add Mesh Files</h2>
      <p className={styles.subtitle}>
        Your URDF references the following mesh files.
        {!isComplete && ' Upload the missing files to complete your robot.'}
      </p>

      {/* 메시 해석 진행도 */}
      {stats.total > 0 && (
        <div className={styles.progressContainer}>
          <span className={progressLabelClass}>{progressText}</span>
          <div className={styles.progressTrack}>
            <div
              className={progressFillClass}
              style={{ width: `${String(percentage)}%` }}
            />
          </div>
        </div>
      )}

      {/* 메시 참조 리스트 */}
      {sortedRefs.length > 0 && (
        <div className={styles.meshList}>
          {sortedRefs.map((ref) => (
            <div key={ref.urdfPath} className={styles.meshRow}>
              <span
                className={[
                  styles.statusIcon,
                  ref.resolved ? styles.statusResolved : styles.statusMissing,
                ].join(' ')}
              >
                {ref.resolved ? (
                  <Check size={12} />
                ) : (
                  <AlertTriangle size={12} />
                )}
              </span>
              <span className={styles.meshPath} title={ref.urdfPath}>
                {ref.urdfPath}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 파일 추가 버튼 */}
      {!isComplete && (
        <div className={styles.addButtonGroup}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => meshInputRef.current?.click()}
          >
            <Plus size={12} />
            Add Files
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => folderInputRef.current?.click()}
          >
            <FolderPlus size={12} />
            Add Folder
          </Button>
        </div>
      )}

      {/* 하단 액션 버튼 */}
      <div className={styles.actions}>
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft size={12} />
          Back
        </Button>
        <Button variant="primary" onClick={onBuildRobot}>
          Load Robot
        </Button>
      </div>

      {/* 숨겨진 파일 input */}
      <input
        ref={meshInputRef}
        type="file"
        multiple
        accept={MESH_ACCEPT}
        onChange={handleMeshFileChange}
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
