import { useState } from 'react'
import styles from './AuthPage.module.css'
import { supabase } from '@/lib/supabase'
import type { CafeProfile } from '@/types/profile'
import { ALL_INGREDIENTS } from '@/data/Ingredients'

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

const MENU_CATEGORY_OPTIONS = [
  'sandwich', 'pastry', 'porridge', 'salad', 'soup', 'toast',
  'smoothie', 'coffee', 'tea', 'juice', 'cocktail', 'dessert',
  'breakfast', 'brunch', 'lunch', 'snack', 'other',
]

export function OnboardingPage({ userId, onComplete }: OnboardingPageProps) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [ingredientSearch, setIngredientSearch] = useState<Record<number, string>>({})

  // Step 1 — Identity
  const [cafeName, setCafeName] = useState('')
  const [cuisineType, setCuisineType] = useState('')
  const [description, setDescription] = useState('')

  // Step 2 — Equipment
  const [selectedEquipment, setSelectedEquipment] = useState<Set<string>>(new Set())

  // Step 3 — Preferences
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [avoidedIngredients, setAvoidedIngredients] = useState('')

  // Step 4 — Menu Items
  const [menuItems, setMenuItems] = useState<Array<{ name: string; category: string; ingredients: string[] }>>([])

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

  const addMenuItem = () => {
    setMenuItems((prev) => [...prev, { name: '', category: 'breakfast', ingredients: [] }])
  }

  const removeMenuItem = (index: number) => {
    setMenuItems((prev) => prev.filter((_, i) => i !== index))
  }

  const updateMenuItem = (index: number, field: 'name' | 'category', value: string) => {
    setMenuItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  const removeIngredient = (menuIndex: number, ingIndex: number) => {
    setMenuItems((prev) => prev.map((item, i) => (i === menuIndex ? { ...item, ingredients: item.ingredients.filter((_, j) => j !== ingIndex) } : item)))
  }

  const handleFinish = async () => {
    setSaveError(null)
    setSaving(true)

    const profileData = {
      user_id: userId,
      cafe_name: cafeName || null,
      cuisine_type: cuisineType || null,
      description: description.trim() || null,
      seating_capacity: null,
      equipment: Array.from(selectedEquipment).map((e) => e.toLowerCase()),
      pantry_staples: [],
      menu_items: menuItems.filter((item) => item.name.trim()).map((item) => ({
        name: item.name.trim(),
        category: item.category,
        ingredients: item.ingredients.filter((ing) => ing.trim()),
      })),
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

  const TOTAL_STEPS = 4

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
              {step === 4 && 'Current menu'}
            </h1>
            <p className={styles.subtitle}>
              {step === 1 && 'Tell us a bit about your cafe so we can tailor suggestions.'}
              {step === 2 && 'Select the equipment available in your kitchen.'}
              {step === 3 && 'Help us avoid ingredients you don\'t want and focus on your style.'}
              {step === 4 && 'Add your current menu items to help us suggest complementary dishes.'}
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
                <textarea
                  placeholder="Describe your cafe (e.g. A cozy brunch spot with focus on fresh, local ingredients...)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  style={{ 
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-bg)',
                    color: 'var(--color-text)',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    fontSize: '0.9375rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
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

          {/* Step 4 — Menu Items */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <button
                type="button"
                onClick={addMenuItem}
                style={{
                  padding: '0.625rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--color-border)',
                  background: 'var(--color-bg-card)',
                  color: 'var(--color-primary)',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                + Add menu item
              </button>

              {menuItems.map((item, menuIndex) => (
                <div
                  key={menuIndex}
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-card)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ flex: 1, marginRight: '0.75rem' }}>
                      <input
                        type="text"
                        placeholder="Dish name"
                        value={item.name}
                        onChange={(e) => updateMenuItem(menuIndex, 'name', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem 0.75rem',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          fontFamily: 'inherit',
                        }}
                      />
                    </div>
                    <select
                      value={item.category}
                      onChange={(e) => updateMenuItem(menuIndex, 'category', e.target.value)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        fontFamily: 'inherit',
                        background: 'var(--color-bg-card)',
                      }}
                    >
                      {MENU_CATEGORY_OPTIONS.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeMenuItem(menuIndex)}
                      style={{
                        marginLeft: '0.5rem',
                        padding: '0.375rem 0.625rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-warning)',
                        background: 'transparent',
                        color: 'var(--color-warning)',
                        fontSize: '0.75rem',
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                      }}
                    >
                      Remove
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-muted)', margin: 0 }}>
                      Ingredients
                    </p>
                    
                    {/* Search input */}
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="Search ingredients..."
                        value={ingredientSearch[menuIndex] ?? ''}
                        onChange={(e) => setIngredientSearch(prev => ({ ...prev, [menuIndex]: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '0.375rem 0.5rem',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.8125rem',
                          fontFamily: 'inherit',
                          marginBottom: '0.25rem',
                        }}
                      />
                      
                      {/* Filtered suggestions */}
                      {(ingredientSearch[menuIndex]?.trim() ?? '') && (() => {
                        const query = ingredientSearch[menuIndex].toLowerCase().trim()
                        const filtered = ALL_INGREDIENTS.filter(ing => 
                          ing.name.toLowerCase().includes(query) && !item.ingredients.includes(ing.name.toLowerCase())
                        ).slice(0, 6)
                        return filtered.length > 0 ? (
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            background: 'var(--color-bg-card)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            zIndex: 10,
                            maxHeight: '200px',
                            overflowY: 'auto',
                          }}>
                            {filtered.map(ing => (
                              <button
                                key={ing.name}
                                type="button"
                                onClick={() => {
                                  setMenuItems(prev => prev.map((itm, i) => 
                                    i === menuIndex ? { ...itm, ingredients: [...itm.ingredients, ing.name.toLowerCase()] } : itm
                                  ))
                                  setIngredientSearch(prev => ({ ...prev, [menuIndex]: '' }))
                                }}
                                style={{
                                  display: 'block',
                                  width: '100%',
                                  padding: '0.375rem 0.5rem',
                                  border: 'none',
                                  background: 'transparent',
                                  textAlign: 'left',
                                  fontSize: '0.8125rem',
                                  fontFamily: 'inherit',
                                  cursor: 'pointer',
                                  color: 'var(--color-text)',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                              >
                                {ing.name}
                              </button>
                            ))}
                          </div>
                        ) : null
                      })()}
                    </div>
                    
                    {/* Selected ingredients as tags */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                      {item.ingredients.map((ing, ingIndex) => (
                        <span
                          key={ingIndex}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.375rem 0.625rem',
                            background: 'var(--color-primary)',
                            color: '#fff',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.8125rem',
                            fontWeight: 500,
                          }}
                        >
                          {ing}
                          <button
                            type="button"
                            onClick={() => removeIngredient(menuIndex, ingIndex)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: '#fff',
                              padding: 0,
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              lineHeight: 1,
                              opacity: 0.8,
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {menuItems.length === 0 && (
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', textAlign: 'center', margin: 0 }}>
                  No menu items added yet. Click above to add your first dish.
                </p>
              )}
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
