import type { Dish } from '@/types/suggestion'
import { DishSuggestionCard } from '@/components/DishSuggestionCard'
import { IngredientTagList } from '@/components/IngredientTagList'

interface RecipeDetailViewProps {
  recipe: Dish
  type: 'saved' | 'approved'
  onBack: () => void
}

export function RecipeDetailView({ recipe, type, onBack }: RecipeDetailViewProps) {
  const wastePercent = Math.round(recipe.wasteScore * 100)

  return (
    <div style={{ padding: '1.5rem', maxWidth: '48rem', margin: '0 auto' }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          padding: '0.5rem 1rem',
          fontSize: '0.9375rem',
          cursor: 'pointer',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-primary-dark)',
          color: '#fff',
          fontWeight: 600,
          marginBottom: '1.5rem',
        }}
      >
        ← Back to suggestions
      </button>

      <div
        style={{
          padding: '1.5rem',
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            padding: '0.25rem 0.75rem',
            marginBottom: '1rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            borderRadius: 'var(--radius-md)',
            background: type === 'approved' ? 'var(--color-primary)' : 'var(--color-surface)',
            color: type === 'approved' ? '#fff' : 'var(--color-text)',
            border: type === 'approved' ? 'none' : '1px solid var(--color-border)',
          }}
        >
          {type === 'approved' ? '✓ Approved' : 'Saved'}
        </div>

        <DishSuggestionCard
          dishName={recipe.name}
          description={recipe.description}
          offMenuNote={recipe.offMenuNote}
        />

        <section style={{ marginBottom: '1.5rem' }}>
          <h3
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--color-text)',
              margin: '0 0 0.75rem',
            }}
          >
            Recipe Stats
          </h3>
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
              ~{recipe.portionsToClear} portion{recipe.portionsToClear !== 1 ? 's' : ''}
            </span>
            {recipe.equipmentRequired.length > 0 && (
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
                Equipment: {recipe.equipmentRequired.join(', ')}
              </span>
            )}
          </div>
        </section>

        <section style={{ marginBottom: '1.5rem' }}>
          <h3
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--color-text)',
              margin: '0 0 0.75rem',
            }}
          >
            Ingredients
          </h3>
          <IngredientTagList ingredients={recipe.ingredients} />
        </section>

        {recipe.rationale && (
          <section>
            <h3
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--color-text)',
                margin: '0 0 0.75rem',
              }}
            >
              Rationale
            </h3>
            <p
              style={{
                fontSize: '0.9375rem',
                color: 'var(--color-text-muted)',
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              {recipe.rationale}
            </p>
          </section>
        )}
      </div>
    </div>
  )
}
