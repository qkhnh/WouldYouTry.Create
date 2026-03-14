export interface PantryStaple {
  name: string
  category: string
  typical_quantity: number
  unit: string
}

export interface MenuItem {
  name: string
  category: string
  ingredients: { name: string; quantity: number; unit: string }[]
}

export interface CafeProfile {
  id: string
  user_id: string
  cafe_name: string | null
  description: string | null
  cuisine_type: string | null
  seating_capacity: number | null
  equipment: string[]
  pantry_staples: PantryStaple[]
  menu_items: MenuItem[]
  preferences: {
    chef_notes_examples: string[]
    avoided_ingredients: string[]
    cuisine_style_tags: string[]
  }
  created_at?: string
  updated_at?: string
}
