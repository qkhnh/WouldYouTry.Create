import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Dish } from '@/types/suggestion'
import styles from './ShareMenuPage.module.css'

interface Props {
  savedRecipes: Dish[]
  approvedRecipes: Dish[]
  cafeId: string
  onBack: () => void
  onDone: () => void
}

interface ShareResult {
  menuId: string
  shareUrl: string
}

export default function ShareMenuPage({
  savedRecipes,
  approvedRecipes,
  cafeId,
  onBack,
  onDone,
}: Props) {
  const [selected, setSelected] = useState<Dish[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [shareResult, setShareResult] = useState<ShareResult | null>(null)
  const [copied, setCopied] = useState(false)

  const allDishes: (Dish & { source: 'approved' | 'saved' })[] = [
    ...approvedRecipes.map(d => ({ ...d, source: 'approved' as const })),
    ...savedRecipes.map(d => ({ ...d, source: 'saved' as const })),
  ]

  const isSelected = (dish: Dish) => selected.some(s => s.name === dish.name)

  const toggle = (dish: Dish) => {
    if (isSelected(dish)) {
      setSelected(prev => prev.filter(s => s.name !== dish.name))
    } else {
      if (selected.length >= 3) return
      setSelected(prev => [...prev, dish])
    }
  }

  const handleShare = async () => {
    if (selected.length !== 3) { setError('Please select exactly 3 dishes.'); return }
    setError('')
    setLoading(true)
    try {
      // 1. Insert into menus table to get menu_id
      const { data: menuData, error: menuError } = await supabase
        .from('menus')
        .insert([{ cafe_id: cafeId, status: 'voting' }])
        .select('id')
        .single();
      if (menuError || !menuData) {
        setError(menuError?.message || 'Failed to create menu.');
        setLoading(false);
        return;
      }
      const menu_id = menuData.id;
      // 2. Insert 3 dishes into menu_items with this menu_id
      const rows = selected.map((d) => ({
        menu_id,
        cafe_id: cafeId,
        dish_name: d.name,
        description: d.description,
        ingredients_used: d.ingredients.map(ing => ing.name),
        equipment_required: d.equipmentRequired,
        waste_score: d.wasteScore,
        portions_to_clear: d.portionsToClear,
        thumbs_up: 0,
        thumbs_down: 0,
      }))
      const { error: supaError } = await supabase.from('menu_items').insert(rows)
      if (supaError) {
        setError(supaError.message || 'Failed to share. Please try again.');
        return;
      }
      setShareResult({ menuId: menu_id, shareUrl: `/customer/${menu_id}` })
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!shareResult) return
    try {
      await navigator.clipboard.writeText(shareResult.shareUrl)
    } catch {
      const input = document.createElement('input')
      input.value = shareResult.shareUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  // ── CONFIRM VIEW — shown after successful share ────────────────────────────
  if (shareResult) {
    return (
      <div className={styles.page}>
        <div className={styles.confirmCard}>
          <div className={styles.iconWrap}><CheckIcon /></div>
          <h1 className={styles.title}>Menu shared!</h1>
          <p className={styles.subtitle}>
            Your 3 dishes are now live. Share the link below with your customers
            so they can vote for today's special.
          </p>

          <div className={styles.urlBlock}>
            <p className={styles.urlLabel}>Customer link</p>
            <div className={styles.urlRow}>
              <span className={styles.url}>{shareResult.shareUrl}</span>
              <button type="button" onClick={handleCopy}
                className={`${styles.copyBtn} ${copied ? styles.copyBtnDone : ''}`}>
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className={styles.shareOptions}>
            <p className={styles.shareLabel}>Share via</p>
            <div className={styles.shareBtns}>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Vote for today's special! ${shareResult.shareUrl}`)}`}
                target="_blank" rel="noopener noreferrer"
                className={styles.shareOption}
              >WhatsApp</a>
              <a
                href={`mailto:?subject=Vote for today's special&body=${encodeURIComponent(`Pick your favourite: ${shareResult.shareUrl}`)}`}
                className={styles.shareOption}
              >Email</a>
              <button type="button" onClick={handleCopy} className={styles.shareOption}>
                Copy link
              </button>
            </div>
          </div>

          <div className={styles.confirmActions}>
            <button type="button" onClick={() => setShareResult(null)} className={styles.backBtn}>
              ← Share different dishes
            </button>
            <button type="button" onClick={onDone} className={styles.doneBtn}>
              Back to prep →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── PICKER VIEW — default ─────────────────────────────────────────────────
  return (
    <div className={styles.page}>

      <div className={styles.header}>
        <button onClick={onBack} className={styles.backBtn}>← Back</button>
        <p className={styles.eyebrow}>Share with customers</p>
        <h1 className={styles.title}>Choose 3 dishes to share</h1>
        <p className={styles.subtitle}>
          Customers will vote on which one becomes today's special.
        </p>
      </div>

      <div className={styles.counter}>
        <div className={styles.counterDots}>
          {[0, 1, 2].map(i => (
            <div key={i} className={`${styles.dot} ${i < selected.length ? styles.dotFilled : ''}`} />
          ))}
        </div>
        <span className={styles.counterText}>{selected.length} / 3 selected</span>
      </div>

      {allDishes.length === 0 ? (
        <div className={styles.empty}>
          <p>No dishes available yet.</p>
          <p>Generate suggestions and approve or save them first.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {allDishes.map((dish, i) => {
            const sel = isSelected(dish)
            const selIndex = selected.findIndex(s => s.name === dish.name)
            const disabled = !sel && selected.length >= 3
            const atRiskIngredients = dish.ingredients.filter(ing => ing.atRisk)

            return (
              <button
                key={`${dish.name}-${i}`}
                className={`${styles.card} ${sel ? styles.cardSelected : ''} ${disabled ? styles.cardDisabled : ''}`}
                onClick={() => toggle(dish)}
                disabled={disabled}
                type="button"
              >
                {sel && <div className={styles.selBadge}>{selIndex + 1}</div>}
                <div className={`${styles.sourceBadge} ${dish.source === 'approved' ? styles.sourceApproved : styles.sourceSaved}`}>
                  {dish.source === 'approved' ? 'Approved' : 'Saved'}
                </div>

                <div className={styles.cardBody}>
                  <h3 className={styles.dishName}>{dish.name}</h3>
                  <p className={styles.description}>{dish.description}</p>

                  <div className={styles.meta}>
                    <span className={styles.metaItem}>♻ Waste score: {dish.wasteScore}</span>
                    <span className={styles.metaItem}>🍽 {dish.portionsToClear} portions</span>
                    {dish.equipmentRequired.length > 0 && (
                      <span className={styles.metaItem}>🔧 {dish.equipmentRequired.join(', ')}</span>
                    )}
                  </div>

                  {dish.ingredients.length > 0 && (
                    <div className={styles.ingredients}>
                      <p className={styles.ingredientsLabel}>Ingredients</p>
                      <div className={styles.ingredientChips}>
                        {dish.ingredients.map(ing => (
                          <span
                            key={ing.name}
                            className={`${styles.ingredientChip} ${ing.atRisk ? styles.ingredientChipRisk : ''}`}
                          >
                            {ing.atRisk && '⚠ '}{ing.quantity}{ing.unit} {ing.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {atRiskIngredients.length > 0 && (
                    <p className={styles.atRiskNote}>
                      Uses {atRiskIngredients.length} at-risk ingredient{atRiskIngredients.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.footer}>
        <button
          type="button"
          onClick={handleShare}
          disabled={selected.length !== 3 || loading}
          className={`${styles.shareBtn} ${selected.length === 3 && !loading ? styles.shareBtnActive : ''}`}
        >
          {loading ? (
            <span className={styles.loadingInner}>
              <span className={styles.spinner} />
              Sharing with customers…
            </span>
          ) : (
            `Share ${selected.length === 3 ? 'these 3 dishes' : `(${selected.length}/3 selected)`} →`
          )}
        </button>
      </div>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}