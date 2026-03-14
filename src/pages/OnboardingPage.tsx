import { useState } from 'react'
import styles from './AuthPage.module.css'
import { supabase } from '@/lib/supabase'
import type { CafeProfile } from '@/types/profile'

interface OnboardingPageProps {
  userId: string
  onComplete: (profile: CafeProfile) => void
}

const EQUIPMENT_OPTIONS = [
  'Stovetop', 'Oven', 'Grill', 'Sandwich grill', 'Deep fryer',
  'Blender', 'Food processor', 'Microwave', 'Steamer', 'Rice cooker',
]

const CUISINE_STYLE_OPTIONS = [
  'Asian fusion', 'Comfort food', 'Healthy', 'Mediterranean',
  'Brunch', 'Bakery', 'Modern Australian', 'Café classics',
]

export function OnboardingPage({ userId, onComplete }: OnboardingPageProps) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Step 1 — Identity
  const [cafeName, setCafeName] = useState('')
  const [cuisineType, setCuisineType] = useState('')
  const [seatingCapacity, setSeatingCapacity] = useState('')

  // Step 2 — Equipment
  const [selectedEquipment, setSelectedEquipment] = useState<Set<string>>(new Set())

  // Step 3 — Preferences
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [avoidedIngredients, setAvoidedIngredients] = useState('')

  const toggleEquipment = (item: string) => {
    setSelectedEquipment((prev) => {
      const next = new Set(prev)
      next.has(item) ? next.delete(item) : next.add(item)
      return next
    })
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev)
      next.has(tag) ? next.delete(tag) : next.add(tag)
      return next
    })
  }

  const handleFinish = async () => {
    setSaveError(null)
    setSaving(true)

    const profileData = {
      user_id: userId,
      cafe_name: cafeName || null,
      cuisine_type: cuisineType || null,
      seating_capacity: seatingCapacity ? parseInt(seatingCapacity) : null,
      description: null,
      equipment: Array.from(selectedEquipment).map((e) => e.toLowerCase()),
      pantry_staples: [],
      menu_items: [],
      preferences: {
        chef_notes_examples: [],
        avoided_ingredients: avoidedIngredients
          ? avoidedIngredients.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        cuisine_style_tags: Array.from(selectedTags).map((t) => t.toLowerCase().replace(/\s+/g, '-')),
      },
    }

    const { data, error } = await supabase
      .from('cafe_profiles')
      .upsert(profileData, { onConflict: 'user_id' })
      .select()
      .single()

    setSaving(false)

    if (error) {
      setSaveError(error.message)
      return
    }

    onComplete(data as CafeProfile)
  }

  const TOTAL_STEPS = 3

  return (
    <div className={styles.wrapper}>
      <div className={styles.left}>
        <div className={styles.card}>
          {/* Header */}
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-secondary)', margin: '0 0 0.25rem' }}>
              Step {step} of {TOTAL_STEPS}
            </p>
            <h1 className={styles.title}>
              {step === 1 && 'Your cafe'}
              {step === 2 && 'Kitchen equipment'}
              {step === 3 && 'Your preferences'}
            </h1>
            <p className={styles.subtitle}>
              {step === 1 && 'Tell us a bit about your cafe so we can tailor suggestions.'}
              {step === 2 && 'Select the equipment available in your kitchen.'}
              {step === 3 && 'Help us avoid ingredients you don\'t want and focus on your style.'}
            </p>
          </div>

          {/* Step 1 — Identity */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className={styles.inputWrap}>
                <input
                  type="text"
                  placeholder="Cafe name"
                  value={cafeName}
                  onChange={(e) => setCafeName(e.target.value)}
                  style={{ paddingLeft: '1rem' }}
                />
              </div>
              <div className={styles.inputWrap}>
                <input
                  type="text"
                  placeholder="Cuisine type (e.g. Brunch, Café, Mediterranean)"
                  value={cuisineType}
                  onChange={(e) => setCuisineType(e.target.value)}
                  style={{ paddingLeft: '1rem' }}
                />
              </div>
              <div className={styles.inputWrap}>
                <input
                  type="number"
                  placeholder="Seating capacity"
                  value={seatingCapacity}
                  onChange={(e) => setSeatingCapacity(e.target.value)}
                  min={1}
                  style={{ paddingLeft: '1rem' }}
                />
              </div>
            </div>
          )}

          {/* Step 2 — Equipment */}
          {step === 2 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {EQUIPMENT_OPTIONS.map((item) => {
                const active = selectedEquipment.has(item)
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleEquipment(item)}
                    style={{
                      padding: '0.375rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      background: active ? 'var(--color-primary)' : 'var(--color-bg-card)',
                      color: active ? '#fff' : 'var(--color-text)',
                      fontSize: '0.875rem',
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {item}
                  </button>
                )
              })}
            </div>
          )}

          {/* Step 3 — Preferences */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)', margin: '0 0 0.5rem' }}>
                  Cuisine style
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {CUISINE_STYLE_OPTIONS.map((tag) => {
                    const active = selectedTags.has(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        style={{
                          padding: '0.375rem 0.75rem',
                          borderRadius: 'var(--radius-md)',
                          border: `1px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          background: active ? 'var(--color-primary)' : 'var(--color-bg-card)',
                          color: active ? '#fff' : 'var(--color-text)',
                          fontSize: '0.875rem',
                          fontFamily: 'inherit',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className={styles.inputWrap} style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                  Ingredients to avoid <span style={{ fontWeight: 400, color: 'var(--color-text-secondary)' }}>(optional, comma-separated)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. pork, nuts, shellfish"
                  value={avoidedIngredients}
                  onChange={(e) => setAvoidedIngredients(e.target.value)}
                  style={{ paddingLeft: '1rem', width: '100%' }}
                />
              </div>
            </div>
          )}

          {saveError && (
            <p style={{ color: 'var(--color-warning)', fontSize: '0.875rem', margin: '1rem 0 0' }}>
              {saveError}
            </p>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-bg-card)',
                  color: 'var(--color-text)',
                  fontSize: '1rem',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                Back
              </button>
            )}
            {step < TOTAL_STEPS ? (
              <button
                type="button"
                className={styles.primaryBtn}
                style={{ flex: 1 }}
                onClick={() => setStep((s) => s + 1)}
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                className={styles.primaryBtn}
                style={{ flex: 1 }}
                onClick={handleFinish}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Finish setup'}
              </button>
            )}
          </div>

          {step === TOTAL_STEPS && (
            <p
              style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.75rem', cursor: 'pointer' }}
              onClick={handleFinish}
            >
              Skip for now
            </p>
          )}
        </div>
      </div>
      <div className={styles.right}>
        <div className={styles.panelCard}>
          <p className={styles.panelTitle}>Set up once, use every day</p>
          <p className={styles.panelText}>Your cafe profile helps PrepBrain suggest dishes that match your kitchen and style.</p>
        </div>
        <div className={styles.panelCard}>
          <p className={styles.panelTagline}>Edit any time</p>
          <p className={styles.panelSub}>You can update your profile from account settings whenever your kitchen changes.</p>
        </div>
      </div>
    </div>
  )
}
