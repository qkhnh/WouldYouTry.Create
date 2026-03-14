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
  const profileContext = profile
    ? `Cafe: ${profile.cafe_name ?? 'unnamed'} | Style: ${profile.cuisine_type ?? 'general'}\n`
    : ''

  return `You are a chef assistant for a cafe. Suggest 3 creative off-menu dishes using the available ingredients.

${profileContext}Available equipment: ${equipment}
Pantry staples available: ${pantry}

Today's leftover ingredients:
${ingredientList}

${notes ? `Chef notes: ${notes}\n` : ''}
Return exactly 3 dish suggestions. For each dish include: name, description, ingredient list with quantities, equipment required, and a brief rationale.`
}

// ── callLLM (mock) ─────────────────────────────────────────────────────────────
// Replace the body of this function with a real fetch() to your LLM endpoint.

export async function callLLM(
  _prompt: string,
  ingredients: SubmittedIngredient[]
): Promise<Dish[]> {
  const names = ingredients.map((i) => i.name)
  const first = names[0] ?? 'vegetables'
  const second = names[1] ?? 'herbs'
  const third = names[2] ?? 'eggs'
  const nameStr = names.slice(0, 3).join(', ')

  const mockDishes: Dish[] = [
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
    {
      name: `${third.charAt(0).toUpperCase() + third.slice(1)} & ${second.charAt(0).toUpperCase() + second.slice(1)} Special`,
      description: `A simple composed plate featuring ${nameStr}. Great as a limited daily special.`,
      ingredients: ingredients.slice(0, 4).map((i) => ({
        name: i.name,
        quantity: parseFloat(i.qty) || 1,
        unit: i.unit || 'pcs',
        atRisk: false,
      })),
      equipmentRequired: ['stovetop', 'grill'],
      wasteScore: 0,
      portionsToClear: 0,
      rationale: `Pairs high-value at-risk items together to create a dish with strong menu appeal.`,
      offMenuNote: 'Off-menu special — use while supplies last.',
    },
  ]

  return mockDishes
}

// ── parseResponse ──────────────────────────────────────────────────────────────
// In mock mode this is an identity function.
// When callLLM returns a real JSON tool_use response, parse it here.

export function parseResponse(raw: Dish[]): Dish[] {
  return raw
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
