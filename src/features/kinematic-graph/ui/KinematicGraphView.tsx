import { useMemo, useCallback, type ReactNode } from 'react'
import { hierarchy, tree } from 'd3-hierarchy'
import { useRobotStore, useUIStore } from '@entities/robot'
import type { JointType } from '@shared/types'
import { buildKinematicGraph, type KinematicNode } from '../lib/buildGraph'
import styles from './KinematicGraphView.module.css'

const NODE_H = 32
/** 모노스페이스 글자 하나의 대략적 폭 (11px 기준) */
const CHAR_W = 6.8
/** 노드 좌우 패딩 */
const NODE_PAD = 20
/** 엣지 라벨 글자 폭 (9px 기준) */
const LABEL_CHAR_W = 5.6
const LABEL_PAD = 16
const LABEL_H = 28
/** 트리 레이아웃 간격 */
const LEVEL_GAP = 120
/** 여백 */
const PADDING = 40

/** 조인트 타입 → 엣지 라인 CSS 클래스 */
function edgeClass(type: JointType): string {
  switch (type) {
    case 'revolute': return styles.edgeRevolute
    case 'continuous': return styles.edgeContinuous
    case 'prismatic': return styles.edgePrismatic
    case 'fixed': return styles.edgeFixed
    default: return styles.edgeOther
  }
}

/** 조인트 타입 → 타입 라벨 색상 CSS 클래스 */
function edgeTypeClass(type: JointType): string {
  switch (type) {
    case 'revolute': return styles.edgeTypeRevolute
    case 'continuous': return styles.edgeTypeContinuous
    case 'prismatic': return styles.edgeTypePrismatic
    case 'fixed': return styles.edgeTypeFixed
    default: return styles.edgeTypeOther
  }
}

/** 세로 방향 베지어 곡선 경로 */
function linkPath(sx: number, sy: number, tx: number, ty: number): string {
  const my = (sy + ty) / 2
  return `M${sx},${sy} C${sx},${my} ${tx},${my} ${tx},${ty}`
}

/**
 * 키네마틱 그래프를 SVG로 렌더링.
 * d3-hierarchy의 tree 레이아웃으로 좌표를 계산하고,
 * 링크를 노드(rect), 조인트를 엣지(path)로 표시한다.
 */
export function KinematicGraphView(): ReactNode {
  const robot = useRobotStore((s) => s.robot)
  const selectedItem = useUIStore((s) => s.selectedItem)
  const selectItem = useUIStore((s) => s.selectItem)

  const handleNodeClick = useCallback(
    (name: string) => {
      selectItem({ name, kind: 'link' })
    },
    [selectItem],
  )

  // 그래프 데이터 + 동적 사이즈 계산 + d3 레이아웃
  const layout = useMemo(() => {
    if (!robot) return null

    const graphData = buildKinematicGraph(robot)
    const root = hierarchy(graphData)

    // 가장 긴 노드 이름 / 엣지 이름 기준으로 동적 폭 계산
    let maxNodeNameLen = 0
    let maxEdgeNameLen = 0
    root.each((node) => {
      if (node.data.name.length > maxNodeNameLen) {
        maxNodeNameLen = node.data.name.length
      }
      if (node.data.jointToParent) {
        const jLen = node.data.jointToParent.name.length
        if (jLen > maxEdgeNameLen) maxEdgeNameLen = jLen
      }
    })

    const nodeW = Math.max(120, maxNodeNameLen * CHAR_W + NODE_PAD)
    const edgeLabelW = Math.max(60, maxEdgeNameLen * LABEL_CHAR_W + LABEL_PAD)
    // 형제 간격: 노드 폭과 엣지 라벨 폭 중 큰 쪽 + 여유
    const siblingGap = Math.max(nodeW, edgeLabelW) + 40

    const treeLayout = tree<KinematicNode>()
      .nodeSize([siblingGap, LEVEL_GAP])

    treeLayout(root)

    // x, y 범위 계산 (d3 tree는 x=가로, y=깊이)
    let minX = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    // treeLayout() 호출 후 x, y는 항상 할당되지만 d3 타입은 undefined 허용
    root.each((node) => {
      const nx = node.x ?? 0
      const ny = node.y ?? 0
      if (nx < minX) minX = nx
      if (nx > maxX) maxX = nx
      if (ny > maxY) maxY = ny
    })

    const width = maxX - minX + nodeW + PADDING * 2
    const height = maxY + NODE_H + PADDING * 2
    const offsetX = -minX + nodeW / 2 + PADDING

    return { root, width, height, offsetX, nodeW }
  }, [robot])

  if (!robot || !layout) {
    return (
      <div className={styles.emptyMessage}>
        Load a URDF file to view kinematic graph
      </div>
    )
  }

  const { root, width, height, offsetX, nodeW } = layout

  // 엣지 수집 (layout이 바뀔 때만 재계산)
  const edges = useMemo(() => {
    const result: Array<{
      key: string
      path: string
      jointName: string
      jointType: JointType
      mx: number
      my: number
    }> = []

    root.each((node) => {
      if (node.parent && node.data.jointToParent) {
        const sx = (node.parent.x ?? 0) + offsetX
        const sy = (node.parent.y ?? 0) + NODE_H / 2 + PADDING
        const tx = (node.x ?? 0) + offsetX
        const ty = (node.y ?? 0) - NODE_H / 2 + PADDING

        result.push({
          key: node.data.jointToParent.name,
          path: linkPath(sx, sy, tx, ty),
          jointName: node.data.jointToParent.name,
          jointType: node.data.jointToParent.type,
          mx: (sx + tx) / 2,
          my: (sy + ty) / 2,
        })
      }
    })

    return result
  }, [root, offsetX])

  return (
    <div className={styles.container}>
      <svg
        className={styles.svg}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
      >
        {/* 엣지 (조인트) */}
        {edges.map((edge) => {
          const labelW = Math.max(edge.jointName.length, edge.jointType.length) * LABEL_CHAR_W + LABEL_PAD

          return (
            <g key={edge.key}>
              <path
                d={edge.path}
                className={`${styles.edge} ${edgeClass(edge.jointType)}`}
              />
              {/* 라벨 배경 pill */}
              <rect
                x={edge.mx - labelW / 2}
                y={edge.my - LABEL_H / 2}
                width={labelW}
                height={LABEL_H}
                className={styles.edgeLabelBg}
              />
              <text x={edge.mx} y={edge.my - 5} className={styles.edgeLabel}>
                {edge.jointName}
              </text>
              <text x={edge.mx} y={edge.my + 7} className={`${styles.edgeType} ${edgeTypeClass(edge.jointType)}`}>
                {edge.jointType}
              </text>
              <title>{`${edge.jointName} (${edge.jointType})`}</title>
            </g>
          )
        })}

        {/* 노드 (링크) */}
        {root.descendants().map((node) => {
          const x = (node.x ?? 0) + offsetX - nodeW / 2
          const y = (node.y ?? 0) - NODE_H / 2 + PADDING
          const isRoot = node.depth === 0
          const isSelected =
            selectedItem?.kind === 'link' &&
            selectedItem.name === node.data.id

          const groupClass = [
            styles.node,
            isRoot && styles.nodeRoot,
            isSelected && styles.nodeSelected,
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <g
              key={node.data.id}
              className={groupClass}
              onClick={() => handleNodeClick(node.data.id)}
            >
              <rect x={x} y={y} width={nodeW} height={NODE_H} />
              <text x={x + nodeW / 2} y={y + NODE_H / 2} className={styles.nodeLabel}>
                {node.data.name}
              </text>
              <title>{node.data.name}</title>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
