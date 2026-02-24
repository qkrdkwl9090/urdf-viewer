import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './Button.module.css'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md'
  children: ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  children,
  className,
  ...rest
}: ButtonProps): ReactNode {
  const classNames = [
    styles.button,
    styles[variant],
    styles[size],
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button className={classNames} {...rest}>
      {children}
    </button>
  )
}
