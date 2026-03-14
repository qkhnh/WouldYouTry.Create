import styles from './LoadingSpinner.module.css'

interface LoadingSpinnerProps {
  status?: string
}

export function LoadingSpinner({ status }: LoadingSpinnerProps) {
  console.log('LoadingSpinner component rendering, status:', status)
  return (
    <div className={styles.container}>
      <div className={styles.spinner}></div>
      <p className={styles.text}>Loading PrepBrain...</p>
      {status && <p className={styles.statusText}>{status}</p>}
    </div>
  )
}
