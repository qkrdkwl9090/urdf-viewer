import {
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
  type ChangeEvent,
} from 'react'
import { Check, AlertTriangle, Plus, FolderPlus, ArrowLeft } from 'lucide-react'
import type { MeshReference, XacroIncludeReference } from '@shared/types'
import { Button } from '@shared/ui'
import styles from './WizardStepMeshes.module.css'

/** 메시 + XACRO 파일 업로드용 accept 속성 */
const FILE_ACCEPT = '.stl,.dae,.obj,.urdf,.xacro'

interface WizardStepMeshesProps {
  meshReferences: MeshReference[]
  xacroIncludes: XacroIncludeReference[]
  onAddFiles: (files: FileList) => void
  onAddFolder: (files: FileList) => void
  onBuildRobot: () => void
  onBack: () => void
}

/**
 * 업로드 위자드 Step 2 — 의존 파일 추가.
 * XACRO include 해석 상태와 메시 해석 상태를 보여주고,
 * 미해석 파일을 위한 업로드를 지원한다.
 */
export function WizardStepMeshes({
  meshReferences,
  xacroIncludes,
  onAddFiles,
  onAddFolder,
  onBuildRobot,
  onBack,
}: WizardStepMeshesProps): ReactNode {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = useCallback(
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

  // XACRO include 해석 통계
  const includeStats = useMemo(() => {
    const total = xacroIncludes.length
    const resolved = xacroIncludes.filter((r) => r.resolved).length
    return { total, resolved }
  }, [xacroIncludes])

  // 메시 해석 통계
  const meshStats = useMemo(() => {
    const total = meshReferences.length
    const resolved = meshReferences.filter((r) => r.resolved).length
    return { total, resolved }
  }, [meshReferences])

  // 미해석 우선 정렬
  const sortedIncludes = useMemo(() => {
    return [...xacroIncludes].sort((a, b) => {
      if (a.resolved === b.resolved) return 0
      return a.resolved ? 1 : -1
    })
  }, [xacroIncludes])

  const sortedMeshRefs = useMemo(() => {
    return [...meshReferences].sort((a, b) => {
      if (a.resolved === b.resolved) return 0
      return a.resolved ? 1 : -1
    })
  }, [meshReferences])

  const hasUnresolvedIncludes = includeStats.resolved < includeStats.total
  const isMeshComplete = meshStats.total > 0 && meshStats.resolved === meshStats.total
  const isAllComplete = !hasUnresolvedIncludes && (meshStats.total === 0 || isMeshComplete)
  const hasAnyUnresolved = hasUnresolvedIncludes || (meshStats.total > 0 && !isMeshComplete)

  // 타이틀/서브타이틀 결정
  const hasIncludes = xacroIncludes.length > 0
  const hasMeshes = meshReferences.length > 0
  const title = hasIncludes && !hasMeshes
    ? 'Add Required Files'
    : hasIncludes && hasMeshes
      ? 'Resolve Dependencies'
      : 'Add Mesh Files'
  const subtitle = hasUnresolvedIncludes
    ? 'Your XACRO file requires additional include files. Upload them to continue.'
    : hasMeshes && !isMeshComplete
      ? 'Your URDF references the following mesh files. Upload the missing files to complete your robot.'
      : hasMeshes
        ? 'All dependencies resolved.'
        : 'All include files resolved.'

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.subtitle}>{subtitle}</p>

      {/* XACRO Include 섹션 */}
      {hasIncludes && (
        <DependencySection
          label="XACRO Includes"
          total={includeStats.total}
          resolved={includeStats.resolved}
          items={sortedIncludes.map((ref) => ({
            key: ref.path,
            path: ref.path,
            resolved: ref.resolved,
          }))}
        />
      )}

      {/* 메시 참조 섹션 */}
      {hasMeshes && (
        <DependencySection
          label="Mesh Files"
          total={meshStats.total}
          resolved={meshStats.resolved}
          items={sortedMeshRefs.map((ref) => ({
            key: ref.urdfPath,
            path: ref.urdfPath,
            resolved: ref.resolved,
          }))}
        />
      )}

      {/* 파일 추가 버튼 */}
      {hasAnyUnresolved && (
        <div className={styles.addButtonGroup}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
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
        <Button
          variant="primary"
          onClick={onBuildRobot}
          disabled={!isAllComplete}
        >
          Load Robot
        </Button>
      </div>

      {/* 숨겨진 파일 input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={FILE_ACCEPT}
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

/**
 * 의존성 섹션 — 진행도 + 파일 목록을 표시하는 재사용 컴포넌트.
 * XACRO includes와 메시 참조 모두에 사용된다.
 */
function DependencySection({
  label,
  total,
  resolved,
  items,
}: {
  label: string
  total: number
  resolved: number
  items: { key: string; path: string; resolved: boolean }[]
}): ReactNode {
  const isComplete = resolved === total
  const percentage = total > 0 ? Math.round((resolved / total) * 100) : 0

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
    ? `All ${String(total)} ${label.toLowerCase()} resolved`
    : `${String(resolved)} / ${String(total)} ${label.toLowerCase()} resolved`

  return (
    <>
      <div className={styles.progressContainer}>
        <span className={styles.sectionLabel}>{label}</span>
        <span className={progressLabelClass}>{progressText}</span>
        <div className={styles.progressTrack}>
          <div
            className={progressFillClass}
            style={{ width: `${String(percentage)}%` }}
          />
        </div>
      </div>

      <div className={styles.meshList}>
        {items.map((item) => (
          <div key={item.key} className={styles.meshRow}>
            <span
              className={[
                styles.statusIcon,
                item.resolved ? styles.statusResolved : styles.statusMissing,
              ].join(' ')}
            >
              {item.resolved ? (
                <Check size={12} />
              ) : (
                <AlertTriangle size={12} />
              )}
            </span>
            <span className={styles.meshPath} title={item.path}>
              {item.path}
            </span>
          </div>
        ))}
      </div>
    </>
  )
}
