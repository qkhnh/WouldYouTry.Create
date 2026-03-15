import type { Dish } from '@/types/suggestion'
import type { SubmittedIngredient } from '@/pages/PrepPage'
import type { CafeProfile } from '@/types/profile'

// ── Default cafe profile (hardcoded until OnboardingView is built) ─────────────

const DEFAULT_EQUIPMENT = ['stovetop', 'oven', 'grill', 'blender', 'fryer']
const DEFAULT_PANTRY = ['olive oil', 'salt', 'pepper', 'garlic', 'onion', 'butter', 'flour', 'stock']

// Extract unique ingredient names from menu items
function extractMenuIngredients(menuItems?: CafeProfile['menu_items']): Set<string> {
  const ingredients = new Set<string>()
  if (!menuItems) return ingredients
  for (const item of menuItems) {
    for (const ing of item.ingredients) {
      if (ing) {
        ingredients.add(ing.toLowerCase())
      }
    }
  }
  return ingredients
}

// ── buildPrompt ────────────────────────────────────────────────────────────────

export function buildPrompt(
  ingredients: SubmittedIngredient[],
  notes: string,
  profile?: CafeProfile | null
): string {
  const equipment = (profile?.equipment?.length ? profile.equipment : DEFAULT_EQUIPMENT).join(', ')
  
  // Merge default pantry with ingredients from menu items
  const menuIngredients = extractMenuIngredients(profile?.menu_items ?? undefined)
  const defaultPantry = new Set(DEFAULT_PANTRY.map(p => p.toLowerCase()))
  const allAvailable = new Set([...defaultPantry, ...menuIngredients])
  const availableIngredients = Array.from(allAvailable).sort().join(', ')
  
  const ingredientList = ingredients
    .map((i) => `- ${i.name}${i.qty ? ` (${i.qty}${i.unit ? ' ' + i.unit : ''})` : ''}${i.atRisk ? ' [AT RISK - prioritize using this]' : ''}`)
    .join('\n')
  
  // Enhanced menu items formatting for GLM-5
  const menuItemsFormatted = profile?.menu_items?.length
    ? profile.menu_items.map((item) => {
        const ingredientsStr = item.ingredients.length > 0
          ? item.ingredients.join(', ')
          : 'no specific ingredients listed'
        return `  - ${item.name} [${item.category}]: ${ingredientsStr}`
      }).join('\n')
    : ''

  const profileContext = profile
    ? `CAFE NAME: ${profile.cafe_name ?? 'Unnamed Cafe'}\nCUISINE STYLE: ${profile.cuisine_type ?? 'General'}\n`
    : ''

  // Enhanced menu items section with clear context for LLM search
  const menuItemsSection = menuItemsFormatted
    ? `\n=== EXISTING MENU ITEMS (use as reference for style and ingredient patterns) ===\n${menuItemsFormatted}\n`
    : ''

  // Build chef notes section
  const chefNotesSection = notes 
    ? `\nCHEF NOTES: ${notes}\n` 
    : ''

  // GLM-5 optimized prompt with clear step-by-step structure
  return `You are a professional chef assistant helping a cafe create off-menu specials from leftover ingredients.

=== YOUR TASK ===
Create exactly 3 creative off-menu dish suggestions that:
1. Use the available leftover ingredients (prioritize items marked [AT RISK])
2. Match the cafe's style and equipment capabilities
3. Can be prepared with available ingredients (pantry staples and ingredients from existing menu)
4. Are different from existing menu items but complement the menu style

=== CAFE PROFILE ===
${profileContext}AVAILABLE EQUIPMENT: ${equipment}
AVAILABLE INGREDIENTS: ${availableIngredients}${menuItemsSection}
=== TODAY'S LEFTOVER INGREDIENTS ===
${ingredientList}${chefNotesSection}
=== OUTPUT REQUIREMENTS ===
You MUST respond with ONLY a valid JSON array. No markdown, no code blocks, no explanations.

Output format (exactly 3 objects in array):
[
  {
    "name": "Dish Name",
    "description": "Brief description of the dish",
    "ingredients": [{"name": "ingredient", "quantity": 1, "unit": "pcs"}],
    "equipmentRequired": ["stovetop"]
  }
]

Now generate the JSON array:`
}

