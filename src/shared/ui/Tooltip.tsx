import { useState, useRef, useCallback, type ReactNode, type CSSProperties } from 'react'
import styles from './Tooltip.module.css'

type TooltipPosition = 'top' | 'right' | 'bottom' | 'left'

const GAP = 8

interface TooltipProps {
  children: ReactNode
  content: ReactNode
  position?: TooltipPosition
  /** 호버 딜레이 (ms) — 빠른 마우스 이동 시 깜빡임 방지 */
  delay?: number
}

/** 트리거 rect 기준으로 fixed 위치 계산 */
function calcStyle(rect: DOMRect, position: TooltipPosition): CSSProperties {
  switch (position) {
    case 'right':
      return { left: rect.right + GAP, top: rect.top + rect.height / 2, transform: 'translateY(-50%)' }
    case 'left':
      return { right: window.innerWidth - rect.left + GAP, top: rect.top + rect.height / 2, transform: 'translateY(-50%)' }
    case 'top':
      return { left: rect.left + rect.width / 2, bottom: window.innerHeight - rect.top + GAP, transform: 'translateX(-50%)' }
    case 'bottom':
      return { left: rect.left + rect.width / 2, top: rect.bottom + GAP, transform: 'translateX(-50%)' }
  }
}

/**
 * 범용 Tooltip 컴포넌트.
 * children에 마우스를 올리면 content를 fixed 팝오버로 표시한다.
 * overflow: hidden 부모에도 잘리지 않는다.
 */
export function Tooltip({
  children,
  content,
  position = 'right',
  delay = 300,
}: TooltipProps): ReactNode {
  const [visible, setVisible] = useState(false)
  const [fixedStyle, setFixedStyle] = useState<CSSProperties>({})
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const handleMouseEnter = useCallback(() => {
    timerRef.current = setTimeout(() => {
      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect()
        setFixedStyle(calcStyle(rect, position))
      }
      setVisible(true)
    }, delay)
  }, [delay, position])

  const handleMouseLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setVisible(false)
  }, [])

  return (
    <div
      ref={wrapperRef}
      className={styles.wrapper}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {visible && (
        <div className={styles.content} style={fixedStyle}>
          {content}
        </div>
      )}
    </div>
  )
}
