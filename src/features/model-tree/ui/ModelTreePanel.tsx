import { useMemo, type ReactNode } from 'react'
import { GitFork } from 'lucide-react'
import { useRobotStore, useUIStore } from '@entities/robot'
import { Badge, Button } from '@shared/ui'
import { buildTree } from '../lib/buildTree'
import { TreeNodeRow } from './TreeNodeRow'
import styles from './ModelTreePanel.module.css'

/**
 * Model 탭 — URDF 로봇의 링크-조인트 계층 구조를 트리로 표시한다.
 * 링크 가시성 토글과 조인트 타입 표시를 지원한다.
 */
export function ModelTreePanel(): ReactNode {
  const robot = useRobotStore((s) => s.robot)
  const links = useRobotStore((s) => s.links)
  const openGraph = useUIStore((s) => s.openGraph)

  // 로봇의 Three.js 씬 그래프에서 트리 구조 생성
  const tree = useMemo(() => {
    if (!robot) return null
    return buildTree(robot, links)
  }, [robot, links])

  if (!robot || !tree) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyMessage}>No robot loaded</div>
      </div>
    )
  }

  const linkCount = Object.keys(robot.links).length
  const jointCount = Object.keys(robot.joints).length

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>{robot.robotName || 'Robot'}</span>
        <div className={styles.counts}>
          <Badge>{String(linkCount)} links</Badge>
          <Badge>{String(jointCount)} joints</Badge>
        </div>
      </div>
      <div className={styles.actions}>
        <Button variant="secondary" size="sm" onClick={openGraph}>
          <GitFork size={14} />
          View Graph
        </Button>
      </div>
      <div className={styles.tree}>
        <TreeNodeRow node={tree} depth={0} />
      </div>
    </div>
  )
}
