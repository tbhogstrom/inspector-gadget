import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@/lib/openai';
import { REPAIR_ESTIMATOR_SYSTEM_PROMPT } from '@/lib/repair-estimator-prompt';
import {
  EstimateAllowances,
  EstimateSection,
  EstimateSections,
  EstimateState,
  EstimateSummary,
  LineItem,
  REQUIRED_NOTES,
  RepairEstimateResult,
  SECTION_ORDER,
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
    const taxRuleString = state === 'WA' ? 'WA - include sales tax' : 'OR - no tax';

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

function coerceInt(value: unknown): number {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? n : 0;
}

function normalizeLineItems(value: unknown): LineItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    const rec = isRecord(entry) ? entry : {};
    return {
      item: coerceString(rec.item),
      amount: coerceInt(rec.amount),
    };
  });
}

function normalizeSection(value: unknown): EstimateSection {
  const rec = isRecord(value) ? value : {};
  const lineItems = normalizeLineItems(rec.lineItems);
  const subtotal = lineItems.reduce((sum, li) => sum + li.amount, 0);
  return { lineItems, subtotal };
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
    clientName: inputs.clientName,
    propertyAddress: inputs.propertyAddress,
    cityState: coerceString(headerRaw.cityState),
    taxRule,
    includedScope: coerceString(headerRaw.includedScope),
    excludedScope: coerceString(
      headerRaw.excludedScope,
      'Electrical, Plumbing, HVAC excluded unless specified'
    ),
  };

  const sectionsRaw = isRecord(root.sections) ? root.sections : {};
  const sections = SECTION_ORDER.reduce((acc, key) => {
    acc[key] = normalizeSection(sectionsRaw[key]);
    return acc;
  }, {} as EstimateSections);

  const allowancesRaw = isRecord(root.allowances) ? root.allowances : {};
  const concealedDamage = coerceInt(allowancesRaw.concealedDamage);
  const projectManagement = coerceInt(allowancesRaw.projectManagement);
  const mobilization = coerceInt(allowancesRaw.mobilization);
  const debrisDisposal = coerceInt(allowancesRaw.debrisDisposal);
  const allowances: EstimateAllowances = {
    concealedDamage,
    projectManagement,
    mobilization,
    debrisDisposal,
    subtotal: concealedDamage + projectManagement + mobilization + debrisDisposal,
  };

  const sectionsTotal = SECTION_ORDER.reduce(
    (sum, key) => sum + sections[key].subtotal,
    0
  );
  const summarySubtotal = sectionsTotal + allowances.subtotal;

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
    if (typeof rawTax === 'number' && Number.isFinite(rawTax)) {
      const salesTax = Math.round(Number(rawTax));
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

  const notesRaw = root.notes;
  const notes: string[] =
    Array.isArray(notesRaw) && notesRaw.length >= 4
      ? notesRaw.map((n) => coerceString(n))
      : [...REQUIRED_NOTES];

  return {
    header,
    sections,
    allowances,
    summary,
    notes,
  };
}
