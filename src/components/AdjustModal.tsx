import { useState } from 'react'
import type { DishIngredient } from '@/types/suggestion'

interface AdjustModalProps {
  isOpen: boolean
  onClose: () => void
  ingredients: DishIngredient[]
  onSave: (ingredients: DishIngredient[]) => void
}

export function AdjustModal({ isOpen, onClose, ingredients, onSave }: AdjustModalProps) {
  const [editedIngredients, setEditedIngredients] = useState<DishIngredient[]>(ingredients)
  const [newIngredientName, setNewIngredientName] = useState('')
  const [newIngredientQty, setNewIngredientQty] = useState('')
  const [newIngredientUnit, setNewIngredientUnit] = useState('g')

  if (!isOpen) return null

  const updateIngredient = (index: number, field: 'name' | 'quantity' | 'unit', value: string | number) => {
    setEditedIngredients(prev => prev.map((ing, i) => 
      i === index ? { ...ing, [field]: value } : ing
    ))
  }

  const removeIngredient = (index: number) => {
    setEditedIngredients(prev => prev.filter((_, i) => i !== index))
  }

  const addIngredient = () => {
    if (!newIngredientName.trim()) return
    setEditedIngredients(prev => [...prev, {
      name: newIngredientName.trim(),
      quantity: parseFloat(newIngredientQty) || 1,
      unit: newIngredientUnit || 'g',
      atRisk: false,
    }])
    setNewIngredientName('')
    setNewIngredientQty('')
    setNewIngredientUnit('g')
  }

  const handleSave = () => {
    onSave(editedIngredients)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'var(--color-bg-card)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-text)' }}>Adjust Ingredients</h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              padding: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Ingredient list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
          {editedIngredients.map((ing, index) => (
            <div key={index} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                value={ing.name}
                onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                placeholder="Name"
                style={{
                  flex: 2,
                  padding: '0.5rem 0.75rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                }}
              />
              <input
                type="number"
                value={ing.quantity}
                onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                placeholder="Qty"
                style={{
                  width: '70px',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                }}
              />
              <input
                type="text"
                value={ing.unit}
                onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                placeholder="Unit"
                style={{
                  width: '50px',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem',
                }}
              />
              <button
                type="button"
                onClick={() => removeIngredient(index)}
                style={{
                  padding: '0.375rem 0.5rem',
                  border: '1px solid var(--color-warning)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'transparent',
                  color: 'var(--color-warning)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        {/* Add new ingredient */}
        <div style={{ 
          padding: '1rem', 
          background: 'var(--color-bg)', 
          borderRadius: 'var(--radius-md)', 
          marginBottom: '1rem' 
        }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>
            Add ingredient
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="text"
              value={newIngredientName}
              onChange={(e) => setNewIngredientName(e.target.value)}
              placeholder="Name"
              style={{
                flex: 2,
                padding: '0.5rem 0.75rem',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
              }}
            />
            <input
              type="number"
              value={newIngredientQty}
              onChange={(e) => setNewIngredientQty(e.target.value)}
              placeholder="Qty"
              style={{
                width: '70px',
                padding: '0.5rem 0.75rem',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
              }}
            />
            <input
              type="text"
              value={newIngredientUnit}
              onChange={(e) => setNewIngredientUnit(e.target.value)}
              placeholder="Unit"
              style={{
                width: '50px',
                padding: '0.5rem 0.75rem',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
              }}
            />
            <button
              type="button"
              onClick={addIngredient}
              disabled={!newIngredientName.trim()}
              style={{
                padding: '0.5rem 0.75rem',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                background: newIngredientName.trim() ? 'var(--color-primary)' : 'var(--color-border)',
                color: '#fff',
                cursor: newIngredientName.trim() ? 'pointer' : 'default',
                fontSize: '0.875rem',
              }}
            >
              Add
            </button>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-bg)',
              color: 'var(--color-text)',
              cursor: 'pointer',
              fontSize: '0.9375rem',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-primary)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.9375rem',
              fontWeight: 600,
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
