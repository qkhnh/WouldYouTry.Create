import { useState, useRef, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Dish } from '@/types/suggestion'
import type { OutputStatus } from '@/types/suggestion'
import type { CafeProfile } from '@/types/profile'
import { supabase } from '@/lib/supabase'
import { AppNav } from '@/components/AppNav'
import { Sidebar } from '@/components/Sidebar'
import { AuthPage } from '@/pages/AuthPage'
import { OutputPage } from '@/pages/OutputPage'
import PrepPage from '@/pages/PrepPage'
import type { PrepPayload } from '@/pages/PrepPage'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { LandingPage } from '@/pages/LandingPage'
import { runSession } from '@/lib/session'
import { RecipeDetailView } from '@/components/RecipeDetailView'
import ShareMenuPage from '@/pages/ShareMenuPage'
import Cookies from 'js-cookie'

type AppView = 'landing' | 'input' | 'output' | 'auth' | 'onboarding' | 'profile' | 'recipe-detail' | 'share-menu'

const COOKIE_OPTS = { expires: 7 }

function readCookie<T>(key: string, fallback: T): T {
  try {
    const raw = Cookies.get(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeCookie<T>(key: string, value: T): void {
  try {
    Cookies.set(key, JSON.stringify(value), COOKIE_OPTS)
  } catch {
    // Cookie may exceed 4KB limit — silent fail
  }
}

function clearCookie(key: string): void {
  Cookies.remove(key)
}

// ── CHANGE 1: profile cookie helpers ─────────────────────────────────────────
function readProfileCookie(): CafeProfile | null {
  return readCookie<CafeProfile | null>('prepbrain-profile', null)
}

function writeProfileCookie(p: CafeProfile): void {
  writeCookie('prepbrain-profile', p)
}

function clearProfileCookie(): void {
  clearCookie('prepbrain-profile')
}

// ── CHANGE 2: fetchProfile now accepts cached fallback + timeout increased to 30s
async function fetchProfile(userId: string, cached: CafeProfile | null = null): Promise<CafeProfile | null> {
  console.log('[FETCH_PROFILE] Starting fetch for user:', userId)

  const timeoutPromise = new Promise<null>((_, reject) => {
    setTimeout(() => reject(new Error('Profile fetch timeout')), 30000) // was 10000
  })

  try {
    const fetchPromise = supabase
      .from('cafe_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()

    const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as {
      data: CafeProfile | null
      error: { message: string; code: string } | null
    }

    console.log('[FETCH_PROFILE] Result:', { data, error })

    if (error) {
      console.log('[FETCH_PROFILE] Error:', error.message, error.code)
      if (error.code === 'PGRST116') {
        console.log('[FETCH_PROFILE] No profile exists yet (new user)')
        return null
      }
      // On other errors fall back to cached profile instead of null
      console.log('[FETCH_PROFILE] Falling back to cached profile')
      return cached
    }
    if (!data) {
      console.log('[FETCH_PROFILE] No data returned, falling back to cached')
      return cached
    }
    console.log('[FETCH_PROFILE] Success, returning profile')
    return data as CafeProfile
  } catch (err) {
    console.error('[FETCH_PROFILE] Exception (timeout?):', err)
    // On timeout return cached profile instead of null — prevents onboarding flash
    console.log('[FETCH_PROFILE] Returning cached profile after exception')
    return cached
  }
}

function App() {
  const [view, setView] = useState<AppView>('landing')
  const [status, setStatus] = useState<OutputStatus>('success')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [savedRecipes, setSavedRecipesRaw] = useState<Dish[]>(() =>
    readCookie<Dish[]>('prepbrain-saved', [])
  )
  const [approvedRecipes, setApprovedRecipesRaw] = useState<Dish[]>(() =>
    readCookie<Dish[]>('prepbrain-approved', [])
  )
  const [suggestions, setSuggestionsRaw] = useState<Dish[]>(() =>
    readCookie<Dish[]>('prepbrain-suggestions', [])
  )

  const [user, setUser] = useState<User | null>(null)

  // ── CHANGE 3: profile state now initialises from cookie ───────────────────
  const [profile, setProfileRaw] = useState<CafeProfile | null>(() =>
    readProfileCookie()
  )

  // ── CHANGE 4: profile setter writes/clears cookie automatically ───────────
  const setProfile = (p: CafeProfile | null) => {
    setProfileRaw(p)
    if (p) writeProfileCookie(p)
    else clearProfileCookie()
  }

  const [selectedRecipe, setSelectedRecipe] = useState<Dish | null>(null)
  const [selectedRecipeType, setSelectedRecipeType] = useState<'saved' | 'approved'>('saved')
  const [authLoading, setAuthLoading] = useState(true)
  const [profileFetchLoading, setProfileFetchLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const setSavedRecipes = (val: Dish[] | ((prev: Dish[]) => Dish[])) => {
    setSavedRecipesRaw(prev => {
      const next = typeof val === 'function' ? val(prev) : val
      writeCookie('prepbrain-saved', next)
      return next
    })
  }

  const setApprovedRecipes = (val: Dish[] | ((prev: Dish[]) => Dish[])) => {
    setApprovedRecipesRaw(prev => {
      const next = typeof val === 'function' ? val(prev) : val
      writeCookie('prepbrain-approved', next)
      return next
    })
  }

  const setSuggestions = (val: Dish[] | ((prev: Dish[]) => Dish[])) => {
    setSuggestionsRaw(prev => {
      const next = typeof val === 'function' ? val(prev) : val
      writeCookie('prepbrain-suggestions', next)
      return next
    })
  }

  const prepDataRef = useRef<PrepPayload | null>(null)
  const initialSessionDoneRef = useRef(false)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      if (!session?.user) {
        setAuthLoading(false)
        initialSessionDoneRef.current = true
      }
    }).catch(() => {
      if (mounted) {
        setAuthLoading(false)
        initialSessionDoneRef.current = true
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AUTH] State change:', event, session?.user?.email, 'initialSessionDone:', initialSessionDoneRef.current)

        if (event === 'SIGNED_OUT' || !session?.user) {
          setUser(null)
          setProfile(null)
          setView('landing')
          return
        }

        // ── CHANGE 5: pass cached profile to fetchProfile in INITIAL_SESSION ─
        if (event === 'INITIAL_SESSION' && session?.user) {
          console.log('[AUTH] Initial session, fetching profile...')
          setUser(session.user)
          try {
            const cached = readProfileCookie()
            const p = await fetchProfile(session.user.id, cached)
            console.log('[AUTH] Profile fetch result:', p ? 'found' : 'not found')
            if (p) {
              setProfile(p)
              setView('input')
            } else {
              setView('onboarding')
            }
          } catch (err) {
            console.error('[AUTH] Profile fetch error:', err)
            // ── CHANGE 6: on catch, use cached profile before falling to onboarding
            const cached = readProfileCookie()
            if (cached) {
              setProfile(cached)
              setView('input')
            } else {
              setView('onboarding')
            }
          }
          setAuthLoading(false)
          initialSessionDoneRef.current = true
          return
        }

        // ── CHANGE 7: pass cached profile to fetchProfile in SIGNED_IN ───────
        if (event === 'SIGNED_IN' && initialSessionDoneRef.current && session?.user) {
          console.log('[AUTH] Re-sign-in after initial load, fetching profile...')
          setUser(session.user)
          try {
            const cached = readProfileCookie()
            const p = await fetchProfile(session.user.id, cached)
            console.log('[AUTH] Profile fetch result:', p ? 'found' : 'not found')
            if (p) {
              setProfile(p)
              setView('input')
            } else {
              setView('onboarding')
            }
          } catch (err) {
            console.error('[AUTH] Profile fetch error:', err)
            const cached = readProfileCookie()
            if (cached) {
              setProfile(cached)
              setView('input')
            } else {
              setView('onboarding')
            }
          }
        }

        if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('[AUTH] Token refreshed, updating user')
          setUser(session.user)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const handleAuthSuccess = (authUser: User) => {
    setUser(authUser)
    if (authUser.id.startsWith('demo-')) {
      setProfile(null)
      setView('input')
      return
    }
    setProfileFetchLoading(true)
    setProfile(null)
    const cached = readProfileCookie()
    fetchProfile(authUser.id, cached).then((p) => {
      setProfile(p)
      setView(p ? 'input' : 'onboarding')
    }).catch(() => {
      const c = readProfileCookie()
      if (c) { setProfile(c); setView('input') }
      else setView('onboarding')
    }).finally(() => setProfileFetchLoading(false))
  }

  const handleOnboardingComplete = (p: CafeProfile) => {
    setProfile(p)
    setView('input')
  }

  const handleProfileSaved = (p: CafeProfile) => {
    setProfile(p)
    setView('input')
  }

  // ── CHANGE 8: sign out clears profile cookie too ──────────────────────────
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setSavedRecipes([])
    setApprovedRecipes([])
    setSuggestions([])
    clearCookie('prepbrain-saved')
    clearCookie('prepbrain-approved')
    clearCookie('prepbrain-suggestions')
    clearProfileCookie()
    setView('landing')
  }

  const handlePrepSubmit = async (data: PrepPayload) => {
    prepDataRef.current = data
    setView('output')
    setStatus('loading')
    setSuggestions([])
    setErrorMessage(null)
    try {
      const dishes = await runSession(data, profile)
      setSuggestions(dishes.length > 0 ? dishes : [])
      setStatus(dishes.length > 0 ? 'success' : 'empty')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.')
      setStatus('error')
    }
  }

  const handleBackToIngredients = () => setView('input')

  const handleRemoveSaved = (index: number) => {
    setSavedRecipes((prev) => prev.filter((_, i) => i !== index))
  }

  const handleRemoveApproved = (index: number) => {
    setApprovedRecipes((prev) => prev.filter((_, i) => i !== index))
  }

  const handleApprove = (recipe: Dish) => {
    const alreadyApproved = approvedRecipes.some((r) => r.name === recipe.name)
    if (!alreadyApproved) setApprovedRecipes((prev) => [...prev, recipe])
    setSuggestions((prev) => prev.filter((r) => r.name !== recipe.name))
    setSuccessMessage(`"${recipe.name}" approved for today's special!`)
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  const handleRetry = async () => {
    const data = prepDataRef.current
    if (!data) return
    setStatus('loading')
    try {
      const dishes = await runSession(data, profile)
      setSuggestions(dishes.length > 0 ? dishes : [])
      setStatus(dishes.length > 0 ? 'success' : 'empty')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.')
      setStatus('error')
    }
  }

  const handleViewRecipe = (recipe: Dish, type: 'saved' | 'approved') => {
    setSelectedRecipe(recipe)
    setSelectedRecipeType(type)
    setView('recipe-detail')
  }

  const handleBackFromRecipe = () => {
    setSelectedRecipe(null)
    setView('input')
  }

  if (authLoading || profileFetchLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Loading...</p>
        </div>
      </div>
    )
  }

  if (view === 'landing') {
    return <LandingPage onSignIn={() => setView('auth')} />
  }

  if (view === 'auth') {
    return <AuthPage onBack={() => setView('landing')} onSuccess={handleAuthSuccess} />
  }

  if (view === 'onboarding' && user) {
    return <OnboardingPage userId={user.id} onComplete={handleOnboardingComplete} />
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
      {successMessage && (
        <div style={{
          position: 'fixed', top: '1rem', right: '1rem',
          padding: '0.75rem 1.25rem', background: 'var(--color-primary)', color: '#fff',
          borderRadius: 'var(--radius-md)', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontSize: '0.9375rem', fontWeight: 500, zIndex: 1000, animation: 'slideIn 0.3s ease-out',
        }}>
          {successMessage}
        </div>
      )}
      <AppNav
        currentStep={view === 'input' ? 1 : 2}
        onSignIn={user ? undefined : () => setView('auth')}
        onSignOut={user ? handleSignOut : undefined}
        userName={user?.email ?? undefined}
      />
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Sidebar
          savedRecipes={savedRecipes}
          approvedRecipes={approvedRecipes}
          onRemoveSaved={handleRemoveSaved}
          onRemoveApproved={handleRemoveApproved}
          onNavigateToAuth={user ? () => setView('profile') : () => setView('auth')}
          onNavigateToShareMenu={() => setView('share-menu')}
          onViewRecipe={handleViewRecipe}
          user={user}
          profile={profile}
        />
        <main style={{ flex: 1, width: 0, overflowY: 'auto' }}>
          {view === 'input' && <PrepPage onSubmit={handlePrepSubmit} />}
          {view === 'profile' && user && (
            <ProfilePage
              profile={profile}
              userId={user.id}
              onBack={() => setView('input')}
              onSaved={handleProfileSaved}
            />
          )}
          {view === 'output' && (
            <OutputPage
              status={status}
              suggestions={suggestions}
              errorMessage={errorMessage}
              onBackToIngredients={handleBackToIngredients}
              onApprove={handleApprove}
              onRetry={handleRetry}
              submittedIngredients={prepDataRef.current?.ingredients}
            />
          )}
          {view === 'recipe-detail' && selectedRecipe && (
            <RecipeDetailView
              recipe={selectedRecipe}
              type={selectedRecipeType}
              onBack={handleBackFromRecipe}
            />
          )}
          {view === 'share-menu' && (
            <ShareMenuPage
              savedRecipes={savedRecipes}
              approvedRecipes={approvedRecipes}
              cafeId={profile?.id ?? 'unknown-cafe'}
              onBack={() => setView('input')}
              onDone={() => setView('input')}
            />
          )}
        </main>
      </div>
    </div>
  )
}

export default App