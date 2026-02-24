import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './IconButton.module.css'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  tooltip: string
  size?: 'sm' | 'md'
}

export function IconButton({
  icon,
  tooltip,
  size = 'md',
  className,
  ...rest
}: IconButtonProps): ReactNode {
  const classNames = [styles.iconButton, styles[size], className]
    .filter(Boolean)
    .join(' ')

  return (
    <button className={classNames} title={tooltip} aria-label={tooltip} {...rest}>
      {icon}
    </button>
  )
}
