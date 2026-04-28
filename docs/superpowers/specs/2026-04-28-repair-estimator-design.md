# Repair Estimator — Design

**Date:** 2026-04-28
**Status:** Approved (pending spec review)
**Linear ticket:** repair-estimator (to be created)

## Purpose

A new Inspector Gadget tool that takes a home inspection report and produces a structured contractor-grade repair cost estimate, suitable for buyer negotiation or fixed-cost budgeting. The tool is driven by a tightly-scoped construction-estimating prompt that defines fixed sections, allowance categories, and tax rules for WA vs OR.

## User flow

1. User opens `/repair-estimator`.
2. User fills in:
   - Client name (text)
   - Property address (text)
   - State: **WA** or **OR** (segmented control)
   - Inspection report (PDF/TXT/DOCX upload)
3. User clicks **Generate Estimate**.
4. App parses the report, sends report text + metadata to the model, renders a structured estimate.
5. User can click **Generate Another Estimate** to start over (inputs cleared).

Estimate type is fixed at "Negotiation/Projection" (no UI toggle in v1).

## Architecture

### File layout

New files:

```
app/(tools)/repair-estimator/page.tsx     # Page shell + iframe-height postMessage
app/api/repair-estimator/route.ts         # POST handler: validate, call OpenAI, normalize
lib/repair-estimator-prompt.ts            # System prompt (verbatim user prompt + JSON schema instruction)
lib/repair-estimator-types.ts             # TypeScript types for the JSON response
components/RepairEstimator.tsx            # Input form
components/RepairEstimatorResults.tsx     # Results tables
```

Reused (no changes):

- `app/api/parse-pdf/route.ts`
- `lib/openai.ts`
- `components/UploadZone.tsx`
- `components/ui/*` (shadcn primitives)

### Data flow

```
User upload + form
  → POST /api/parse-pdf (multipart) → { text }
  → POST /api/repair-estimator { clientName, propertyAddress, state, reportText }
       → OpenAI chat.completions (gpt-4o, JSON mode, temperature 0.1)
       → JSON.parse → normalize (recompute subtotals, fill missing sections/notes)
  → RepairEstimateResult
  → RepairEstimatorResults renders tables
```

## JSON schema (model response shape)

```ts
// lib/repair-estimator-types.ts

export type EstimateState = 'WA' | 'OR';

export interface LineItem {
  item: string;
  amount: number; // USD, integer
}

export interface EstimateSection {
  lineItems: LineItem[];
  subtotal: number;
}

export interface RepairEstimateResult {
  header: {
    clientName: string;
    propertyAddress: string;
    cityState: string;
    taxRule: 'WA - sales tax included' | 'OR - no sales tax';
    includedScope: string;
    excludedScope: string;
  };
  sections: {
    roofing: EstimateSection;       // Roofing & Flashing
    exterior: EstimateSection;      // Exterior Siding / Trim / Water Management
    decks: EstimateSection;         // Decks / Guards / Exterior Safety
    windows: EstimateSection;       // Windows / Doors / Interior Carpentry
    crawlspace: EstimateSection;    // Crawlspace / Attic / Insulation / Moisture
    garage: EstimateSection;        // Garage / Misc.
    site: EstimateSection;          // Site / Grounds
  };
  allowances: {
    concealedDamage: number;
    projectManagement: number;
    mobilization: number;
    debrisDisposal: number;
    subtotal: number;
  };
  summary: {
    subtotal: number;
    salesTax: number | null;
    salesTaxNote?: string;
    total: number;
  };
  notes: string[]; // 4 required items
}
```

### Schema rules

- **Sections are an object with named keys** (not an array) so they always render in fixed order, and the seven required sections are always present. Empty sections use `lineItems: []` and `subtotal: 0`.
- **Amounts are integers in USD.** Subtotals are recomputed in the API route (server-side, before responding) from line items as defensive insurance against model arithmetic drift.
- **Sales tax behavior:**
  - OR: `salesTax = null`, `salesTaxNote` omitted, `taxRule = 'OR - no sales tax'`.
  - WA: `salesTax = null` and `salesTaxNote = 'Sales tax (WA - rate TBD)'` when rate is unknown; otherwise `salesTax` is a positive integer.
- **Notes** — fixed list of four items per the prompt; if the model returns fewer, the API route fills missing required items from a constant.

## API route — `app/api/repair-estimator/route.ts`

Mirrors `app/api/bid-checker/route.ts`:

```
POST body: { clientName, propertyAddress, state, reportText }
```

Validation (returns 400 on failure):

- All four fields present and non-empty strings.
- `state` is `'WA'` or `'OR'`.
- `reportText.trim().length >= 50`.

Processing:

- Truncate `reportText` to `MAX_CHARS = 80000` (existing convention).
- Build user message:

  ```
  CLIENT: <clientName>
  PROPERTY ADDRESS: <propertyAddress>
  LOCATION: <state> (<tax-rule-string>)
  ESTIMATE TYPE: Negotiation/Projection

  INSPECTION REPORT:
  <reportText>
  ```

- `openai.chat.completions.create({ model: 'gpt-4o', temperature: 0.1, response_format: { type: 'json_object' }, messages: [...] })`.
- Parse JSON; pass through `normalizeRepairEstimate(result)` (see below).
- Return normalized result.

Errors: 500 with `error: message`, log to console (existing pattern).

### Normalization (`normalizeRepairEstimate`)

