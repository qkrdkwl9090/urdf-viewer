import type { ReactNode } from 'react'
import { useRobotStore } from '@entities/robot'
import { Header } from '@widgets/header'
import { ViewerCanvas } from '@widgets/viewer-panel'
import { ParameterPanel } from '@widgets/parameter-panel'
import { EmptyState } from '@features/upload-robot'
import styles from './ViewerPage.module.css'

/**
 * 메인 뷰어 페이지 — 전체 레이아웃을 CSS Grid로 구성
 * Header (상단 전체), ViewerCanvas (좌측 뷰포트), ParameterPanel (우측 패널)
 */
export function ViewerPage(): ReactNode {
  const robotName = useRobotStore((s) => s.robotName)
  // 로봇이 로드되지 않았으면 EmptyState 오버레이 표시
  const hasRobot = robotName !== null

  return (
    <div className={styles.layout}>
      <div className={styles.headerArea}>
        <Header />
      </div>

      <div className={styles.viewportArea}>
        <ViewerCanvas />
        {!hasRobot && <EmptyState />}
      </div>

      <div className={styles.panelArea}>
        <ParameterPanel />
      </div>
    </div>
  )
}
