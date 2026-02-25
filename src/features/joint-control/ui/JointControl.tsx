import { useCallback, type ReactNode } from 'react'
import { useRobotStore, useUIStore } from '@entities/robot'
import { Slider, Badge } from '@shared/ui'
import type { JointState } from '@shared/types'
import styles from './JointControl.module.css'

const RAD_TO_DEG = 180 / Math.PI
const DEG_TO_RAD = Math.PI / 180

interface JointControlProps {
  joint: JointState
}

/**
 * 단일 조인트 행 — 이름, 타입 배지, 슬라이더를 표시한다.
 * 스토어의 angleUnit에 따라 rad/deg 변환을 표시 경계에서 처리한다.
 * 내부 저장은 항상 라디안.
 */
export function JointControl({ joint }: JointControlProps): ReactNode {
  const angleUnit = useUIStore((s) => s.angleUnit)
  const ignoreLimits = useUIStore((s) => s.ignoreLimits)
  const isPrismatic = joint.type === 'prismatic'
  const useDeg = !isPrismatic && angleUnit === 'deg'

  const step = isPrismatic ? 0.001 : useDeg ? 1 : 0.01
  const unit = isPrismatic ? 'm' : useDeg ? 'deg' : 'rad'

  // ignoreLimits 시 슬라이더 범위를 ±2π(revolute) 또는 ±10(prismatic)로 확장
  const extendedMin = isPrismatic ? -10 : -2 * Math.PI
  const extendedMax = isPrismatic ? 10 : 2 * Math.PI
  const effectiveMin = ignoreLimits ? extendedMin : joint.min
  const effectiveMax = ignoreLimits ? extendedMax : joint.max

  // 표시값 변환 (rad → deg)
  const displayValue = useDeg ? joint.value * RAD_TO_DEG : joint.value
  const displayMin = useDeg ? effectiveMin * RAD_TO_DEG : effectiveMin
  const displayMax = useDeg ? effectiveMax * RAD_TO_DEG : effectiveMax

  // 입력값을 라디안으로 변환 후 스토어에 저장
  const handleChange = useCallback(
    (value: number) => {
      const radValue = useDeg ? value * DEG_TO_RAD : value
      useRobotStore.getState().setJointValue(joint.name, radValue)
    },
    [joint.name, useDeg],
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
        value={displayValue}
        min={displayMin}
        max={displayMax}
        step={step}
        unit={unit}
        onChange={handleChange}
      />
    </div>
  )
}
