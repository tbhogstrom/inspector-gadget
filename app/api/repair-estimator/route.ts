import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import { REPAIR_ESTIMATOR_SYSTEM_PROMPT } from '@/lib/repair-estimator-prompt';
import {
  DEFAULT_EXCLUSIONS,
  EstimateSection,
  EstimateState,
  EstimateSummary,
  LineItem,
  RepairEstimateResult,
} from '@/lib/repair-estimator-types';

const MAX_CHARS = 80000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientName, propertyAddress, state, reportText } = body ?? {};

    if (!clientName || typeof clientName !== 'string' || clientName.trim().length === 0) {
      return NextResponse.json({ error: 'Valid clientName required' }, { status: 400 });
    }

    if (
      !propertyAddress ||
      typeof propertyAddress !== 'string' ||
      propertyAddress.trim().length === 0
    ) {
      return NextResponse.json({ error: 'Valid propertyAddress required' }, { status: 400 });
    }

    if (state !== 'WA' && state !== 'OR') {
      return NextResponse.json({ error: "state must be 'WA' or 'OR'" }, { status: 400 });
    }

    if (
      !reportText ||
      typeof reportText !== 'string' ||
      reportText.trim().length < 50
    ) {
      return NextResponse.json(
        { error: 'Valid reportText required (min 50 characters)' },
        { status: 400 }
      );
    }

    const trimmedClientName = clientName.trim();
    const trimmedPropertyAddress = propertyAddress.trim();
    const truncatedReport = reportText.slice(0, MAX_CHARS);
    const taxRuleString = state === 'WA' ? 'WA - apply local sales tax' : 'OR - no tax';

    const userMessage = `CLIENT: ${trimmedClientName}\nPROPERTY ADDRESS: ${trimmedPropertyAddress}\nLOCATION: ${state} (${taxRuleString})\nESTIMATE TYPE: Negotiation/Projection\n\nINSPECTION REPORT:\n${truncatedReport}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: REPAIR_ESTIMATOR_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    const parsed: unknown = JSON.parse(raw);

    const result = normalizeRepairEstimate(parsed, {
      clientName: trimmedClientName,
      propertyAddress: trimmedPropertyAddress,
      state,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('repair-estimator error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function coerceString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function coerceOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function coerceInt(value: unknown): number {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? n : 0;
}

function coerceStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => coerceString(entry)).filter((entry) => entry.trim().length > 0);
}

function normalizeLineItems(value: unknown): LineItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    const rec = isRecord(entry) ? entry : {};
    const item: LineItem = {
      item: coerceString(rec.item),
      amount: coerceInt(rec.amount),
    };
    const qty = coerceOptionalString(rec.qty);
    const unitCost = coerceOptionalString(rec.unitCost);
    if (qty) item.qty = qty;
    if (unitCost) item.unitCost = unitCost;
    return item;
  });
}

function normalizeSection(value: unknown): EstimateSection {
  const rec = isRecord(value) ? value : {};
  const title = coerceString(rec.title, 'Scope');
  const lineItems = normalizeLineItems(rec.lineItems);
  const subtotal = lineItems.reduce((sum, li) => sum + li.amount, 0);
  return { title, lineItems, subtotal };
}

function normalizeRepairEstimate(
  raw: unknown,
  inputs: { clientName: string; propertyAddress: string; state: EstimateState }
): RepairEstimateResult {
  const root = isRecord(raw) ? raw : {};

  const headerRaw = isRecord(root.header) ? root.header : {};
  const taxRule: RepairEstimateResult['header']['taxRule'] =
    inputs.state === 'WA' ? 'WA - sales tax included' : 'OR - no sales tax';

  const header: RepairEstimateResult['header'] = {
    estimateTitle: coerceString(headerRaw.estimateTitle, 'Preliminary Repair Estimate'),
    clientName: inputs.clientName,
    propertyAddress: inputs.propertyAddress,
    cityState: coerceString(headerRaw.cityState),
    taxRule,
    date: coerceOptionalString(headerRaw.date),
    preparedBy: coerceOptionalString(headerRaw.preparedBy) ?? 'Bryan Mullen – SFW Construction, LLC',
    structureDetails: coerceOptionalString(headerRaw.structureDetails),
    purpose: coerceOptionalString(headerRaw.purpose),
    includedScope: coerceOptionalString(headerRaw.includedScope),
    excludedScope: coerceOptionalString(headerRaw.excludedScope),
  };

  const sectionsRaw = root.sections;
  const sections: EstimateSection[] = Array.isArray(sectionsRaw)
    ? sectionsRaw
        .map((section) => normalizeSection(section))
        .filter((section) => section.title.trim().length > 0)
    : [];

  const summarySubtotal = sections.reduce((sum, section) => sum + section.subtotal, 0);

  const summaryRaw = isRecord(root.summary) ? root.summary : {};
  let summary: EstimateSummary;
  if (inputs.state === 'OR') {
    summary = {
      subtotal: summarySubtotal,
      salesTax: null,
      total: summarySubtotal,
    };
  } else {
    const rawTax = summaryRaw.salesTax;
    if (typeof rawTax === 'number' && Number.isFinite(rawTax) && rawTax > 0) {
      const salesTax = Math.round(rawTax);
      summary = {
        subtotal: summarySubtotal,
        salesTax,
        total: summarySubtotal + salesTax,
      };
    } else {
      summary = {
        subtotal: summarySubtotal,
        salesTax: null,
        salesTaxNote: 'Sales tax (WA - rate TBD)',
        total: summarySubtotal,
      };
    }
  }

  const assumptions = coerceStringArray(root.assumptions);
  const exclusionsRaw = coerceStringArray(root.exclusions);
  const exclusions = exclusionsRaw.length > 0 ? exclusionsRaw : [...DEFAULT_EXCLUSIONS];

  return {
    header,
    assumptions,
    sections,
    summary,
    exclusions,
  };
}
