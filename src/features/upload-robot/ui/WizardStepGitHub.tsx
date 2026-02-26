import {
  useState,
  useCallback,
  useEffect,
  type ReactNode,
  type KeyboardEvent,
} from 'react'
import { Github, ArrowLeft } from 'lucide-react'
import { Button } from '@shared/ui'
import { useGitHubLoader } from '../lib/useGitHubLoader'
import type { GitHubTreeEntry } from '@shared/lib'
import styles from './WizardStepGitHub.module.css'

interface WizardStepGitHubProps {
  onBack: () => void
  /** 미해석 메시가 있을 때 호출 — UploadWizard가 Step 2로 전환 */
  onNeedsMeshes: () => void
}

/**
 * GitHub 레포에서 URDF를 로딩하는 위자드 스텝.
 * 내부 상태(phase)에 따라 URL 입력 / 파일 선택 / 로딩 UI를 전환한다.
 */
export function WizardStepGitHub({
  onBack,
  onNeedsMeshes,
}: WizardStepGitHubProps): ReactNode {
  const [urlInput, setUrlInput] = useState('')
  const [selectedEntry, setSelectedEntry] = useState<GitHubTreeEntry | null>(null)
  const { state, fetchRepo, selectUrdfFile, reset } = useGitHubLoader()

  const handleLoad = useCallback(() => {
    if (!urlInput.trim()) return
    fetchRepo(urlInput.trim())
  }, [urlInput, fetchRepo])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleLoad()
    },
    [handleLoad],
  )

  const handleSelectAndLoad = useCallback(() => {
    if (!selectedEntry) return
    selectUrdfFile(selectedEntry)
  }, [selectedEntry, selectUrdfFile])

  const handleBackToInput = useCallback(() => {
    reset()
    setUrlInput('')
    setSelectedEntry(null)
  }, [reset])

  // 미해석 메시 발견 시 UploadWizard의 Step 2로 전환
  useEffect(() => {
    if (state.phase === 'needs-meshes') {
      onNeedsMeshes()
    }
  }, [state.phase, onNeedsMeshes])

  // idle 또는 error(URL 입력 단계) — URL 입력 폼
  if (state.phase === 'idle' || (state.phase === 'error' && state.urdfFiles.length === 0)) {
    return (
      <div className={styles.container}>
        <div className={styles.iconContainer}>
          <Github size={28} />
        </div>

        <h2 className={styles.title}>Load from GitHub</h2>
        <p className={styles.description}>
          Paste a link to a public GitHub repository containing URDF files
        </p>

        <div className={styles.inputGroup}>
          <input
            className={`${styles.urlInput} ${state.phase === 'error' ? styles.urlInputError : ''}`}
            type="url"
            placeholder="https://github.com/owner/repo"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleLoad}
            disabled={!urlInput.trim()}
          >
            Load
          </Button>
        </div>

        {state.phase === 'error' && state.error && (
          <p className={styles.inlineError}>{state.error}</p>
        )}

        <div className={styles.divider}>
          <span className={styles.dividerLine} />
          <span>or</span>
          <span className={styles.dividerLine} />
        </div>

        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft size={14} />
          Back to file upload
        </Button>
      </div>
    )
  }

  // fetching-tree — 로딩중
  if (state.phase === 'fetching-tree') {
    return (
      <div className={styles.container}>
        <div className={styles.iconContainer}>
          <Github size={28} />
        </div>
        <div className={styles.loadingRow}>
          <div className={styles.miniSpinner} />
          <span>Scanning repository...</span>
        </div>
      </div>
    )
  }

  // loading-urdf — URDF 로딩중
  if (state.phase === 'loading-urdf') {
    return (
      <div className={styles.container}>
        <div className={styles.iconContainer}>
          <Github size={28} />
        </div>
        <div className={styles.loadingRow}>
          <div className={styles.miniSpinner} />
          <span>Loading robot model...</span>
        </div>
      </div>
    )
  }

  // select-urdf — URDF 파일 선택
  if (state.phase === 'select-urdf' || (state.phase === 'error' && state.urdfFiles.length > 0)) {
    return (
      <div className={styles.container}>
        <h2 className={styles.selectTitle}>Select Robot Description</h2>
        <p className={styles.selectDescription}>
          Found {state.urdfFiles.length} URDF/XACRO file{state.urdfFiles.length > 1 ? 's' : ''}
        </p>

        <div className={styles.fileList}>
          {state.urdfFiles.map((entry) => {
            const isSelected = selectedEntry?.path === entry.path
            const ext = entry.path.split('.').pop()?.toLowerCase() ?? ''
            return (
              <div
                key={entry.path}
                className={`${styles.fileRow} ${isSelected ? styles.fileRowSelected : ''}`}
                onClick={() => setSelectedEntry(entry)}
              >
                <span className={`${styles.radio} ${isSelected ? styles.radioSelected : ''}`} />
                <span className={styles.filePath}>{entry.path}</span>
                <span className={styles.fileBadge}>.{ext}</span>
              </div>
            )
          })}
        </div>

        {state.phase === 'error' && state.error && (
          <p className={styles.inlineError}>{state.error}</p>
        )}

        <div className={styles.actions}>
          <Button variant="ghost" size="sm" onClick={handleBackToInput}>
            <ArrowLeft size={14} />
            Back
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSelectAndLoad}
            disabled={!selectedEntry}
          >
            Load Robot
          </Button>
        </div>
      </div>
    )
  }

  // done — UploadWizard가 로봇 로딩 후 자동으로 닫힘
  return null
}
