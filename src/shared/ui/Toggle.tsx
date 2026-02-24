import { type ReactNode, useCallback, useId } from 'react'
import styles from './Toggle.module.css'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}

export function Toggle({ checked, onChange, label }: ToggleProps): ReactNode {
  const id = useId()

  const handleChange = useCallback(() => {
    onChange(!checked)
  }, [checked, onChange])

  const trackClass = [styles.track, checked && styles.trackChecked]
    .filter(Boolean)
    .join(' ')

  const thumbClass = [styles.thumb, checked && styles.thumbChecked]
    .filter(Boolean)
    .join(' ')

  return (
    <label className={styles.wrapper} htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        className={styles.hiddenInput}
        checked={checked}
        onChange={handleChange}
      />
      <div className={trackClass}>
        <div className={thumbClass} />
      </div>
      <span className={styles.label}>{label}</span>
    </label>
  )
}
