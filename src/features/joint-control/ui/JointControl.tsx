import { useCallback, type ReactNode } from 'react'
import { useRobotStore } from '@entities/robot'
import { Slider, Badge } from '@shared/ui'
import type { JointState } from '@shared/types'
import styles from './JointControl.module.css'

interface JointControlProps {
  joint: JointState
}

/**
 * 단일 조인트 행 — 이름, 타입 배지, 슬라이더를 표시한다.
 * 슬라이더 변경 시 스토어를 직접 호출해 불필요한 리렌더링을 방지한다.
 */
export function JointControl({ joint }: JointControlProps): ReactNode {
  // prismatic 조인트는 더 작은 스텝과 'm' 단위 사용
  const isPrismatic = joint.type === 'prismatic'
  const step = isPrismatic ? 0.001 : 0.01
  const unit = isPrismatic ? 'm' : 'rad'

  // 스토어 직접 호출로 리렌더링 최소화
  const handleChange = useCallback(
    (value: number) => {
      useRobotStore.getState().setJointValue(joint.name, value)
    },
    [joint.name],
  )

  return (
    <div className={styles.row}>
      <div className={styles.header}>
        <span className={styles.name} title={joint.name}>
          {joint.name}
        </span>
        <Badge>{joint.type}</Badge>
      </div>
      <Slider
        value={joint.value}
        min={joint.min}
        max={joint.max}
        step={step}
        unit={unit}
        onChange={handleChange}
      />
    </div>
  )
}
