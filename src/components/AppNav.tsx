import styles from './AppNav.module.css'

interface AppNavProps {
  currentStep: 1 | 2
  onSignIn?: () => void
  onSignOut?: () => void
  userName?: string
}

export function AppNav({ currentStep, onSignIn, onSignOut, userName }: AppNavProps) {
  return (
    <nav className={styles.nav}>
      <div className={styles.leftSlot}>
        <span className={styles.logo}>PrepBrain</span>
      </div>
      <div className={styles.stepsWrap}>
        <div className={styles.steps}>
          <span
            className={`${styles.step} ${currentStep === 1 ? styles.stepActive : styles.stepDone}`}
          >
            1
          </span>
          <span className={styles.stepLine} />
          <span
            className={`${styles.step} ${currentStep === 2 ? styles.stepActive : ''}`}
          >
            2
          </span>
        </div>
        <div className={styles.stepLabels}>
          <span className={styles.stepLabel}>Choose ingredients</span>
          <span className={styles.stepLabel}>Get suggestion</span>
        </div>
      </div>
      <div className={styles.rightSlot}>
        {onSignOut ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {userName && (
              <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                {userName}
              </span>
            )}
            <button
              type="button"
              className={styles.signInBtn}
              onClick={onSignOut}
              aria-label="Sign out"
            >
              Sign out
            </button>
          </div>
        ) : onSignIn ? (
          <button
            type="button"
            className={styles.signInBtn}
            onClick={onSignIn}
            aria-label="Sign in"
          >
            <span className={styles.signInIcon} aria-hidden>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            Sign in
          </button>
        ) : null}
      </div>
    </nav>
  )
}
