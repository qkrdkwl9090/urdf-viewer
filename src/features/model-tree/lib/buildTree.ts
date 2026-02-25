import type { Object3D } from 'three'
import type { URDFRobot, URDFJoint, URDFLink, JointType, LinkState } from '@shared/types'

export interface TreeNode {
  id: string
  name: string
  kind: 'link' | 'joint'
  /** 조인트 노드일 때만 존재 */
  jointType?: JointType
  /** 링크 노드일 때만 존재 */
  visible?: boolean
  children: TreeNode[]

  /* ── 조인트 tooltip 정보 ── */
  axis?: [number, number, number]
  limitLower?: number
  limitUpper?: number
  parentLink?: string
  childLink?: string

  /* ── 링크 tooltip 정보 ── */
  childJointCount?: number
  parentJoint?: string
}

// 타입 가드 — urdf-loader 클래스 판별
function isURDFJoint(obj: Object3D): obj is URDFJoint {
  return 'isURDFJoint' in obj && (obj as unknown as URDFJoint).isURDFJoint === true
}

function isURDFLink(obj: Object3D): obj is URDFLink {
  return 'isURDFLink' in obj && (obj as unknown as URDFLink).isURDFLink === true
}

/**
 * URDFRobot의 Three.js 씬 그래프를 재귀 순회하여 트리 구조를 생성한다.
 * 계층: Robot(root link) → Joint → Link → Joint → Link → ...
 */
export function buildTree(
  robot: URDFRobot,
  links: Map<string, LinkState>,
): TreeNode {
  function walkChildren(obj: Object3D): TreeNode[] {
    const nodes: TreeNode[] = []

    for (const child of obj.children) {
      if (isURDFJoint(child)) {
        // 부모 링크: Three.js 계층에서 Joint의 parent
        const parentLink = child.parent && isURDFLink(child.parent)
          ? child.parent.urdfName
          : undefined
        // 자식 링크: Joint의 children 중 첫 번째 URDFLink
        const childLinkObj = child.children.find((c): c is URDFLink => isURDFLink(c))
        const axis = child.axis
          ? [child.axis.x, child.axis.y, child.axis.z] as [number, number, number]
          : undefined

        nodes.push({
          id: child.urdfName,
          name: child.urdfName,
          kind: 'joint',
          jointType: child.jointType as JointType,
          axis,
          limitLower: child.limit?.lower,
          limitUpper: child.limit?.upper,
          parentLink,
          childLink: childLinkObj?.urdfName,
          children: walkChildren(child),
        })
      } else if (isURDFLink(child)) {
        const linkState = links.get(child.urdfName)
        // 부모 조인트: Three.js 계층에서 Link의 parent
        const parentJoint = child.parent && isURDFJoint(child.parent)
          ? child.parent.urdfName
          : undefined
        // 자식 조인트 수
        const childJointCount = child.children.filter((c) => isURDFJoint(c)).length

        nodes.push({
          id: child.urdfName,
          name: child.urdfName,
          kind: 'link',
          visible: linkState?.visible ?? true,
          parentJoint,
          childJointCount,
          children: walkChildren(child),
        })
      } else {
        // 비URDF 노드(Visual, Collider, Mesh 등)는 건너뛰되 하위는 계속 탐색
        nodes.push(...walkChildren(child))
      }
    }

    return nodes
  }

  const rootLinkState = links.get(robot.urdfName)
  return {
    id: robot.urdfName,
    name: robot.robotName || robot.urdfName,
    kind: 'link',
    visible: rootLinkState?.visible ?? true,
    children: walkChildren(robot),
  }
}
