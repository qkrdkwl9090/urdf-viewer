import { useCallback, type ReactNode } from 'react'
import { RotateCcw, Home } from 'lucide-react'
import { useViewerStore, useRobotStore, useUIStore } from '@entities/robot'
import { Button, Toggle, Slider } from '@shared/ui'
import styles from './SettingsPanel.module.css'

/**
 * 뷰어 디스플레이 설정 패널.
 * 그리드/축 토글과 카메라/조인트 리셋 버튼을 제공한다.
 */
export function SettingsPanel(): ReactNode {
  const showGrid = useViewerStore((s) => s.showGrid)
  const showAxes = useViewerStore((s) => s.showAxes)
  const toggleGrid = useViewerStore((s) => s.toggleGrid)
  const toggleAxes = useViewerStore((s) => s.toggleAxes)
  const requestCameraReset = useViewerStore((s) => s.requestCameraReset)
  const resetJoints = useRobotStore((s) => s.resetJoints)
  const hasRobot = useRobotStore((s) => s.robotName !== null)
  const angleUnit = useUIStore((s) => s.angleUnit)
  const toggleAngleUnit = useUIStore((s) => s.toggleAngleUnit)
  const lightIntensity = useViewerStore((s) => s.lightIntensity)
  const setLightIntensity = useViewerStore((s) => s.setLightIntensity)
  const ignoreLimits = useUIStore((s) => s.ignoreLimits)
  const toggleIgnoreLimits = useUIStore((s) => s.toggleIgnoreLimits)

  const handleGridToggle = useCallback(() => {
    toggleGrid()
  }, [toggleGrid])

  const handleAxesToggle = useCallback(() => {
    toggleAxes()
  }, [toggleAxes])

  const handleAngleUnitToggle = useCallback(() => {
    toggleAngleUnit()
  }, [toggleAngleUnit])

  const handleIgnoreLimitsToggle = useCallback(() => {
    toggleIgnoreLimits()
  }, [toggleIgnoreLimits])

  const handleLightIntensity = useCallback(
    (value: number) => { setLightIntensity(value) },
    [setLightIntensity],
  )

  const handleCameraReset = useCallback(() => {
    requestCameraReset()
  }, [requestCameraReset])

  const handleJointsReset = useCallback(() => {
    resetJoints()
  }, [resetJoints])

  return (
    <div className={styles.container}>
      {/* 디스플레이 토글 섹션 */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Display</span>
        <div className={styles.toggleRow}>
          <span className={styles.toggleLabel}>Show Grid</span>
          <Toggle
            checked={showGrid}
            onChange={handleGridToggle}
            label=""
          />
        </div>
        <div className={styles.toggleRow}>
          <span className={styles.toggleLabel}>Show Axes</span>
          <Toggle
            checked={showAxes}
            onChange={handleAxesToggle}
            label=""
          />
        </div>
        <div className={styles.toggleRow}>
          <span className={styles.toggleLabel}>Use Degrees</span>
          <Toggle
            checked={angleUnit === 'deg'}
            onChange={handleAngleUnitToggle}
            label=""
          />
        </div>
        <div className={styles.toggleRow}>
          <span className={styles.toggleLabel}>Ignore Joint Limits</span>
          <Toggle
            checked={ignoreLimits}
            onChange={handleIgnoreLimitsToggle}
            label=""
          />
        </div>
        <div className={styles.sliderRow}>
          <Slider
            label="Light Intensity"
            value={lightIntensity}
            min={0}
            max={3}
            step={0.1}
            onChange={handleLightIntensity}
          />
        </div>
      </div>

      {/* 리셋 액션 섹션 */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Actions</span>
        <div className={styles.buttonGroup}>
          <Button variant="secondary" size="sm" onClick={handleCameraReset}>
            <Home size={14} />
            Reset Camera
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleJointsReset}
            disabled={!hasRobot}
          >
            <RotateCcw size={14} />
            Reset Joints
          </Button>
        </div>
      </div>
    </div>
  )
}
