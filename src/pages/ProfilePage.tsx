import { useState, useEffect } from 'react'
import styles from './AuthPage.module.css'
import { supabase } from '@/lib/supabase'
import type { CafeProfile } from '@/types/profile'

interface ProfilePageProps {
  profile: CafeProfile | null
  userId: string
  onBack: () => void
  onSaved: (profile: CafeProfile) => void
}

const EQUIPMENT_OPTIONS = [
  'Stovetop', 'Oven', 'Grill', 'Sandwich grill', 'Deep fryer',
  'Blender', 'Food processor', 'Microwave', 'Steamer', 'Rice cooker',
]

function toTitleCase(s: string): string {
  return s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}

export function ProfilePage({ profile, userId, onBack, onSaved }: ProfilePageProps) {
  const [cafeName, setCafeName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedEquipment, setSelectedEquipment] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    setCafeName(profile?.cafe_name ?? '')
    setDescription(profile?.description ?? '')
    if (profile?.equipment?.length) {
      const normalised = new Set(
        profile.equipment.map((e) => {
          const match = EQUIPMENT_OPTIONS.find((o) => o.toLowerCase() === e.toLowerCase())
          return match ?? toTitleCase(e)
        })
      )
      setSelectedEquipment(normalised)
    } else {
      setSelectedEquipment(new Set())
    }
  }, [profile])

  const toggleEquipment = (item: string) => {
    setSelectedEquipment((prev) => {
      const next = new Set(prev)
      next.has(item) ? next.delete(item) : next.add(item)
      return next
    })
  }

  const handleSave = async () => {
    setSaveError(null)
    setSaving(true)

    const profileData = {
      user_id: userId,
      cafe_name: cafeName.trim() || null,
      description: description.trim() || null,
      equipment: Array.from(selectedEquipment).map((e) => e.toLowerCase()),
      updated_at: new Date().toISOString(),
      pantry_staples: profile?.pantry_staples ?? [],
      menu_items: profile?.menu_items ?? [],
      preferences: profile?.preferences ?? { chef_notes_examples: [], avoided_ingredients: [], cuisine_style_tags: [] },
      cuisine_type: profile?.cuisine_type ?? null,
      seating_capacity: profile?.seating_capacity ?? null,
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

    onSaved(data as CafeProfile)
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.left}>
        <div className={styles.card}>
          <div className={styles.backRow}>
            <button type="button" className={styles.backBtn} onClick={onBack} aria-label="Back">
              <BackIcon /> Back
            </button>
          </div>

          <h1 className={styles.title}>
            {(cafeName.trim() || profile?.cafe_name || 'Cafe')} Profile
          </h1>
          <p className={styles.subtitle}>
            Update your cafe name, description, and available equipment.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className={styles.inputWrap} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                Cafe name
              </label>
              <input
                type="text"
                placeholder="e.g. The Corner Cafe"
                value={cafeName}
                onChange={(e) => setCafeName(e.target.value)}
                style={{ paddingLeft: '1rem' }}
              />
            </div>

            <div className={styles.inputWrap} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                Description
              </label>
              <textarea
                placeholder="Brief description of your cafe and style..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'inherit',
                  fontSize: '0.9375rem',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '0.5rem', display: 'block' }}>
                Equipment
              </label>
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
            </div>

            {saveError && (
              <p style={{ color: 'var(--color-warning)', fontSize: '0.875rem', margin: 0 }}>
                {saveError}
              </p>
            )}

            <button
              type="button"
              className={styles.primaryBtn}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
      <div className={styles.right}>
        <div className={styles.panelCard}>
          <p className={styles.panelTitle}>Better suggestions</p>
          <p className={styles.panelText}>Your equipment and description help PrepBrain tailor dish suggestions to your kitchen.</p>
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
