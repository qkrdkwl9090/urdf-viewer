import { useCallback, useMemo, type ReactNode } from 'react'
import { useRobotStore } from '@entities/robot'
import { Button, Badge } from '@shared/ui'
import type { JointState } from '@shared/types'
import { JointControl } from './JointControl'
import styles from './JointPanel.module.css'

/**
 * 제어 가능한 조인트 목록 패널.
 * fixed 타입은 제외하고 나머지 조인트를 슬라이더로 표시한다.
 */
export function JointPanel(): ReactNode {
  const joints = useRobotStore((s) => s.joints)
  const resetJoints = useRobotStore((s) => s.resetJoints)

  const handleReset = useCallback(() => {
    resetJoints()
  }, [resetJoints])

  // fixed 조인트를 제외한 제어 가능 조인트 목록
  const controllableJoints = useMemo(() => {
    const result: JointState[] = []
    for (const joint of joints.values()) {
      if (joint.type !== 'fixed') {
        result.push(joint)
      }
    }
    return result
  }, [joints])

  const jointCount = controllableJoints.length

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.title}>Joints</span>
          <Badge variant="accent">{jointCount}</Badge>
        </div>
        {jointCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleReset}>
            Reset All
          </Button>
        )}
      </div>

      {jointCount > 0 ? (
        <div className={styles.list}>
          {controllableJoints.map((joint) => (
            <JointControl key={joint.name} joint={joint} />
          ))}
        </div>
      ) : (
        <div className={styles.emptyMessage}>
          No controllable joints
        </div>
      )}
    </div>
  )
}
