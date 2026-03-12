# PDF Download Report + Expandable Phone Numbers Design

**Date:** 2026-03-12
**Status:** Approved
**Scope:** Replace email form with PDF download, add expandable phone number options

## Overview

Replace the HubSpot email form with a streamlined PDF download option. Users will download their inspection analysis as a branded PDF. Additionally, make the "SFW can help" banner expandable to show both Portland and Seattle phone numbers side-by-side.

## Changes Required

### 1. Phone Number Banner Enhancement (ReportOutput.tsx)

**Current behavior:** Static banner with Portland phone number only.

**New behavior:**
- Banner becomes interactive/clickable
- Default state: Shows "SFW can help with X items" + Portland number (503) 563-2403 with "Tap to call"
- Expanded state: Both numbers displayed side-by-side:
  - **Portland:** 503-476-9460 (clickable tel: link)
  - **Seattle:** 206-203-2046 (clickable tel: link)
- State is toggled on banner click
- Each number is independently callable via `tel:` protocol

### 2. Replace HubSpotForm with PDF Download Section

**Remove:** `<HubSpotForm>` component from `page.tsx`

**Add:** New `<PDFDownloadSection>` component with:
- Prominent "Download Report as PDF" button
- Brief description: "Save your actionable checklist for later"
- Single, clean call-to-action
- Success feedback after download

### 3. PDF Report Generation (New: lib/pdf-generator.ts)

Generate PDF via `jsPDF + html2canvas` containing:

**Header:**
- SFW logo (from https://sfwconstruction.com/wp-content/uploads/2019/12/logo-footer.png)
- Tagline: "Exterior Home Repair Experts"

**Document Body:**
- Property address (if available)
- Analysis timestamp (date/time report was generated)
- **Issues Section:** All findings organized by priority
  - Critical issues (red)
  - Major issues (orange)
  - Minor issues (yellow)
  - Each issue shows: category, location, description, action
- **SFW Services Section:** Highlighted items SFW can address with service type
- **Other Issues:** Remaining non-SFW items

**Footer:**
- Both phone numbers with locations:
  - Portland: 503-476-9460
  - Seattle: 206-203-2046
- Link to https://sfwconstruction.com/contact-us/

### 4. Component Changes

**New files:**
- `components/PDFDownloadSection.tsx` — Download button + handling
- `lib/pdf-generator.ts` — PDF generation logic

**Modified files:**
- `components/ReportOutput.tsx` — Update banner to track expanded state and show both numbers
- `app/page.tsx` — Replace `<HubSpotForm>` with `<PDFDownloadSection>`

**Dependencies to add:**
- `jspdf` — PDF generation
- `html2canvas` — HTML to canvas conversion for PDF

### 5. Detailed Behavior

#### PDF Download Trigger
- User clicks "Download Report as PDF" button
- PDF is generated client-side using current report data
- PDF filename: `inspection-report-{address-slug}-{date}.pdf` (e.g., `inspection-report-123-main-st-2026-03-12.pdf`)
- Browser triggers download automatically
- Toast notification confirms successful download

#### Phone Banner Expansion
- Click anywhere on the banner to toggle expansion
- Animation: Smooth height transition
- Expanded state persists until user clicks again or navigates away
- Both numbers remain as independent `tel:` links

## Data Flow

```
ReportOutput receives AnalysisResult
├── Update banner state (expanded/collapsed)
├── Show phone numbers based on state
└── PDFDownloadSection receives AnalysisResult
    ├── User clicks "Download"
    └── pdf-generator.ts
        ├── Formats all issue data
        ├── Renders HTML structure
        ├── Converts to PDF via html2canvas + jsPDF
        └── Triggers browser download
```

## Error Handling

- PDF generation fails: Show error toast, maintain download button for retry
- Missing logo URL: Degrade gracefully (omit logo or use fallback)
- Missing address/timestamp: Display as "Not provided" or omit field

## Success Criteria

- ✅ Phone banner expands to show both numbers on click
- ✅ Each number is callable via tel: link
- ✅ PDF downloads include all required content (logo, tagline, issues, footer)
- ✅ PDF is generated client-side without additional server calls
- ✅ HubSpotForm completely removed
- ✅ Visual design matches existing inspection report styling
- ✅ Works in iframe context (existing setup maintained)
