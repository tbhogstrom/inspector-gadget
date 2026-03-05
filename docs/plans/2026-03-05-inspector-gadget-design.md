# Inspector Gadget — PoC Design

**Date:** 2026-03-05
**Status:** Approved

## Overview

A stateless single-page web app that accepts a home inspection report PDF or TXT file, analyzes it with OpenAI, and returns a prioritized action list of inspection issues. Hosted on Vercel. Embeds into WordPress (WP Engine) and Astro sites via iframe. HubSpot form integration for emailing the report to the user (stubbed in PoC, wired up later).

---

## Stack

- **Framework:** Next.js 14, TypeScript, App Router
- **Styling:** Tailwind CSS + shadcn/ui (Radix UI)
- **PDF parsing:** pdf-parse
- **File upload:** react-dropzone
- **LLM:** OpenAI API (GPT-4o)
- **Toasts:** sonner
- **Hosting:** Vercel
- **Embedding:** iframe

---

## App Structure

```
inspector-gadget/
├── app/
│   ├── page.tsx                  ← single-page UI
│   ├── layout.tsx
│   └── api/
│       ├── parse-pdf/route.ts    ← extracts text from PDF or TXT
│       └── analyze/route.ts      ← sends to OpenAI, returns priority list
├── components/
│   ├── UploadZone.tsx
│   ├── ReportOutput.tsx
│   └── HubSpotForm.tsx           ← stubbed in PoC
└── lib/
    └── openai.ts                 ← OpenAI client + system prompt
```

---

## Data Flow

1. User drops a PDF or TXT file onto the upload zone
2. `POST /api/parse-pdf` — pdf-parse extracts text from PDF; TextDecoder handles TXT; returns `{ text }`
3. `POST /api/analyze` — text chunked if needed, sent to GPT-4o with system prompt, returns structured JSON
4. UI renders prioritized issue list grouped by Critical / Major / Minor
5. Pre-filled HubSpot stub form shown below with extracted address and client email, editable before submit

---

## OpenAI Output Schema

```json
{
  "address": "123 Main St, Springfield, IL",
  "client_email": "buyer@email.com",
  "issues": [
    {
      "priority": "critical",
      "category": "Roof",
      "description": "Missing shingles on north slope",
      "location": "Section 4.2 - Roof",
      "action": "Hire licensed roofer for immediate repair"
    }
  ]
}
```

Priority levels: `critical`, `major`, `minor`

---

## UI States

1. **Upload** — dropzone, PDF and TXT supported, max 10MB
2. **Processing** — spinner while parse + analyze run
3. **Results** — three collapsible sections (Critical, Major, Minor) + HubSpot stub form pre-filled with address and email
4. **Submitted** — confirmation message

---

## HubSpot Form (PoC stub)

- Rendered below the results
- Pre-populated fields: property address, client email (extracted by OpenAI)
- User can review and edit before submitting
- PoC uses a simple form stub; real HubSpot portal ID + form ID wired up post-PoC

---

## Embedding

The Vercel URL is dropped into an `<iframe>` on WordPress (WP Engine) or Astro sites. No special configuration needed on the app side — the app is fully self-contained.

---

## Out of Scope (PoC)

- User authentication
- Report storage / history
- DOCX support
- Streaming responses
