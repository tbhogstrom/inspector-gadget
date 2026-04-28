export type EstimateState = 'WA' | 'OR';

export interface LineItem {
  item: string;
  qty?: string;
  unitCost?: string;
  amount: number;
}

export interface EstimateSection {
  title: string;
  lineItems: LineItem[];
  subtotal: number;
}

export interface EstimateHeader {
  estimateTitle: string;
  clientName: string;
  propertyAddress: string;
  cityState: string;
  taxRule: 'WA - sales tax included' | 'OR - no sales tax';
  date?: string;
  preparedBy?: string;
  structureDetails?: string;
  purpose?: string;
  includedScope?: string;
  excludedScope?: string;
}

export interface EstimateSummary {
  subtotal: number;
  salesTax: number | null;
  salesTaxNote?: string;
  total: number;
}

export interface RepairEstimateResult {
  header: EstimateHeader;
  assumptions: string[];
  sections: EstimateSection[];
  summary: EstimateSummary;
  exclusions: string[];
}

export const DEFAULT_EXCLUSIONS: string[] = [
  'Pricing is based on the inspection report and incorporates allowances and industry-standard assumptions where exact quantities cannot be confirmed without opening assemblies.',
  'Field conditions, access limitations, and concealed damage discovered during demolition or repairs may change scope requirements.',
  'Electrical, plumbing, and HVAC work excluded unless specifically added.',
  'Final selections (siding profile, trim package, window sizes/specs, finishes) may move costs up or down.',
];
