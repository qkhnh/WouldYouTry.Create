# PrepBrain

Cafe dish suggestion app — enter leftover ingredients and get off-menu dish ideas ranked by waste reduction.

---

## AI Suggestion Logic

The suggestion pipeline lives in `src/lib/session.ts`. Flow:

```
runSession(payload, profile)
  → buildPrompt()
  → callLLM()        [mock or real API]
  → parseResponse()
  → flagAtRiskIngredients()
  → scoreDishes()
  → rankDishes()
  → top 3 Dish[]
```

### 1. `buildPrompt(ingredients, notes, profile?)`

Builds the prompt string for the LLM. Includes:

- **Cafe context**: name, cuisine type (from profile)
- **Equipment**: from profile or default (stovetop, oven, grill, blender, fryer)
- **Pantry staples**: from profile or default (olive oil, salt, pepper, etc.)
- **Leftover ingredients**: name, quantity, unit, and `[AT RISK]` flag
- **Chef notes**: optional free text

### 2. `callLLM(prompt, ingredients)`

**Current**: Mock implementation — returns 4 hardcoded dishes templated from ingredient names (Hash, Frittata, Seasonal Bowl, Special).

**To wire real LLM**: Replace the body with a `fetch()` to your API. Use structured output (tool_use / function calling) with schema:

```
tool: suggest_dishes
dishes: array of 3 items
  - name, description, ingredients[], equipment_required[], rationale
```

### 3. `parseResponse(raw)`

Identity in mock mode. For real LLM: parse the JSON tool_use response into `Dish[]`.

### 4. `flagAtRiskIngredients(dishes, submitted)`

Cross-references each dish ingredient with the user’s submitted ingredients. If the user marked an ingredient as at-risk, that flag is set on the corresponding dish ingredient. Used for highlighting in the UI and for scoring.

### 5. `calculateWasteScore(dish, submitted)`

Returns `0–1`. Formula:

- For each at-risk ingredient used: `min(quantity_used / quantity_available, 1)`
- Average across at-risk ingredients
- Weight by `distinct_at_risk_used / total_at_risk_submitted`
- Clamp to 1

Higher score = more at-risk stock used.

### 6. `calculatePortions(dish, submitted)`

Returns integer. Formula:

- For each at-risk ingredient: `floor(available / quantity_per_portion)`
- Take the minimum across at-risk ingredients
- Fallback: 1 if no at-risk ingredients

### 7. `scoreDishes(dishes, submitted)`

Runs `calculateWasteScore` and `calculatePortions` on each dish and attaches the results.

### 8. `rankDishes(scored)`

Sorts by `wasteScore` descending and returns the top 3.

---

## Data Shapes

**Input** (`PrepPayload`): `{ ingredients: [{ name, qty, unit, atRisk }], notes }`

**Output** (`Dish`): `{ name, description, ingredients: [{ name, quantity, unit, atRisk }], equipmentRequired, wasteScore, portionsToClear, rationale, offMenuNote? }`

---

## Wiring a Real LLM

1. Replace `callLLM` in `src/lib/session.ts` with a fetch to OpenAI / Anthropic / etc.
2. Use tool/function calling with the `suggest_dishes` schema.
3. Implement `parseResponse` to extract the `Dish[]` from the tool_use payload.
4. `buildPrompt`, scoring, and ranking stay the same.