Defensive server-side cleanup that runs in the API route before the response is returned:

1. Ensure all 7 section keys exist; missing keys → `{ lineItems: [], subtotal: 0 }`.
2. Recompute each section's `subtotal` from its `lineItems` (overwrite model value).
3. Recompute `allowances.subtotal` from the four allowance amounts (overwrite model value).
4. Recompute `summary.subtotal = sum(section subtotals) + allowances.subtotal` (overwrite).
5. Recompute `summary.total = summary.subtotal + (summary.salesTax ?? 0)` (overwrite).
6. If `notes.length < 4`, append missing required notes from a constant `REQUIRED_NOTES`.

The constant `REQUIRED_NOTES`:

```
- Pricing is based on inspection and allowances
- Field conditions may change cost
- Electrical, Plumbing, HVAC excluded unless specified
- Concealed damage allowance included
```

## System prompt — `lib/repair-estimator-prompt.ts`

The user-supplied prompt verbatim, with this block appended:

```
OUTPUT FORMAT OVERRIDE
You will return your response as a JSON object matching this exact schema.
Do NOT return markdown or tables. The application will render tables from your JSON.

<TypeScript schema describing RepairEstimateResult, copied from lib/repair-estimator-types.ts>

Rules for the JSON output:
- All seven sections must be present, even if a section has no line items
  (use an empty lineItems array and subtotal: 0).
- Allowances must include all four fixed items: concealedDamage, projectManagement,
  mobilization, debrisDisposal.
- Notes must include the four required items from the NOTES section of this prompt.
- Amounts are integers in USD. Subtotals = sum of line item amounts.
- Summary subtotal = sum of section subtotals + allowances.subtotal.
- For WA: if you don't know the local rate, set salesTax to null and set
  salesTaxNote to "Sales tax (WA - rate TBD)". For OR: salesTax must be null
  and salesTaxNote omitted.
- Total = subtotal + (salesTax ?? 0).
```

This is the one place the user prompt's "TABLES ONLY" instruction is overridden, but every structural rule (seven sections, four allowances, four notes) carries through into the schema.

## UI components

### `components/RepairEstimator.tsx`

A `Card` containing a form with:

- Text input — Client Name (required)
- Text input — Property Address (required)
- Segmented control / radio — State: **WA** | **OR** (required)
- `UploadZone` — Inspection report (PDF/TXT/DOCX, required)
- Submit button — disabled until all four are present

Submit handler:

1. POST PDF to `/api/parse-pdf`, get `{ text }`.
2. POST `{ clientName, propertyAddress, state, reportText: text }` to `/api/repair-estimator`.
3. On success → call `onResults(result)` (lifted to page).
4. On error → `toast.error(message)`, stay on input view, preserve inputs.

Loading state: plain spinner with "Generating estimate... usually takes 20-40 seconds".

### `components/RepairEstimatorResults.tsx`

Top to bottom:

1. **Header card** — client name, property address, city/state, tax rule, included scope, excluded scope.
2. **Seven section tables** in fixed order (Roofing & Flashing → Site / Grounds). Each table: two columns (Item, Amount), bold header row, bold subtotal row. Empty sections show a muted "No items in scope" row.
3. **Allowances & Project Support table** — four fixed rows + subtotal.
4. **Summary table** — Subtotal / Sales Tax / **TOTAL** (TOTAL bold, larger). Sales tax row shows dollar amount, `salesTaxNote` string, or "—" (OR or null with no note).
5. **Notes** — bullet list.
6. **Generate Another Estimate** button — resets state.

Currency formatting: `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })`.

### `app/(tools)/repair-estimator/page.tsx`

Three-state shell (`input` → `processing` → `results`) following the same pattern as the root analyzer. Includes the iframe-height `postMessage` effect (matches existing tools so the page works embedded in sfwconstruction.com).

## Error handling

| Failure | Surface | Recovery |
|---|---|---|
| Missing/invalid form fields | Inline form validation; submit disabled | User fills missing fields |
| `/api/parse-pdf` fails | `toast.error` | Stay on input view; inputs preserved |
| `/api/repair-estimator` 400 (validation) | `toast.error` with reason | Same |
| `/api/repair-estimator` 500 (OpenAI / parse) | `toast.error` with message | Same |
| Model returns malformed JSON | API route catches `JSON.parse`, returns 500 | Same — user retries |
| Model returns partial schema | Normalization fills gaps; renders | None needed |

## Out of scope (v1)

- PDF download / export
- Loading game (plain spinner instead)
- Estimate type toggle (Fixed Cost vs Negotiation) — defaults to Negotiation
- Unit pricing override input
- Custom pricing adjustments
- Saving / sharing estimates server-side

These can be added later without changing the schema.

## Testing notes

- Manual: run a sample inspection report through the form for both WA and OR, confirm the 7 sections render even when empty, the right tax rule shows, totals add up.
- The normalization step makes the response resilient to model arithmetic drift; verify by mutating a returned subtotal in browser devtools and confirming the displayed total matches the recomputed value.
- No unit tests configured in the repo per CLAUDE.md; ESLint + `npm run build` (TypeScript) gate before commit.

## Documentation workflow

After implementation, per CLAUDE.md:

- Add a `docs/repair-estimator/` directory if anything beyond this design doc is needed.
- Update the Linear ticket `repair-estimator` with the implementing commit hash and a link to this design doc.
