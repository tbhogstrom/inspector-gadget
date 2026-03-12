# Bid Checker Tool Design

**Date:** 2026-03-12
**Status:** Approved
**Scope:** Document analysis tool for evaluating exterior contractor bids

## Overview

A document analysis tool that helps homeowners evaluate contractor bids on exterior home repairs. Users describe their repair need and upload a bid/estimate. The tool scores the bid on a rubric (Sensible / Warning / Do Not Move Forward) and flags specific issues, deceptive tactics, scope mismatches, and provides follow-up questions.

**Scope:** Exterior repairs only—siding repair, dry rot repair, deck repair, window and door leaks, exterior water damage.

## Input

1. **Repair Description** (required)
   - Brief user-provided description of the repair they think they need
   - Example: "Water coming in around my kitchen window"
   - Used to detect scope creep/upselling

2. **Bid Document** (required)
   - Contractor estimate/quote in text, PDF, or DOCX format
   - Reuses inspector gadget's document parsing infrastructure

## Output: Bid Score & Analysis

### Overall Score
- **Sensible:** Bid scope matches described repair, terms reasonable, no major red flags
- **Warning:** Red flags present (scope questions, unusual terms, deceptive indicators); follow-up questions suggested
- **Do Not Move Forward:** Major scope creep, deceptive tactics detected, or unreasonable/predatory terms

### Category Breakdown

Each category receives brief assessment:

1. **Scope Alignment**
   - Does bid scope match user's described repair?
   - Flags if contractor is recommending work beyond stated need (scope creep)

2. **Pricing**
   - Is the price reasonable for the repair type and regional market?
   - Flags unusually low (potential cutting corners) or high (overcharging)

3. **Payment Terms**
   - Deposit size reasonable? (typically 10-50% for exterior work)
   - Milestone structure clear?
   - Final payment terms fair?

4. **Insurance & Licensing**
   - Does bid claim proper insurance coverage?
   - Does bid claim licensing/bonding?
   - Flagged as unchecked claims (user must verify)

5. **Warranty/Guarantee**
   - Is warranty period specified?
   - What's covered vs. excluded?
   - Timeframe clear?

6. **Timeline**
   - Is estimated completion realistic for the repair scope?
   - Flags unrealistic timelines that suggest corner-cutting

7. **Deceptive Tactics**
   - High-pressure language ("Act now," "Limited time offer")
   - Pressure to use contractor's suppliers
   - Vague scope descriptions
   - Pressure to decide immediately
   - Other contractor red flags

8. **Trust Indicators / Scope Creep**
   - **Primary trust violation:** Scope mismatch between user's stated need and bid scope
   - Example flagging: "You reported water around your window, but this bid is for full siding replacement—this may indicate unnecessary upselling. Consider a targeted Time & Materials repair estimate instead."

### Result Display

1. Overall score (color-coded: green/yellow/red)
2. Category-by-category breakdown with brief assessment
3. **Scope mismatch alert** (if detected) with suggestion to consider T&M alternative
4. List of specific issues flagged, each with explanation
5. Suggested follow-up questions for homeowner to ask contractor

## Agent/Prompt Design

Uses OpenAI agent with system prompt that:
- Understands exterior home repair work, scopes, and typical costs
- Knows common deceptive tactics in contractor bids (pressure, upselling, vague terms, etc.)
- Trained to detect scope creep (bid scope significantly larger than user's stated repair need)
- Evaluates payment terms, warranty language, and risk factors
- Can be updated with new deceptive tactic patterns as discovered
- Surfaces opportunities for targeted Time & Materials work as alternative

## Shared Infrastructure with Inspector Gadget

Reuses:
- Document upload component (`UploadZone`)
- Document parsing (PDF, DOCX, text extraction)
- API structure for OpenAI agent calls
- Results card display patterns
- Layout/styling infrastructure
- Iframe height auto-adjustment (if needed)

## File Structure

**New files:**
- `components/BidChecker.tsx` — Main component with repair description form + upload
- `components/BidCheckerResults.tsx` — Results display with score, categories, issues, follow-up questions
- `lib/bid-checker-agent.ts` — OpenAI agent setup for bid evaluation
- `app/(tools)/bid-checker/page.tsx` — Route for standalone bid checker tool

**Modified files:**
- May share common parsing/upload utilities with inspector gadget

## Error Handling

- **Missing repair description:** Require before allowing upload
- **Document parsing fails:** Show error, allow retry
- **Agent fails:** Show error, allow retry with same bid/description
- **Deceptive tactic detection:** Flag conservatively, prefer false positives to false negatives

## Success Criteria

✅ User can describe repair in plain language
✅ User can upload bid document (text/PDF/DOCX)
✅ Tool evaluates bid against rubric
✅ Scope mismatches flagged and explained
✅ Results clearly communicate score and specific issues
✅ Follow-up questions are actionable
✅ T&M alternative is suggested when appropriate
✅ Reuses inspector gadget document parsing and components
✅ Works in iframe context (existing setup)
✅ Results display matches inspection gadget styling/patterns

## Constraints

- **Exterior repairs only:** Tool clarifies this upfront; may reject clearly non-exterior bids
- **Can't verify licensing/insurance:** Tool flags claims for user to independently verify
- **Pricing is heuristic:** Regional market data is approximate; tool advises getting multiple bids
- **Not legal advice:** Tool cannot interpret legal contract terms definitively; recommends consulting attorney for complex contracts
