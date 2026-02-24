import type { ReactNode } from 'react'
import styles from './Badge.module.css'

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'accent'
}

export function Badge({
  children,
  variant = 'default',
}: BadgeProps): ReactNode {
  const classNames = [styles.badge, styles[variant]].join(' ')

  return <span className={classNames}>{children}</span>
}
