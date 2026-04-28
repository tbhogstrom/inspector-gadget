'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  EstimateSection,
  RepairEstimateResult,
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
  index: number;
  section: EstimateSection;
}

function SectionTable({ index, section }: SectionTableProps) {
  const showQtyCol = section.lineItems.some((li) => li.qty);
  const showUnitCostCol = section.lineItems.some((li) => li.unitCost);
  const colCount = 2 + (showQtyCol ? 1 : 0) + (showUnitCostCol ? 1 : 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {index}) {section.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-2 px-2 text-left font-semibold text-slate-900">Item</th>
              {showQtyCol && (
                <th className="py-2 px-2 text-left font-semibold text-slate-900 whitespace-nowrap">
                  Qty/Unit
                </th>
              )}
              {showUnitCostCol && (
                <th className="py-2 px-2 text-left font-semibold text-slate-900 whitespace-nowrap">
                  Unit Cost
                </th>
              )}
              <th className="py-2 px-2 text-right font-semibold text-slate-900">Amount</th>
            </tr>
          </thead>
          <tbody>
            {section.lineItems.length > 0 ? (
              section.lineItems.map((lineItem, idx) => (
                <tr key={`${lineItem.item}-${idx}`} className="border-b border-slate-200">
                  <td className="py-2 px-2 text-slate-700">{lineItem.item}</td>
                  {showQtyCol && (
                    <td className="py-2 px-2 text-slate-700 whitespace-nowrap">
                      {lineItem.qty ?? '—'}
                    </td>
                  )}
                  {showUnitCostCol && (
                    <td className="py-2 px-2 text-slate-700 whitespace-nowrap">
                      {lineItem.unitCost ?? '—'}
                    </td>
                  )}
                  <td className="py-2 px-2 text-right tabular-nums text-slate-900">
                    {formatCurrency(lineItem.amount)}
                  </td>
                </tr>
              ))
            ) : (
              <tr className="border-b border-slate-200">
                <td className="py-2 px-2 text-slate-500 italic" colSpan={colCount}>
                  No items in scope
                </td>
              </tr>
            )}
            <tr>
              <td
                className="py-2 px-2 font-semibold text-slate-900"
                colSpan={colCount - 1}
              >
                Section Subtotal
              </td>
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
  const { header, assumptions, sections, summary, exclusions } = result;

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
          <CardTitle className="text-xl">
            SFW Construction – {header.estimateTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <HeaderRow label="Client" value={header.clientName} />
            <HeaderRow label="Property Address" value={header.propertyAddress} />
            {header.cityState && <HeaderRow label="City / State" value={header.cityState} />}
            <HeaderRow label="Tax Rule" value={header.taxRule} />
            {header.date && <HeaderRow label="Date" value={header.date} />}
            {header.preparedBy && <HeaderRow label="Prepared By" value={header.preparedBy} />}
            {header.structureDetails && (
              <div className="sm:col-span-2">
                <HeaderRow label="Structure" value={header.structureDetails} />
              </div>
            )}
            {header.purpose && (
              <div className="sm:col-span-2">
                <HeaderRow label="Purpose" value={header.purpose} />
              </div>
            )}
            {header.includedScope && (
              <div className="sm:col-span-2">
                <HeaderRow label="Included Scope" value={header.includedScope} />
              </div>
            )}
            {header.excludedScope && (
              <div className="sm:col-span-2">
                <HeaderRow label="Excluded Scope" value={header.excludedScope} />
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {assumptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assumptions used for pricing</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
              {assumptions.map((entry, index) => (
                <li key={`${entry}-${index}`}>{entry}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {sections.map((section, index) => (
        <SectionTable key={`${section.title}-${index}`} index={index + 1} section={section} />
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-2 px-2 text-left font-semibold text-slate-900">Section</th>
                <th className="py-2 px-2 text-right font-semibold text-slate-900">Amount</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((section, index) => (
                <tr
                  key={`summary-${section.title}-${index}`}
                  className="border-b border-slate-200"
                >
                  <td className="py-2 px-2 text-slate-700">
                    {index + 1}) {section.title}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums text-slate-900">
                    {formatCurrency(section.subtotal)}
                  </td>
                </tr>
              ))}
              <tr className="border-b border-slate-200">
                <td className="py-2 px-2 font-semibold text-slate-900">Subtotal</td>
                <td className="py-2 px-2 text-right tabular-nums font-semibold text-slate-900">
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
                <td className="py-2 px-2 text-base font-bold text-slate-900">
                  Estimated Total
                </td>
                <td className="py-2 px-2 text-right tabular-nums text-base font-bold text-slate-900">
                  {formatCurrency(summary.total)}
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {exclusions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Exclusions / clarifications</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
              {exclusions.map((entry, index) => (
                <li key={`${entry}-${index}`}>{entry}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