// ── mockCallLLM (fallback when no API key) ─────────────────────────────────────

function mockCallLLM(_prompt: string, ingredients: SubmittedIngredient[]): Dish[] {
  const names = ingredients.map((i) => i.name)
  const first = names[0] ?? 'vegetables'
  const nameStr = names.slice(0, 3).join(', ')

  return [
    {
      name: `${first.charAt(0).toUpperCase() + first.slice(1)} Hash`,
      description: `A pan-fried hash built around ${nameStr}. Crispy edges, soft centre — ideal as a brunch special.`,
      ingredients: ingredients.slice(0, 4).map((i) => ({
        name: i.name,
        quantity: parseFloat(i.qty) || 1,
        unit: i.unit || 'pcs',
        atRisk: false,
      })),
      equipmentRequired: ['stovetop'],
      wasteScore: 0,
      portionsToClear: 0,
    },
    {
      name: `Kitchen Frittata`,
      description: `Open frittata with ${nameStr}. Perfect for a light brunch or as a side.`,
      ingredients: ingredients.slice(0, 5).map((i) => ({
        name: i.name,
        quantity: parseFloat(i.qty) || 1,
        unit: i.unit || 'pcs',
        atRisk: false,
      })),
      equipmentRequired: ['stovetop', 'oven'],
      wasteScore: 0,
      portionsToClear: 0,
    },
    {
      name: `Chef's Seasonal Bowl`,
      description: `Warm bowl centred on ${nameStr}. Flexible, fresh, and easy to scale.`,
      ingredients: ingredients.slice(0, 5).map((i) => ({
        name: i.name,
        quantity: parseFloat(i.qty) || 1,
        unit: i.unit || 'pcs',
        atRisk: false,
      })),
      equipmentRequired: ['stovetop'],
      wasteScore: 0,
      portionsToClear: 0,
    },
  ]
}

// ── callLLM ────────────────────────────────────────────────────────────────────

