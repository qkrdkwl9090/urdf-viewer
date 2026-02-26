import type { ReactNode } from 'react'
import { useRobotStore, useUIStore } from '@entities/robot'
import { useKeyboardShortcuts } from '@shared/lib'
import { Header } from '@widgets/header'
import { ViewerCanvas } from '@widgets/viewer-panel'
import { ParameterPanel } from '@widgets/parameter-panel'
import { UploadWizard } from '@features/upload-robot'
import { EditorModal } from '@features/urdf-editor'
import { ErrorBanner, ShortcutsModal } from '@shared/ui'
import styles from './ViewerPage.module.css'

/**
 * 메인 뷰어 페이지 — 전체 레이아웃을 CSS Grid로 구성
 * Header (상단 전체), ViewerCanvas (좌측 뷰포트), ParameterPanel (우측 패널)
 */
export function ViewerPage(): ReactNode {
  const robotName = useRobotStore((s) => s.robotName)
  const error = useRobotStore((s) => s.error)
  const setError = useRobotStore((s) => s.setError)

  // 전역 키보드 단축키 등록
  useKeyboardShortcuts()
  const showShortcuts = useUIStore((s) => s.showShortcuts)
  const closeShortcuts = useUIStore((s) => s.closeShortcuts)
  const isEditorOpen = useUIStore((s) => s.isEditorOpen)
  const closeEditor = useUIStore((s) => s.closeEditor)

  // 로봇이 로드되지 않았으면 EmptyState 오버레이 표시
  const hasRobot = robotName !== null

  return (
    <div className={styles.layout}>
      <div className={styles.headerArea}>
        <Header />
      </div>

      <div className={styles.viewportArea}>
        <ViewerCanvas />

        {/* 에러 배너 — 뷰포트 상단에 오버레이로 표시 */}
        {error && hasRobot && (
          <div className={styles.errorContainer}>
            <ErrorBanner
              message={error}
              onDismiss={() => setError(null)}
            />
          </div>
        )}

        {!hasRobot && <UploadWizard />}
      </div>

      <div className={styles.panelArea}>
        <ParameterPanel />
      </div>

      {showShortcuts && <ShortcutsModal onClose={closeShortcuts} />}
      {isEditorOpen && <EditorModal onClose={closeEditor} />}
    </div>
  )
}
