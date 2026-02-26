import type { Object3D } from 'three'
import type { URDFRobot, URDFJoint, URDFLink, JointType } from '@shared/types'

/** 키네마틱 그래프의 노드 (= URDF 링크) */
export interface KinematicNode {
  id: string
  name: string
  /** 이 노드를 부모에 연결하는 조인트 정보 (루트에는 없음) */
  jointToParent?: {
    name: string
    type: JointType
  }
  children: KinematicNode[]
}

// 타입 가드 — urdf-loader 클래스 판별
function isURDFJoint(obj: Object3D): obj is URDFJoint {
  return 'isURDFJoint' in obj && (obj as unknown as URDFJoint).isURDFJoint === true
}

function isURDFLink(obj: Object3D): obj is URDFLink {
  return 'isURDFLink' in obj && (obj as unknown as URDFLink).isURDFLink === true
}

/**
 * URDFRobot의 씬 그래프에서 키네마틱 체인을 추출한다.
 * 링크를 노드로, 조인트를 엣지(부모→자식 연결)로 취급하는 트리 구조를 생성.
 * d3-hierarchy 입력으로 바로 사용 가능한 형태.
 */
export function buildKinematicGraph(robot: URDFRobot): KinematicNode {
  /** 링크 아래의 조인트→링크 관계를 재귀적으로 수집 */
  function walkFromLink(linkObj: Object3D): KinematicNode[] {
    const children: KinematicNode[] = []

    for (const child of linkObj.children) {
      if (isURDFJoint(child)) {
        // 조인트의 자식 중 URDFLink를 찾아 다음 노드로
        const childLink = child.children.find(
          (c): c is URDFLink => isURDFLink(c),
        )
        if (childLink) {
          children.push({
            id: childLink.urdfName,
            name: childLink.urdfName,
            jointToParent: {
              name: child.urdfName,
              type: child.jointType as JointType,
            },
            children: walkFromLink(childLink),
          })
        }
      } else if (!isURDFLink(child)) {
        // Visual/Collider 등 비URDF 노드는 건너뛰되 하위 탐색
        children.push(...walkFromLink(child))
      }
    }

    return children
  }

  return {
    id: robot.urdfName,
    name: robot.robotName || robot.urdfName,
    children: walkFromLink(robot),
  }
}
