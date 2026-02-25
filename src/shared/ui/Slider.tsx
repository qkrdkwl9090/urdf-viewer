import {
  type ChangeEvent,
  type ReactNode,
  useCallback,
  useMemo,
  useState,
} from 'react'
import styles from './Slider.module.css'

interface SliderProps {
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  label?: string
  unit?: string
}

export function Slider({
  value,
  min,
  max,
  step,
  onChange,
  label,
  unit,
}: SliderProps): ReactNode {
  // 직접 입력 모드에서 임시 텍스트 값 관리
  const [inputText, setInputText] = useState<string | null>(null)

  const handleSliderChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChange(Number(e.target.value))
    },
    [onChange],
  )

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setInputText(e.target.value)
    },
    [],
  )

  // 입력 필드에서 포커스가 빠져나갈 때 값을 커밋
  const handleInputBlur = useCallback(() => {
    if (inputText === null) return
    const parsed = Number(inputText)
    if (!Number.isNaN(parsed)) {
      onChange(parsed)
    }
    setInputText(null)
  }, [inputText, onChange])

  const handleInputFocus = useCallback(() => {
    setInputText(String(value))
  }, [value])

  // Enter 키로 값 커밋
  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.currentTarget.blur()
      }
    },
    [],
  )

  // 트랙에 채워진 영역 표시를 위한 gradient 계산
  const trackBackground = useMemo(() => {
    if (max === min) return undefined
    const ratio = ((value - min) / (max - min)) * 100
    return {
      background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${ratio}%, var(--color-bg-overlay) ${ratio}%, var(--color-bg-overlay) 100%)`,
    }
  }, [value, min, max])

  const displayValue = inputText ?? value.toFixed(step < 1 ? 2 : 0)

  return (
    <div className={styles.wrapper}>
      {(label || unit !== undefined) && (
        <div className={styles.header}>
          {label && <span className={styles.label}>{label}</span>}
          <div className={styles.valueGroup}>
            <input
              type="text"
              className={styles.valueInput}
              value={displayValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onFocus={handleInputFocus}
              onKeyDown={handleInputKeyDown}
            />
            {unit && <span className={styles.unit}>{unit}</span>}
          </div>
        </div>
      )}
      <input
        type="range"
        className={styles.slider}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleSliderChange}
        style={trackBackground}
      />
    </div>
  )
}
