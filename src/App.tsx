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


type AppView = 'landing' | 'input' | 'output' | 'auth' | 'onboarding' | 'profile' | 'recipe-detail' | 'share-menu'

async function fetchProfile(userId: string): Promise<CafeProfile | null> {
  console.log('[FETCH_PROFILE] Starting fetch for user:', userId)
  
  // Add timeout to prevent hanging
  const timeoutPromise = new Promise<null>((_, reject) => {
    setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
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
      // PGRST116 = no rows found, which is fine for new users
      if (error.code === 'PGRST116') {
        console.log('[FETCH_PROFILE] No profile exists yet (new user)')
        return null
      }
      return null
    }
    if (!data) {
      console.log('[FETCH_PROFILE] No data returned')
      return null
    }
    console.log('[FETCH_PROFILE] Success, returning profile')
    return data as CafeProfile
  } catch (err) {
    console.error('[FETCH_PROFILE] Exception:', err)
    return null
  }
}

function App() {
  const [view, setView] = useState<AppView>('landing')
  const [status, setStatus] = useState<OutputStatus>('success')
  const [suggestions, setSuggestions] = useState<Dish[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [savedRecipes, setSavedRecipes] = useState<Dish[]>([])
  const [approvedRecipes, setApprovedRecipes] = useState<Dish[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<CafeProfile | null>(null)
  const [selectedRecipe, setSelectedRecipe] = useState<Dish | null>(null)
  const [selectedRecipeType, setSelectedRecipeType] = useState<'saved' | 'approved'>('saved')
  const [authLoading, setAuthLoading] = useState(true)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const prepDataRef = useRef<PrepPayload | null>(null)
  const initialSessionDoneRef = useRef(false)

  useEffect(() => {
    let mounted = true

    // Check for existing session on mount - just set loading state
    // The actual profile fetch will be handled by INITIAL_SESSION event
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      // If no session, stop loading and show landing
      if (!session?.user) {
        setAuthLoading(false)
        initialSessionDoneRef.current = true
      }
      // If session exists, INITIAL_SESSION event will handle the rest
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
          // Don't reset initialSessionDone - we're past initial load
          return
        }
        
        // Handle INITIAL_SESSION - this is when REST API is ready
        if (event === 'INITIAL_SESSION' && session?.user) {
          console.log('[AUTH] Initial session, fetching profile...')
          setUser(session.user)
          try {
            const p = await fetchProfile(session.user.id)
            console.log('[AUTH] Profile fetch result:', p ? 'found' : 'not found')
            if (p) {
              setProfile(p)
              setView('input')
            } else {
              setView('onboarding')
            }
          } catch (err) {
            console.error('[AUTH] Profile fetch error:', err)
            setView('onboarding')
          }
          setAuthLoading(false)
          initialSessionDoneRef.current = true
          return
        }
        
        // Handle SIGNED_IN only if INITIAL_SESSION already happened (i.e., user signed out and back in)
        if (event === 'SIGNED_IN' && initialSessionDoneRef.current && session?.user) {
          console.log('[AUTH] Re-sign-in after initial load, fetching profile...')
          setUser(session.user)
          try {
            const p = await fetchProfile(session.user.id)
            console.log('[AUTH] Profile fetch result:', p ? 'found' : 'not found')
            if (p) {
              setProfile(p)
              setView('input')
            } else {
              setView('onboarding')
            }
          } catch (err) {
            console.error('[AUTH] Profile fetch error:', err)
            setView('onboarding')
          }
        }
        
        // Handle token refresh - just update user, don't re-fetch profile
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
    setSuggestions((prev) => prev.filter((r) => r.name !== recipe.name))
    setSuccessMessage(`"${recipe.name}" saved for later`)
    setTimeout(() => setSuccessMessage(null), 3000)
  }

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

  if (authLoading) {
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
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Success toast notification */}
      {successMessage && (
        <div
          style={{
            position: 'fixed',
            top: '1rem',
            right: '1rem',
            padding: '0.75rem 1.25rem',
            background: 'var(--color-primary)',
            color: '#fff',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontSize: '0.9375rem',
            fontWeight: 500,
            zIndex: 1000,
            animation: 'slideIn 0.3s ease-out',
          }}
        >
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
              onSave={handleSave}
              onApprove={handleApprove}
              onRetry={handleRetry}
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
