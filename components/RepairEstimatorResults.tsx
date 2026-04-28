'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ALLOWANCE_LABELS,
  EstimateSection,
  EstimateSectionKey,
  RepairEstimateResult,
  SECTION_LABELS,
  SECTION_ORDER,
} from '@/lib/repair-estimator-types';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function formatCurrency(amount: number) {
  return currencyFormatter.format(amount);
}

interface RepairEstimatorResultsProps {
  result: RepairEstimateResult;
}

interface HeaderRowProps {
  label: string;
  value: string;
}

function HeaderRow({ label, value }: HeaderRowProps) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-900 whitespace-pre-wrap">{value}</dd>
    </div>
  );
}

interface SectionTableProps {
  title: string;
  section: EstimateSection;
}

function SectionTable({ title, section }: SectionTableProps) {
  const hasItems = section.lineItems.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-2 px-2 text-left font-semibold text-slate-900">Item</th>
              <th className="py-2 px-2 text-right font-semibold text-slate-900">Amount</th>
            </tr>
          </thead>
          <tbody>
            {hasItems ? (
              section.lineItems.map((lineItem, index) => (
                <tr key={`${lineItem.item}-${index}`} className="border-b border-slate-200">
                  <td className="py-2 px-2 text-slate-700">{lineItem.item}</td>
                  <td className="py-2 px-2 text-right tabular-nums text-slate-900">
                    {formatCurrency(lineItem.amount)}
                  </td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-slate-200">
                <td className="py-2 px-2 text-slate-500 italic" colSpan={2}>
                  No items in scope
                </td>
              </tr>
            )}
            <tr>
              <td className="py-2 px-2 font-semibold text-slate-900">Subtotal</td>
              <td className="py-2 px-2 text-right tabular-nums font-semibold text-slate-900">
                {formatCurrency(section.subtotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export function RepairEstimatorResults({ result }: RepairEstimatorResultsProps) {
  const { header, sections, allowances, summary, notes } = result;

  const allowanceKeys: Array<keyof typeof ALLOWANCE_LABELS> = [
    'concealedDamage',
    'projectManagement',
    'mobilization',
    'debrisDisposal',
  ];

  const renderSalesTax = () => {
    if (typeof summary.salesTax === 'number') {
      return formatCurrency(summary.salesTax);
    }
    if (summary.salesTaxNote) {
      return summary.salesTaxNote;
    }
    return '—';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Repair Cost Estimate</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <HeaderRow label="Client" value={header.clientName} />
            <HeaderRow label="Property Address" value={header.propertyAddress} />
            <HeaderRow label="City / State" value={header.cityState} />
            <HeaderRow label="Tax Rule" value={header.taxRule} />
            <div className="sm:col-span-2">
              <HeaderRow label="Included Scope" value={header.includedScope} />
            </div>
            <div className="sm:col-span-2">
              <HeaderRow label="Excluded Scope" value={header.excludedScope} />
            </div>
          </dl>
        </CardContent>
      </Card>

      {SECTION_ORDER.map((key: EstimateSectionKey) => (
        <SectionTable key={key} title={SECTION_LABELS[key]} section={sections[key]} />
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Allowances &amp; Project Support</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-2 px-2 text-left font-semibold text-slate-900">Item</th>
                <th className="py-2 px-2 text-right font-semibold text-slate-900">Amount</th>
              </tr>
            </thead>
            <tbody>
              {allowanceKeys.map((key) => (
                <tr key={key} className="border-b border-slate-200">
                  <td className="py-2 px-2 text-slate-700">{ALLOWANCE_LABELS[key]}</td>
                  <td className="py-2 px-2 text-right tabular-nums text-slate-900">
                    {formatCurrency(allowances[key])}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="py-2 px-2 font-semibold text-slate-900">Subtotal</td>
                <td className="py-2 px-2 text-right tabular-nums font-semibold text-slate-900">
                  {formatCurrency(allowances.subtotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="py-2 px-2 text-slate-700">Subtotal</td>
                <td className="py-2 px-2 text-right tabular-nums text-slate-900">
                  {formatCurrency(summary.subtotal)}
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-2 px-2 text-slate-700">Sales Tax</td>
                <td className="py-2 px-2 text-right tabular-nums text-slate-900">
                  {renderSalesTax()}
                </td>
              </tr>
              <tr>
                <td className="py-2 px-2 text-base font-bold text-slate-900">TOTAL</td>
                <td className="py-2 px-2 text-right tabular-nums text-base font-bold text-slate-900">
                  {formatCurrency(summary.total)}
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
            {notes.map((note, index) => (
              <li key={`${note}-${index}`}>{note}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
