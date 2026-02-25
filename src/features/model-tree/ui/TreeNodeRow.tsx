import { useState, useCallback, type ReactNode } from 'react'
import { ChevronRight, Box, Waypoints, Eye, EyeOff } from 'lucide-react'
import { useRobotStore } from '@entities/robot'
import { Badge } from '@shared/ui'
import type { TreeNode } from '../lib/buildTree'
import styles from './TreeNodeRow.module.css'

interface TreeNodeRowProps {
  node: TreeNode
  depth: number
}

/**
 * 트리의 한 행을 재귀적으로 렌더링한다.
 * 링크 노드: Box 아이콘 + Eye 가시성 토글
 * 조인트 노드: Waypoints 아이콘 + 타입 Badge
 */
export function TreeNodeRow({ node, depth }: TreeNodeRowProps): ReactNode {
  const [isExpanded, setIsExpanded] = useState(depth < 2)
  const toggleLinkVisibility = useRobotStore((s) => s.toggleLinkVisibility)
  const hasChildren = node.children.length > 0

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev)
  }, [])

  const handleVisibilityClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (node.kind === 'link') {
        toggleLinkVisibility(node.id)
      }
    },
    [node.kind, node.id, toggleLinkVisibility],
  )

  const chevronClass = [
    styles.chevron,
    hasChildren ? styles.chevronVisible : '',
    isExpanded ? styles.chevronOpen : '',
  ]
    .filter(Boolean)
    .join(' ')

  const iconClass = [
    styles.icon,
    node.kind === 'link' ? styles.iconLink : styles.iconJoint,
  ].join(' ')

  return (
    <div className={styles.nodeGroup}>
      <div
        className={styles.row}
        style={{ paddingLeft: `${String(depth * 16 + 8)}px` }}
        onClick={hasChildren ? handleToggle : undefined}
      >
        {/* 접기/펴기 — row에도 onClick이 있으므로 버블링 방지 */}
        <button
          className={chevronClass}
          onClick={(e) => { e.stopPropagation(); handleToggle() }}
          type="button"
          tabIndex={hasChildren ? 0 : -1}
        >
          <ChevronRight size={12} />
        </button>

        {/* 아이콘 */}
        <span className={iconClass}>
          {node.kind === 'link' ? <Box size={14} /> : <Waypoints size={14} />}
        </span>

        {/* 이름 */}
        <span className={styles.name} title={node.name}>
          {node.name}
        </span>

        {/* 조인트: 타입 배지 */}
        {node.kind === 'joint' && node.jointType && (
          <Badge>{node.jointType}</Badge>
        )}

        {/* 링크: 가시성 토글 */}
        {node.kind === 'link' && (
          <button
            className={[
              styles.visibilityBtn,
              node.visible === false ? styles.visibilityHidden : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={handleVisibilityClick}
            type="button"
            title={node.visible !== false ? 'Hide link' : 'Show link'}
          >
            {node.visible !== false ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
        )}
      </div>

      {/* 자식 노드 재귀 */}
      {hasChildren && isExpanded && (
        <div className={styles.children}>
          {node.children.map((child) => (
            <TreeNodeRow
              key={`${child.kind}-${child.id}`}
              node={child}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
