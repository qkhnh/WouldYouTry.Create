import type { User } from '@supabase/supabase-js'
import type { Dish } from '@/types/suggestion'
import type { CafeProfile } from '@/types/profile'
import styles from './Sidebar.module.css'

interface SidebarProps {
  savedRecipes: Dish[]
  approvedRecipes: Dish[]
  onRemoveSaved?: (index: number) => void
  onRemoveApproved?: (index: number) => void
  onNavigateToAuth?: () => void
  onViewRecipe?: (recipe: Dish, type: 'saved' | 'approved') => void
  user?: User | null
  profile?: CafeProfile | null
}

export function Sidebar({ savedRecipes, approvedRecipes, onRemoveSaved, onRemoveApproved, onNavigateToAuth, onViewRecipe, user, profile }: SidebarProps) {
  const accountLabel = user
    ? (profile?.cafe_name ?? user.email ?? 'Your account')
    : 'Sign in or create an account'
  
  const handleAccountClick = () => {
    console.log('[SIDEBAR] Account clicked, calling onNavigateToAuth')
    if (onNavigateToAuth) {
      onNavigateToAuth()
    }
  }
  
  return (
    <aside className={styles.sidebar} aria-label="Sidebar">
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Approved recipes</h2>
        {approvedRecipes.length === 0 ? (
          <p className={styles.empty}>No approved recipes yet. Approve a suggestion to add it to your menu.</p>
        ) : (
          <ul className={styles.list}>
            {approvedRecipes.map((recipe, index) => (
              <li key={`approved-${recipe.name}-${index}`}>
                <div 
                  className={`${styles.item} ${onViewRecipe ? styles.itemClickable : ''}`}
                  onClick={() => onViewRecipe?.(recipe, 'approved')}
                  role={onViewRecipe ? 'button' : undefined}
                  tabIndex={onViewRecipe ? 0 : undefined}
                  onKeyDown={onViewRecipe ? (e) => { if (e.key === 'Enter' || e.key === ' ') onViewRecipe(recipe, 'approved') } : undefined}
                >
                  <span className={styles.itemName} title={recipe.name}>
                    {recipe.name}
                  </span>
                  {onRemoveApproved && (
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={(e) => { e.stopPropagation(); onRemoveApproved(index); }}
                      title="Remove from approved"
                      aria-label={`Remove ${recipe.name} from approved`}
                    >
                      ×
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Saved recipes</h2>
        {savedRecipes.length === 0 ? (
          <p className={styles.empty}>No saved recipes yet. Save a suggestion to see it here.</p>
        ) : (
          <ul className={styles.list}>
            {savedRecipes.map((recipe, index) => (
              <li key={`${recipe.name}-${index}`}>
                <div 
                  className={`${styles.item} ${onViewRecipe ? styles.itemClickable : ''}`}
                  onClick={() => onViewRecipe?.(recipe, 'saved')}
                  role={onViewRecipe ? 'button' : undefined}
                  tabIndex={onViewRecipe ? 0 : undefined}
                  onKeyDown={onViewRecipe ? (e) => { if (e.key === 'Enter' || e.key === ' ') onViewRecipe(recipe, 'saved') } : undefined}
                >
                  <span className={styles.itemName} title={recipe.name}>
                    {recipe.name}
                  </span>
                  {onRemoveSaved && (
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={(e) => { e.stopPropagation(); onRemoveSaved(index); }}
                      title="Remove from saved"
                      aria-label={`Remove ${recipe.name} from saved`}
                    >
                      ×
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Account</h2>
        <div
          className={`${styles.accountBlock} ${onNavigateToAuth ? styles.accountBlockClickable : ''}`}
          role={onNavigateToAuth ? 'button' : undefined}
          tabIndex={onNavigateToAuth ? 0 : undefined}
          onClick={handleAccountClick}
          onKeyDown={onNavigateToAuth ? (e) => { if (e.key === 'Enter' || e.key === ' ') handleAccountClick() } : undefined}
        >
          <p className={styles.accountText}>{accountLabel}</p>
          <span className={styles.accountLink}>
            Account settings
          </span>
        </div>
      </div>
    </aside>
  )
}