export async function callLLM(
  prompt: string,
  ingredients: SubmittedIngredient[]
): Promise<string | Dish[]> {
  const apiKey = import.meta.env.VITE_GLM_API_KEY as string | undefined
  if (!apiKey?.trim()) {
    return mockCallLLM(prompt, ingredients)
  }

  const baseUrl = (import.meta.env.VITE_GLM_BASE_URL as string) ?? 'https://open.bigmodel.cn/api/paas/v4'
  const model = (import.meta.env.VITE_GLM_MODEL as string) ?? 'glm-4-flash'

  const maxRetries = 3
  const baseDelay = 2000 // 2 seconds

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = baseDelay * Math.pow(2, attempt - 1)
      console.log(`GLM API retry ${attempt + 1}/${maxRetries}, waiting ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a professional chef assistant. You MUST respond with ONLY valid JSON arrays, no markdown formatting, no code blocks, no explanations. Start your response directly with [ and end with ].' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 8000,
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('GLM API Error:', res.status, errorText)

      // Retry on rate limit (429) or server errors (5xx)
      if ((res.status === 429 || res.status >= 500) && attempt < maxRetries - 1) {
        console.log(`GLM API rate limited or server error, will retry...`)
        continue
      }

      throw new Error(`GLM API error: ${res.status} - ${errorText}`)
    }

    const data = (await res.json()) as unknown
    console.log('GLM API Response:', JSON.stringify(data, null, 2))

    const typedData = data as {
      choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>
      error?: { message?: string; code?: number; type?: string }
    }

    if (typedData.error) {
      console.error('GLM API Error:', typedData.error)
      throw new Error(`GLM API error: ${typedData.error.message} (code: ${typedData.error.code})`)
    }

    if (!typedData.choices || typedData.choices.length === 0) {
      throw new Error('GLM API error: No choices in response')
    }

    const message = typedData.choices[0]?.message
    const content = message?.content || message?.reasoning_content
    if (!content) {
      console.error('GLM API Response - Missing content:', typedData)
      throw new Error('GLM API error: No content returned in message')
    }
    return content
  }

  throw new Error('GLM API error: Max retries exceeded')
}

// ── normalizeDish ──────────────────────────────────────────────────────────────

interface RawDish {
  name?: string
  description?: string
  ingredients?: Array<{ name?: string; quantity?: number; unit?: string }>
  equipmentRequired?: string[]
}

function normalizeDish(raw: RawDish): Dish {
  const ingredients = (raw.ingredients ?? []).map((ing) => ({
    name: String(ing.name ?? ''),
    quantity: typeof ing.quantity === 'number' ? ing.quantity : parseFloat(String(ing.quantity ?? 1)) || 1,
    unit: String(ing.unit ?? 'pcs'),
    atRisk: false,
  }))
  return {
    name: String(raw.name ?? 'Unnamed dish'),
    description: String(raw.description ?? ''),
    ingredients,
    equipmentRequired: Array.isArray(raw.equipmentRequired) ? raw.equipmentRequired.map(String) : ['stovetop'],
    wasteScore: 0,
    portionsToClear: 0,
  }
}

// ── parseResponse ──────────────────────────────────────────────────────────────

export function parseResponse(raw: string | Dish[]): Dish[] {
  if (Array.isArray(raw)) return raw
  const cleaned = raw.trim().replace(/^```json\n?|\n?```$/g, '')
  const parsed = JSON.parse(cleaned) as unknown
  if (!Array.isArray(parsed)) throw new Error('Expected JSON array')
  return parsed.map((item: RawDish) => normalizeDish(item))
}

// ── fuzzyMatchIngredient ──────────────────────────────────────────────────────
// Match ingredient names with fuzzy logic (handles singular/plural, partial matches)

function fuzzyMatchIngredient(dishIngName: string, submittedNames: Set<string>): boolean {
  const dishLower = dishIngName.toLowerCase().trim()
  
  // Direct match
  if (submittedNames.has(dishLower)) return true
  
  // Check if any submitted name contains the dish ingredient or vice versa
  for (const submitted of submittedNames) {
    // Handle singular/plural and partial matches
    if (dishLower.includes(submitted) || submitted.includes(dishLower)) return true
    
    // Handle common variations (e.g., "bacon" vs "bacon bits")
    const dishWords = dishLower.split(/\s+/)
    const submittedWords = submitted.split(/\s+/)
    if (dishWords.some(w => submittedWords.includes(w))) return true
  }
  
  return false
}

// ── flagAtRiskIngredients ──────────────────────────────────────────────────────

export function flagAtRiskIngredients(
  dishes: Dish[],
  submitted: SubmittedIngredient[]
): Dish[] {
  const atRiskNames = new Set(
    submitted.filter((i) => i.atRisk).map((i) => i.name.toLowerCase().trim())
  )
  
  return dishes.map((dish) => ({
    ...dish,
    ingredients: dish.ingredients.map((ing) => ({
      ...ing,
      atRisk: fuzzyMatchIngredient(ing.name, atRiskNames),
    })),
  }))
}

// ── findSubmittedIngredient ──────────────────────────────────────────────────
// Find a submitted ingredient by fuzzy matching the name

function findSubmittedIngredient(
  ingName: string,
  submittedMap: Map<string, SubmittedIngredient>
): SubmittedIngredient | undefined {
  const ingLower = ingName.toLowerCase().trim()
  
  // Direct match
  if (submittedMap.has(ingLower)) {
    return submittedMap.get(ingLower)
  }
  
  // Fuzzy match - check if any key contains or is contained by the ingredient name
  for (const [key, value] of submittedMap) {
    if (key.includes(ingLower) || ingLower.includes(key)) {
      return value
    }
    // Check word-level matches
    const keyWords = key.split(/\s+/)
    const ingWords = ingLower.split(/\s+/)
    if (keyWords.some(w => ingWords.includes(w))) {
      return value
    }
  }
  
  return undefined
}

// ── calculateWasteScore ────────────────────────────────────────────────────────
// Formula: sum(atRisk_qty_used / atRisk_qty_available) weighted by distinct atRisk count

export function calculateWasteScore(
  dish: Dish,
  submitted: SubmittedIngredient[]
): number {
  const submittedMap = new Map(submitted.map((i) => [i.name.toLowerCase().trim(), i]))

  const atRiskUsed = dish.ingredients.filter((ing) => ing.atRisk)
  if (atRiskUsed.length === 0) return 0

  let sum = 0
  let counted = 0

  for (const ing of atRiskUsed) {
    const src = findSubmittedIngredient(ing.name, submittedMap)
    if (!src) continue
    const available = parseFloat(src.qty)
    if (!available || available <= 0) continue
    sum += Math.min(ing.quantity / available, 1)
    counted++
  }

  if (counted === 0) return 0

  // Weight by proportion of distinct at-risk ingredients used
  const totalAtRisk = submitted.filter((i) => i.atRisk).length
  const distinctWeight = totalAtRisk > 0 ? counted / totalAtRisk : 1

  return Math.min((sum / counted) * distinctWeight, 1)
}

// ── calculatePortions ──────────────────────────────────────────────────────────
// Formula: min(atRisk_qty_available / atRisk_qty_per_portion) across at-risk ingredients

export function calculatePortions(
  dish: Dish,
  submitted: SubmittedIngredient[]
): number {
  const submittedMap = new Map(submitted.map((i) => [i.name.toLowerCase().trim(), i]))

  const atRiskUsed = dish.ingredients.filter((ing) => ing.atRisk && ing.quantity > 0)
  if (atRiskUsed.length === 0) {
    // No at-risk ingredients — estimate from total submitted qty
    const anyIng = dish.ingredients[0]
    if (!anyIng) return 1
    const src = findSubmittedIngredient(anyIng.name, submittedMap)
    if (!src || !parseFloat(src.qty)) return 1
    return Math.max(1, Math.floor(parseFloat(src.qty) / anyIng.quantity))
  }

  let minPortions = Infinity
  for (const ing of atRiskUsed) {
    const src = findSubmittedIngredient(ing.name, submittedMap)
    if (!src) continue
    const available = parseFloat(src.qty)
    if (!available) continue
    minPortions = Math.min(minPortions, Math.floor(available / ing.quantity))
  }

  return minPortions === Infinity ? 1 : Math.max(1, minPortions)
}

// ── scoreDishes ────────────────────────────────────────────────────────────────

export function scoreDishes(
  dishes: Dish[],
  submitted: SubmittedIngredient[]
): Dish[] {
  return dishes.map((dish) => ({
    ...dish,
    wasteScore: calculateWasteScore(dish, submitted),
    portionsToClear: calculatePortions(dish, submitted),
  }))
}

// ── rankDishes ─────────────────────────────────────────────────────────────────

export function rankDishes(scored: Dish[]): Dish[] {
  return [...scored].sort((a, b) => b.wasteScore - a.wasteScore).slice(0, 3)
}

// ── runSession ─────────────────────────────────────────────────────────────────

export async function runSession(
  payload: { ingredients: SubmittedIngredient[]; notes: string },
  profile?: CafeProfile | null
): Promise<Dish[]> {
  const prompt = buildPrompt(payload.ingredients, payload.notes, profile)
  const raw = await callLLM(prompt, payload.ingredients)
  const parsed = parseResponse(raw)
  const flagged = flagAtRiskIngredients(parsed, payload.ingredients)
  const scored = scoreDishes(flagged, payload.ingredients)
  return rankDishes(scored)
}
