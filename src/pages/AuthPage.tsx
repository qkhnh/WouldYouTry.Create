import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import styles from './AuthPage.module.css'
import { supabase } from '@/lib/supabase'

type AuthMode = 'signin' | 'signup'

export interface AuthPageProps {
  onBack: () => void
  onSuccess: (user: User) => void
}

function isDuplicateRegistrationError(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('already registered') ||
    m.includes('already exists') ||
    m.includes('user already registered') ||
    m.includes('user already exists') ||
    m.includes('duplicate')
  )
}

function checkPasswordRequirements(password: string) {
  return {
    length: password.length >= 8,
    numberOrSymbol: /[0-9]|[^a-zA-Z0-9]/.test(password),
    upperLower: /[a-z]/.test(password) && /[A-Z]/.test(password),
  }
}

export function AuthPage({ onBack, onSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>('signup')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [retypePassword, setRetypePassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [retypeVisible, setRetypeVisible] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const req = checkPasswordRequirements(password)
  const passwordsMatch = password === retypePassword
  const signUpValid = mode !== 'signup' || (req.length && req.numberOrSymbol && req.upperLower && passwordsMatch)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'signup' && !signUpValid) return
    setAuthError(null)
    setLoading(true)

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password })
        setLoading(false)
        if (error) {
          // Demo mode: don't block the flow for duplicate accounts.
          // If the backend rejects a duplicate email, treat it as a successful registration
          // and proceed to the next screen without showing an error.
          if (isDuplicateRegistrationError(error.message)) {
            const demoUser = {
              id: `demo-${crypto.randomUUID()}`,
              email,
              app_metadata: {},
              user_metadata: { name },
              aud: 'authenticated',
              created_at: new Date().toISOString(),
            } as unknown as User
            onSuccess(demoUser)
            return
          }
          setAuthError(error.message)
          return
        }
        if (!data.session) {
          alert('Account created! Check your email to confirm, then sign in.')
          switchMode('signin')
          return
        }
        onSuccess(data.session.user)
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        setLoading(false)
        if (error) {
          console.error('[AUTH] Sign-in error:', error.message, error.status)
          setAuthError(error.message)
          return
        }
        if (data.user) {
          onSuccess(data.user)
        } else if (data.session?.user) {
          onSuccess(data.session.user)
        } else {
          setAuthError('Sign-in succeeded but no user returned. Please try again.')
        }
      }
    } catch (err) {
      setLoading(false)
      setAuthError(err instanceof Error ? err.message : 'Unexpected error')
    }
  }

  const switchMode = (next: AuthMode) => {
    setMode(next)
    setAuthError(null)
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.left}>
        <div className={styles.card}>
          <div className={styles.backRow}>
            <button type="button" className={styles.backBtn} onClick={onBack} aria-label="Back to PrepBrain">
              <BackIcon /> Back to PrepBrain
            </button>
            {mode === 'signup' ? (
              <span className={styles.toggleLink}>
                Already member? <a href="#" onClick={(e) => { e.preventDefault(); switchMode('signin') }}>Sign in</a>
              </span>
            ) : (
              <span className={styles.toggleLink}>
                Don&apos;t have an account? <a href="#" onClick={(e) => { e.preventDefault(); switchMode('signup') }}>Sign up</a>
              </span>
            )}
          </div>

          <h1 className={styles.title}>{mode === 'signup' ? 'Sign Up' : 'Sign In'}</h1>
          <p className={styles.subtitle}>
            {mode === 'signup'
              ? 'Create an account to save recipes and get suggestions.'
              : 'Welcome back to PrepBrain.'}
          </p>

          <form className={styles.form} onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon} aria-hidden><PersonIcon /></span>
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            )}
            <div className={styles.inputWrap}>
              <span className={styles.inputIcon} aria-hidden><EmailIcon /></span>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className={styles.inputWrap}>
              <span className={styles.inputIcon} aria-hidden><LockIcon /></span>
              <input
                type={passwordVisible ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
              />
              <button
                type="button"
                className={styles.inputIconRight}
                onClick={() => setPasswordVisible((v) => !v)}
                aria-label={passwordVisible ? 'Hide password' : 'Show password'}
              >
                {passwordVisible ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {mode === 'signup' && (
              <>
                <ul className={styles.reqList}>
                  <li className={req.length ? styles.reqOk : styles.reqFail}>
                    {req.length ? <CheckIcon /> : <DotIcon />}
                    At least 8 characters
                  </li>
                  <li className={req.numberOrSymbol ? styles.reqOk : styles.reqFail}>
                    {req.numberOrSymbol ? <CheckIcon /> : <DotIcon />}
                    At least one number or symbol
                  </li>
                  <li className={req.upperLower ? styles.reqOk : styles.reqFail}>
                    {req.upperLower ? <CheckIcon /> : <DotIcon />}
                    Lowercase and uppercase
                  </li>
                </ul>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon} aria-hidden><LockIcon /></span>
                  <input
                    type={retypeVisible ? 'text' : 'password'}
                    placeholder="Re-type password"
                    value={retypePassword}
                    onChange={(e) => setRetypePassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className={styles.inputIconRight}
                    onClick={() => setRetypeVisible((v) => !v)}
                    aria-label={retypeVisible ? 'Hide password' : 'Show password'}
                  >
                    {retypeVisible ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </>
            )}
            {mode === 'signin' && (
              <div className={styles.forgotLink}>
                <a href="#" onClick={(e) => e.preventDefault()}>Forgot password?</a>
              </div>
            )}
            {authError && (
              <p style={{ color: 'var(--color-warning)', fontSize: '0.875rem', margin: 0 }}>
                {authError}
              </p>
            )}
            <button
              type="submit"
              className={styles.primaryBtn}
              disabled={(mode === 'signup' && !signUpValid) || loading}
            >
              {loading ? 'Please wait…' : mode === 'signup' ? 'Sign Up' : 'Sign In'}
              {!loading && <ArrowIcon />}
            </button>
          </form>
        </div>
      </div>
      <div className={styles.right}>
        <div className={styles.panelCard}>
          <p className={styles.panelTitle}>Your leftovers, one dish</p>
          <p className={styles.panelText}>Enter what you have and get off-menu dish suggestions for your brunch or cafe.</p>
        </div>
        <div className={styles.panelCard}>
          <p className={styles.panelTagline}>Save recipes you love</p>
          <p className={styles.panelSub}>Keep your favourite suggestions in one place and use them when you need them.</p>
        </div>
      </div>
    </div>
  )
}

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  )
}
function PersonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  )
}
function EmailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  )
}
function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.7 13.3a4 4 0 0 1 5.3-5.3" />
      <path d="M17 8.5A10 10 0 0 0 2 12a10 10 0 0 0 15 7.5" />
      <path d="m2 2 20 20" />
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}
function DotIcon() {
  return <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-text-secondary)', display: 'inline-block' }} />
}
function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}
