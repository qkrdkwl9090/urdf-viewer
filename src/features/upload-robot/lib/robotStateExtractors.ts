import type {
  JointState,
  JointType,
  LinkState,
  URDFRobot,
} from '@shared/types'

/**
 * URDFRobot에서 조인트 상태를 추출한다.
 * fixed 타입은 사용자가 조작할 수 없으므로 제외한다.
 */
export function extractJointStates(robot: URDFRobot): Map<string, JointState> {
  const joints = new Map<string, JointState>()

  for (const [name, joint] of Object.entries(robot.joints)) {
    if (joint.jointType === 'fixed') continue

    const state: JointState = {
      name,
      type: joint.jointType as JointType,
      value: joint.jointValue[0] ?? 0,
      min: joint.limit.lower,
      max: joint.limit.upper,
      axis: [joint.axis.x, joint.axis.y, joint.axis.z],
    }

    joints.set(name, state)
  }

  return joints
}

/**
 * URDFRobot에서 링크 상태를 추출한다.
 * 모든 링크는 초기에 visible: true로 설정된다.
 */
export function extractLinkStates(robot: URDFRobot): Map<string, LinkState> {
  const links = new Map<string, LinkState>()

  for (const name of Object.keys(robot.links)) {
    links.set(name, { name, visible: true })
  }

  return links
}
