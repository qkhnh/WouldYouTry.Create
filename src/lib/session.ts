import type { Dish } from '@/types/suggestion'
import type { SubmittedIngredient } from '@/pages/PrepPage'
import type { CafeProfile } from '@/types/profile'

// ── Default cafe profile (hardcoded until OnboardingView is built) ─────────────

const DEFAULT_EQUIPMENT = ['stovetop', 'oven', 'grill', 'blender', 'fryer']
const DEFAULT_PANTRY = ['olive oil', 'salt', 'pepper', 'garlic', 'onion', 'butter', 'flour', 'stock']

// ── buildPrompt ────────────────────────────────────────────────────────────────

export function buildPrompt(
  ingredients: SubmittedIngredient[],
  notes: string,
  profile?: CafeProfile | null
): string {
  const equipment = (profile?.equipment?.length ? profile.equipment : DEFAULT_EQUIPMENT).join(', ')
  const pantry = profile?.pantry_staples?.length
    ? profile.pantry_staples.map((p) => p.name).join(', ')
    : DEFAULT_PANTRY.join(', ')
  const ingredientList = ingredients
    .map((i) => `- ${i.name}${i.qty ? ` (${i.qty}${i.unit ? ' ' + i.unit : ''})` : ''}${i.atRisk ? ' [AT RISK]' : ''}`)
    .join('\n')
  
  const menuItemsFormatted = profile?.menu_items?.length
    ? profile.menu_items.map((item) => {
        const ingredientsStr = item.ingredients
          .map((ing) => `${ing.name} ${ing.quantity}${ing.unit}`)
          .join(', ')
        return `${item.name}: ${ingredientsStr}`
      }).join('\n')
    : ''

  const profileContext = profile
    ? `Cafe: ${profile.cafe_name ?? 'unnamed'} | Style: ${profile.cuisine_type ?? 'general'}\n`
    : ''

  const menuItemsSection = menuItemsFormatted
    ? `\nCurrent menu items:\n${menuItemsFormatted}\n`
    : ''

  return `You are a chef assistant for a cafe. Suggest 3 creative off-menu dishes using the available ingredients.

${profileContext}Available equipment: ${equipment}
Pantry staples available: ${pantry}${menuItemsSection}
Today's leftover ingredients:
${ingredientList}

${notes ? `Chef notes: ${notes}\n` : ''}
Respond with ONLY a valid JSON array of exactly 3 objects. Each object must have:
- name (string)
- description (string)
- ingredients (array of { name, quantity, unit })
- equipmentRequired (array of strings)
- rationale (string)
- offMenuNote (string, optional)
No markdown, no explanation, just the JSON array.`
}

// ── mockCallLLM (fallback when no API key) ─────────────────────────────────────

function mockCallLLM(_prompt: string, ingredients: SubmittedIngredient[]): Dish[] {
  const names = ingredients.map((i) => i.name)
  const first = names[0] ?? 'vegetables'
  const second = names[1] ?? 'herbs'
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
      rationale: `Uses your at-risk ${first} and ${second} as the centrepiece. Minimal prep, fast service.`,
      offMenuNote: 'Off-menu special — use while supplies last.',
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
      rationale: `A frittata is the most efficient way to clear multiple at-risk ingredients in one pan.`,
      offMenuNote: 'Off-menu special — use while supplies last.',
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
      rationale: `Bowl format lets you scale up or down with whatever quantity is left of each ingredient.`,
      offMenuNote: 'Off-menu special — use while supplies last.',
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
          { role: 'system', content: 'You are a chef assistant. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
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
      choices?: Array<{ message?: { content?: string } }>
      error?: { message?: string; code?: number; type?: string }
    }

    if (typedData.error) {
      console.error('GLM API Error:', typedData.error)
      throw new Error(`GLM API error: ${typedData.error.message} (code: ${typedData.error.code})`)
    }

    if (!typedData.choices || typedData.choices.length === 0) {
      throw new Error('GLM API error: No choices in response')
    }

    const content = typedData.choices[0]?.message?.content
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
  rationale?: string
  offMenuNote?: string
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
    rationale: String(raw.rationale ?? ''),
    offMenuNote: raw.offMenuNote != null ? String(raw.offMenuNote) : undefined,
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

// ── flagAtRiskIngredients ──────────────────────────────────────────────────────

export function flagAtRiskIngredients(
  dishes: Dish[],
  submitted: SubmittedIngredient[]
): Dish[] {
  const atRiskNames = new Set(
    submitted.filter((i) => i.atRisk).map((i) => i.name.toLowerCase())
  )
  return dishes.map((dish) => ({
    ...dish,
    ingredients: dish.ingredients.map((ing) => ({
      ...ing,
      atRisk: atRiskNames.has(ing.name.toLowerCase()),
    })),
  }))
}

// ── calculateWasteScore ────────────────────────────────────────────────────────
// Formula: sum(atRisk_qty_used / atRisk_qty_available) weighted by distinct atRisk count

export function calculateWasteScore(
  dish: Dish,
  submitted: SubmittedIngredient[]
): number {
  const submittedMap = new Map(submitted.map((i) => [i.name.toLowerCase(), i]))

  const atRiskUsed = dish.ingredients.filter((ing) => ing.atRisk)
  if (atRiskUsed.length === 0) return 0

  let sum = 0
  let counted = 0

  for (const ing of atRiskUsed) {
    const src = submittedMap.get(ing.name.toLowerCase())
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
  const submittedMap = new Map(submitted.map((i) => [i.name.toLowerCase(), i]))

  const atRiskUsed = dish.ingredients.filter((ing) => ing.atRisk && ing.quantity > 0)
  if (atRiskUsed.length === 0) {
    // No at-risk ingredients — estimate from total submitted qty
    const anyIng = dish.ingredients[0]
    if (!anyIng) return 1
    const src = submittedMap.get(anyIng.name.toLowerCase())
    if (!src || !parseFloat(src.qty)) return 1
    return Math.max(1, Math.floor(parseFloat(src.qty) / anyIng.quantity))
  }

  let minPortions = Infinity
  for (const ing of atRiskUsed) {
    const src = submittedMap.get(ing.name.toLowerCase())
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
