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

type AppView = 'landing' | 'input' | 'output' | 'auth' | 'onboarding' | 'profile'

async function fetchProfile(userId: string): Promise<CafeProfile | null> {
  const { data, error } = await supabase
    .from('cafe_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error || !data) return null
  return data as CafeProfile
}

function App() {
  const [view, setView] = useState<AppView>('landing')
  const [status, setStatus] = useState<OutputStatus>('success')
  const [suggestions, setSuggestions] = useState<Dish[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [savedRecipes, setSavedRecipes] = useState<Dish[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<CafeProfile | null>(null)
  const prepDataRef = useRef<PrepPayload | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        fetchProfile(session.user.id).then((p) => {
          setProfile(p)
          setView(p ? 'input' : 'onboarding')
        }).catch(() => setView('onboarding'))
      } else {
        setView('landing')
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session?.user) {
          setUser(null)
          setProfile(null)
          setView('landing')
          return
        }
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          setUser(session.user)
          const p = await fetchProfile(session.user.id)
          setProfile(p)
          setView(p ? 'input' : 'onboarding')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const handleAuthSuccess = (authUser: User) => {
    setUser(authUser)
    // Demo-only bypass: if we created a synthetic user (no real Supabase session),
    // skip onboarding/profile persistence and continue the UI flow.
    if (authUser.id.startsWith('demo-')) {
      setProfile(null)
      setView('input')
      return
    }

    setView('onboarding')
    setProfile(null)
    fetchProfile(authUser.id).then((p) => {
      setProfile(p)
      setView(p ? 'input' : 'onboarding')
    }).catch(() => setView('onboarding'))
  }

  const handleOnboardingComplete = (p: CafeProfile) => {
    setProfile(p)
    setView('input')
  }

  const handleProfileSaved = (p: CafeProfile) => {
    setProfile(p)
    setView('input')
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
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

  const handleSave = (recipe: Dish) => {
    const alreadySaved = savedRecipes.some((r) => r.name === recipe.name)
    if (!alreadySaved) setSavedRecipes((prev) => [...prev, recipe])
  }

  const handleRemoveSaved = (index: number) => {
    setSavedRecipes((prev) => prev.filter((_, i) => i !== index))
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
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <AppNav
        currentStep={view === 'input' ? 1 : 2}
        onSignIn={user ? undefined : () => setView('auth')}
        onSignOut={user ? handleSignOut : undefined}
        userName={user?.email ?? undefined}
      />
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Sidebar
          savedRecipes={savedRecipes}
          onRemoveSaved={handleRemoveSaved}
          onNavigateToAuth={user ? () => setView('profile') : () => setView('auth')}
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
              onSave={handleSave}
              onRetry={handleRetry}
            />
          )}
        </main>
      </div>
    </div>
  )
}

export default App
