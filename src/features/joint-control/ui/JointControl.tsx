import { useCallback, useMemo, useRef, useEffect, type ReactNode } from 'react'
import { useRobotStore, useUIStore } from '@entities/robot'
import { Slider, Badge, Tooltip } from '@shared/ui'
import type { JointState } from '@shared/types'
import styles from './JointControl.module.css'
import tooltipStyles from './JointTooltip.module.css'

const RAD_TO_DEG = 180 / Math.PI
const DEG_TO_RAD = Math.PI / 180

interface JointControlProps {
  joint: JointState
}

/** 조인트 tooltip에 표시할 상세 정보 */
function JointTooltipContent({ joint }: { joint: JointState }): ReactNode {
  const robot = useRobotStore((s) => s.robot)

  // urdf-loader 조인트 객체에서 부모/자식 링크 이름 조회
  const { parentLink, childLink } = useMemo(() => {
    if (!robot) return { parentLink: undefined, childLink: undefined }
    const urdfJoint = robot.joints[joint.name]
    if (!urdfJoint) return { parentLink: undefined, childLink: undefined }

    const parent = urdfJoint.parent
    const pName = parent && 'isURDFLink' in parent
      ? (parent as unknown as { urdfName: string }).urdfName
      : undefined

    const childLinkObj = urdfJoint.children.find(
      (c) => 'isURDFLink' in c && (c as unknown as { isURDFLink: boolean }).isURDFLink,
    )
    const cName = childLinkObj
      ? (childLinkObj as unknown as { urdfName: string }).urdfName
      : undefined

    return { parentLink: pName, childLink: cName }
  }, [robot, joint.name])

  const axisStr = `[${joint.axis.map((v) => v.toFixed(1)).join(', ')}]`
  const limitsStr = `${joint.min.toFixed(3)} ~ ${joint.max.toFixed(3)} rad`

  return (
    <div className={tooltipStyles.grid}>
      <span className={tooltipStyles.label}>Type</span>
      <span className={tooltipStyles.value}>{joint.type}</span>
      <span className={tooltipStyles.label}>Axis</span>
      <span className={tooltipStyles.value}>{axisStr}</span>
      {joint.type !== 'continuous' && joint.type !== 'fixed' && (
        <>
          <span className={tooltipStyles.label}>Limits</span>
          <span className={tooltipStyles.value}>{limitsStr}</span>
        </>
      )}
      {parentLink && (
        <>
          <span className={tooltipStyles.label}>Parent</span>
          <span className={tooltipStyles.value}>{parentLink}</span>
        </>
      )}
      {childLink && (
        <>
          <span className={tooltipStyles.label}>Child</span>
          <span className={tooltipStyles.value}>{childLink}</span>
        </>
      )}
    </div>
  )
}

/**
 * 단일 조인트 행 — 이름, 타입 배지, 슬라이더를 표시한다.
 * 스토어의 angleUnit에 따라 rad/deg 변환을 표시 경계에서 처리한다.
 * 내부 저장은 항상 라디안.
 */
export function JointControl({ joint }: JointControlProps): ReactNode {
  const angleUnit = useUIStore((s) => s.angleUnit)
  const ignoreLimits = useUIStore((s) => s.ignoreLimits)
  const selectedItem = useUIStore((s) => s.selectedItem)
  const selectItem = useUIStore((s) => s.selectItem)
  const robot = useRobotStore((s) => s.robot)
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

  // 조인트 선택 여부 — 직접 선택 or 자식 링크가 선택된 경우
  const isSelected = useMemo(() => {
    if (!selectedItem || !robot) return false
    if (selectedItem.kind === 'joint' && selectedItem.name === joint.name) return true
    if (selectedItem.kind === 'link') {
      const urdfJoint = robot.joints[joint.name]
      if (!urdfJoint) return false
      const childLink = urdfJoint.children.find(
        (c) => 'isURDFLink' in c && (c as unknown as { isURDFLink: boolean }).isURDFLink,
      )
      if (childLink && (childLink as unknown as { urdfName: string }).urdfName === selectedItem.name) return true
    }
    return false
  }, [selectedItem, robot, joint.name])

  // 선택 시 스크롤하여 화면에 표시
  const rowRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (isSelected && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [isSelected])

  const handleSelect = useCallback(() => {
    selectItem({ name: joint.name, kind: 'joint' })
  }, [selectItem, joint.name])

  // 입력값을 라디안으로 변환 후 스토어에 저장
  const handleChange = useCallback(
    (value: number) => {
      const radValue = useDeg ? value * DEG_TO_RAD : value
      useRobotStore.getState().setJointValue(joint.name, radValue)
    },
    [joint.name, useDeg],
  )

  return (
    <Tooltip content={<JointTooltipContent joint={joint} />} position="left">
      <div ref={rowRef} className={[styles.row, isSelected ? styles.rowSelected : ''].filter(Boolean).join(' ')}>
        <div className={styles.header} onClick={handleSelect} style={{ cursor: 'pointer' }}>
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
    </Tooltip>
  )
}
