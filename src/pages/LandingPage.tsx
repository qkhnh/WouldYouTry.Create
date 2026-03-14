import styles from './AuthPage.module.css'

interface LandingPageProps {
  onSignIn: () => void
}

export function LandingPage({ onSignIn }: LandingPageProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.left}>
        <div className={styles.card} style={{ maxWidth: '480px' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-secondary)', margin: '0 0 0.5rem' }}>
            PrepBrain
          </p>
          <h1 className={styles.title} style={{ fontSize: '2rem' }}>
            Your leftovers, one dish
          </h1>
          <p className={styles.subtitle} style={{ marginBottom: '1.5rem' }}>
            Enter what you have and get off-menu dish suggestions for your brunch or cafe. 
            PrepBrain helps you reduce waste and create daily specials from ingredients at risk.
          </p>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={onSignIn}
            style={{ width: 'auto', padding: '0.75rem 1.5rem' }}
          >
            Sign in to get started
          </button>
        </div>
      </div>
      <div className={styles.right}>
        <div className={styles.panelCard}>
          <p className={styles.panelTagline}>Save recipes you love</p>
          <p className={styles.panelSub}>Keep your favourite suggestions in one place and use them when you need them.</p>
        </div>
        <div className={styles.panelCard}>
          <p className={styles.panelTitle}>Tailored to your kitchen</p>
          <p className={styles.panelText}>Set up your cafe profile once — equipment, style, preferences — and get suggestions that fit.</p>
        </div>
      </div>
    </div>
  )
}
