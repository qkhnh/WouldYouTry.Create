import type { User } from '@supabase/supabase-js'
import type { Dish } from '@/types/suggestion'
import type { CafeProfile } from '@/types/profile'
import styles from './Sidebar.module.css'

interface SidebarProps {
  savedRecipes: Dish[]
  onRemoveSaved?: (index: number) => void
  onNavigateToAuth?: () => void
  user?: User | null
  profile?: CafeProfile | null
}

export function Sidebar({ savedRecipes, onRemoveSaved, onNavigateToAuth, user, profile }: SidebarProps) {
  const accountLabel = user
    ? (profile?.cafe_name ?? user.email ?? 'Your account')
    : 'Sign in or create an account'
  return (
    <aside className={styles.sidebar} aria-label="Sidebar">
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Saved recipes</h2>
        {savedRecipes.length === 0 ? (
          <p className={styles.empty}>No saved recipes yet. Save a suggestion to see it here.</p>
        ) : (
          <ul className={styles.list}>
            {savedRecipes.map((recipe, index) => (
              <li key={`${recipe.name}-${index}`}>
                <div className={styles.item}>
                  <span className={styles.itemName} title={recipe.name}>
                    {recipe.name}
                  </span>
                  {onRemoveSaved && (
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => onRemoveSaved(index)}
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
          onClick={onNavigateToAuth}
          onKeyDown={onNavigateToAuth ? (e) => { if (e.key === 'Enter' || e.key === ' ') onNavigateToAuth() } : undefined}
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
