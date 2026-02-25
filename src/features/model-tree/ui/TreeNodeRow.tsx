import { useState, useCallback, type ReactNode } from 'react'
import { ChevronRight, Box, Waypoints, Eye, EyeOff } from 'lucide-react'
import { useRobotStore, useUIStore } from '@entities/robot'
import { Badge, Tooltip } from '@shared/ui'
import type { TreeNode } from '../lib/buildTree'
import styles from './TreeNodeRow.module.css'
import tooltipStyles from './TreeNodeTooltip.module.css'

interface TreeNodeRowProps {
  node: TreeNode
  depth: number
}

/** 조인트 노드의 tooltip 상세 정보 */
function JointNodeTooltip({ node }: { node: TreeNode }): ReactNode {
  const axisStr = node.axis
    ? `[${node.axis.map((v) => v.toFixed(1)).join(', ')}]`
    : null
  const hasLimits =
    node.jointType !== 'continuous' &&
    node.jointType !== 'fixed' &&
    node.limitLower !== undefined &&
    node.limitUpper !== undefined
  const limitsStr = hasLimits
    ? `${node.limitLower!.toFixed(3)} ~ ${node.limitUpper!.toFixed(3)} rad`
    : null

  return (
    <div className={tooltipStyles.grid}>
      <span className={tooltipStyles.label}>Type</span>
      <span className={tooltipStyles.value}>{node.jointType}</span>
      {axisStr && (
        <>
          <span className={tooltipStyles.label}>Axis</span>
          <span className={tooltipStyles.value}>{axisStr}</span>
        </>
      )}
      {limitsStr && (
        <>
          <span className={tooltipStyles.label}>Limits</span>
          <span className={tooltipStyles.value}>{limitsStr}</span>
        </>
      )}
      {node.parentLink && (
        <>
          <span className={tooltipStyles.label}>Parent</span>
          <span className={tooltipStyles.value}>{node.parentLink}</span>
        </>
      )}
      {node.childLink && (
        <>
          <span className={tooltipStyles.label}>Child</span>
          <span className={tooltipStyles.value}>{node.childLink}</span>
        </>
      )}
    </div>
  )
}

/** 링크 노드의 tooltip 상세 정보 */
function LinkNodeTooltip({ node }: { node: TreeNode }): ReactNode {
  return (
    <div className={tooltipStyles.grid}>
      {node.childJointCount !== undefined && (
        <>
          <span className={tooltipStyles.label}>Child joints</span>
          <span className={tooltipStyles.value}>{node.childJointCount}</span>
        </>
      )}
      {node.parentJoint && (
        <>
          <span className={tooltipStyles.label}>Parent joint</span>
          <span className={tooltipStyles.value}>{node.parentJoint}</span>
        </>
      )}
    </div>
  )
}

/**
 * 트리의 한 행을 재귀적으로 렌더링한다.
 * 링크 노드: Box 아이콘 + Eye 가시성 토글
 * 조인트 노드: Waypoints 아이콘 + 타입 Badge
 */
export function TreeNodeRow({ node, depth }: TreeNodeRowProps): ReactNode {
  const [isExpanded, setIsExpanded] = useState(depth < 2)
  const toggleLinkVisibility = useRobotStore((s) => s.toggleLinkVisibility)
  const selectedItem = useUIStore((s) => s.selectedItem)
  const selectItem = useUIStore((s) => s.selectItem)
  const hasChildren = node.children.length > 0
  const isSelected = selectedItem?.name === node.id && selectedItem?.kind === node.kind

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

  const handleRowClick = useCallback(() => {
    selectItem({ name: node.id, kind: node.kind })
    if (hasChildren) {
      setIsExpanded((prev) => !prev)
    }
  }, [selectItem, node.id, node.kind, hasChildren])

  const rowClass = [
    styles.row,
    isSelected ? styles.rowSelected : '',
  ].filter(Boolean).join(' ')

  const tooltipContent =
    node.kind === 'joint'
      ? <JointNodeTooltip node={node} />
      : <LinkNodeTooltip node={node} />

  return (
    <div className={styles.nodeGroup}>
      <Tooltip content={tooltipContent} position="right">
        <div
          className={rowClass}
          style={{ paddingLeft: `${String(depth * 16 + 8)}px` }}
          onClick={handleRowClick}
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
      </Tooltip>

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
