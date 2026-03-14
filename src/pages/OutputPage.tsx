import type { Dish, OutputStatus } from '@/types/suggestion'
import { ResultHeader } from '@/components/ResultHeader'
import { DishSuggestionCard } from '@/components/DishSuggestionCard'
import { IngredientTagList } from '@/components/IngredientTagList'
import { ReasonSection } from '@/components/ReasonSection'
import { LoadingState } from '@/components/LoadingState'
import { ErrorState } from '@/components/ErrorState'
import { EmptyState } from '@/components/EmptyState'

export interface OutputPageProps {
  status: OutputStatus
  suggestions: Dish[]
  errorMessage?: string | null
  onBackToIngredients: () => void
  onSave?: (recipe: Dish) => void
  onApprove?: (recipe: Dish) => void
  onRetry?: () => void
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

function RecipeCard({
  dish,
  onSave,
  onApprove,
}: {
  dish: Dish
  onSave?: (recipe: Dish) => void
  onApprove?: (recipe: Dish) => void
}) {
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
        offMenuNote={dish.offMenuNote}
      />
      <ScoreSection dish={dish} />
      <IngredientTagList ingredients={dish.ingredients} />
      <ReasonSection dish={dish} />
      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => onSave?.(dish)}
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
          onClick={() => alert('Adjust dish — coming soon.')}
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
    </article>
  )
}

export function OutputPage({
  status,
  suggestions,
  errorMessage,
  onBackToIngredients,
  onSave,
  onApprove,
  onRetry,
}: OutputPageProps) {
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

        {status === 'success' && suggestions.length > 0 && (
          <div style={{ paddingBottom: '2rem' }}>
            {suggestions.map((dish, index) => (
              <RecipeCard
                key={`${dish.name}-${index}`}
                dish={dish}
                onSave={onSave}
                onApprove={onApprove}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
