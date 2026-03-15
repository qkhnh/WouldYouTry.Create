import { useState, useEffect } from 'react'
import type { Dish, DishIngredient, OutputStatus } from '@/types/suggestion'
import { supabase } from '@/lib/supabase'
import { ResultHeader } from '@/components/ResultHeader'
import { DishSuggestionCard } from '@/components/DishSuggestionCard'
import { IngredientTagList } from '@/components/IngredientTagList'
import { ReasonSection } from '@/components/ReasonSection'
import { LoadingState } from '@/components/LoadingState'
import { ErrorState } from '@/components/ErrorState'
import { EmptyState } from '@/components/EmptyState'
import { AdjustModal } from '@/components/AdjustModal'
import { calculateWasteScore, calculatePortions } from '@/lib/session'
import type { SubmittedIngredient } from '@/pages/PrepPage'

export interface OutputPageProps {
  status: OutputStatus
  suggestions: Dish[]
  errorMessage?: string | null
  onBackToIngredients: () => void
  onApprove?: (recipe: Dish) => void
  onRetry?: () => void
  submittedIngredients?: SubmittedIngredient[]
}

const LABEL_BACK = 'Back to ingredients'
const LABEL_SAVE = 'Save for later'
const LABEL_APPROVE = 'Approve'
const LABEL_ADJUST = 'Adjust'

function ScoreSection({ dish }: { dish: Dish }) {
  const wastePercent = Math.round(dish.wasteScore * 100)
  return (
    <section style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
        <span
          style={{
            padding: '0.2rem 0.6rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.8125rem',
            fontWeight: 600,
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-primary)',
          }}
        >
          Waste cleared: {wastePercent}%
        </span>
        <span
          style={{
            padding: '0.2rem 0.6rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.8125rem',
            fontWeight: 600,
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-primary)',
          }}
        >
          ~{dish.portionsToClear} portion{dish.portionsToClear !== 1 ? 's' : ''}
        </span>
        {dish.equipmentRequired.length > 0 && (
          <span
            style={{
              padding: '0.2rem 0.6rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              background: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-muted)',
            }}
          >
            {dish.equipmentRequired.join(', ')}
          </span>
        )}
      </div>
    </section>
  )
}

async function saveSuggestionToDB(dish: Dish) {
  const { error } = await supabase
    .from('suggestions')
    .insert([
      {
        dish_name: dish.name,
        description: dish.description,
      }
    ]);
  
  if (error) {
    // Fallback: save locally
    const savedLocally = JSON.parse(localStorage.getItem('savedSuggestions') || '[]');
    savedLocally.push({
      dish_name: dish.name,
      description: dish.description,
      saved_at: new Date().toISOString(),
    });
    localStorage.setItem('savedSuggestions', JSON.stringify(savedLocally));
    alert('Saved locally (sync issue with server)');
  } else {
    alert('Suggestion saved!');
  }
}

function RecipeCard({
  dish,
  onApprove,
  submittedIngredients,
  onDishUpdate,
}: {
  dish: Dish
  onApprove?: (recipe: Dish) => void
  submittedIngredients?: SubmittedIngredient[]
  onDishUpdate: (updatedDish: Dish) => void
}) {
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [scalePortions, setScalePortions] = useState(1)
  const [scaledIngredients, setScaledIngredients] = useState<DishIngredient[]>(dish.ingredients)

  const handleSaveIngredients = (ingredients: DishIngredient[]) => {
    const updatedDish: Dish = {
      ...dish,
      ingredients,
      wasteScore: submittedIngredients ? calculateWasteScore({ ...dish, ingredients }, submittedIngredients) : 0,
      portionsToClear: submittedIngredients ? calculatePortions({ ...dish, ingredients }, submittedIngredients) : 1,
    }
    setScaledIngredients(ingredients)
    onDishUpdate(updatedDish)
  }

  const handleScalePortions = (portions: number) => {
    setScalePortions(portions)
    const scaled = dish.ingredients.map(ing => ({
      ...ing,
      quantity: ing.quantity * portions,
    }))
    setScaledIngredients(scaled)
  }

  return (
    <article
      style={{
        padding: '1.5rem',
        marginBottom: '1.5rem',
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      <DishSuggestionCard
        dishName={dish.name}
        description={dish.description}
      />
      <ScoreSection dish={dish} />
      <IngredientTagList ingredients={scaledIngredients} />
      <ReasonSection dish={dish} />
      
      {/* Portion scaling */}
      <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
        <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.5rem' }}>
          Scale for portions to sell:
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="number"
            min={1}
            value={scalePortions}
            onChange={(e) => handleScalePortions(Math.max(1, parseInt(e.target.value) || 1))}
            style={{
              width: '80px',
              padding: '0.5rem 0.75rem',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
            }}
          />
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            portions = {scaledIngredients.map(i => `${i.quantity}${i.unit}`).join(', ')}
          </span>
        </div>
      </div>
      
      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => saveSuggestionToDB(dish)}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.9375rem',
            cursor: 'pointer',
            border: `1px solid var(--color-border)`,
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
          }}
        >
          {LABEL_SAVE}
        </button>
        <button
          type="button"
          onClick={() => onApprove?.(dish)}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.9375rem',
            fontWeight: 600,
            cursor: 'pointer',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-primary)',
            color: '#fff',
          }}
        >
          {LABEL_APPROVE}
        </button>
        <button
          type="button"
          onClick={() => setShowAdjustModal(true)}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.9375rem',
            cursor: 'pointer',
            border: `1px solid var(--color-primary)`,
            borderRadius: 'var(--radius-md)',
            background: 'transparent',
            color: 'var(--color-primary)',
          }}
        >
          {LABEL_ADJUST}
        </button>
      </div>
      
      <AdjustModal
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        ingredients={dish.ingredients}
        onSave={handleSaveIngredients}
      />
    </article>
  )
}

export function OutputPage({
  status,
  suggestions,
  errorMessage,
  onBackToIngredients,
  onApprove,
  onRetry,
  submittedIngredients,
}: OutputPageProps) {
  const [dishList, setDishList] = useState<Dish[]>(suggestions)

  // Sync dishList when suggestions prop changes
  useEffect(() => {
    setDishList(suggestions)
  }, [suggestions])

  const handleDishUpdate = (index: number) => (updatedDish: Dish) => {
    setDishList(prev => prev.map((d, i) => i === index ? updatedDish : d))
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ marginBottom: '1.25rem', textAlign: 'left' }}>
        <button
          type="button"
          onClick={onBackToIngredients}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.9375rem',
            cursor: 'pointer',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-primary-dark)',
            color: '#fff',
            fontWeight: 600,
          }}
        >
          {LABEL_BACK}
        </button>
      </div>

      <div style={{ maxWidth: '36rem', margin: '0 auto' }}>
        <ResultHeader
          title="Your dish suggestions"
          subtitle="Based on your leftover ingredients — ranked by waste cleared"
        />

        {status === 'loading' && <LoadingState />}

        {status === 'error' && (
          <ErrorState
            message={errorMessage ?? undefined}
            onRetry={onRetry}
            onBackToIngredients={onBackToIngredients}
          />
        )}

        {status === 'empty' && (
          <EmptyState onBackToIngredients={onBackToIngredients} onTryAgain={onRetry} />
        )}

        {status === 'success' && dishList.length > 0 && (
          <div style={{ paddingBottom: '2rem' }}>
            {dishList.map((dish, index) => (
              <RecipeCard
                key={`${dish.name}-${index}`}
                dish={dish}
                onApprove={onApprove}
                submittedIngredients={submittedIngredients}
                onDishUpdate={handleDishUpdate(index)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
