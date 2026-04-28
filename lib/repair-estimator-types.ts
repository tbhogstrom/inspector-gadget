export type EstimateState = 'WA' | 'OR';

export interface LineItem {
  item: string;
  amount: number;
}

export interface EstimateSection {
  lineItems: LineItem[];
  subtotal: number;
}

export interface EstimateSections {
  roofing: EstimateSection;
  exterior: EstimateSection;
  decks: EstimateSection;
  windows: EstimateSection;
  crawlspace: EstimateSection;
  garage: EstimateSection;
  site: EstimateSection;
}

export type EstimateSectionKey = keyof EstimateSections;

export interface EstimateAllowances {
  concealedDamage: number;
  projectManagement: number;
  mobilization: number;
  debrisDisposal: number;
  subtotal: number;
}

export interface EstimateHeader {
  clientName: string;
  propertyAddress: string;
  cityState: string;
  taxRule: 'WA - sales tax included' | 'OR - no sales tax';
  includedScope: string;
  excludedScope: string;
}

export interface EstimateSummary {
  subtotal: number;
  salesTax: number | null;
  salesTaxNote?: string;
  total: number;
}

export interface RepairEstimateResult {
  header: EstimateHeader;
  sections: EstimateSections;
  allowances: EstimateAllowances;
  summary: EstimateSummary;
  notes: string[];
}

export const SECTION_LABELS: Record<EstimateSectionKey, string> = {
  roofing: 'Roofing & Flashing',
  exterior: 'Exterior Siding / Trim / Water Management',
  decks: 'Decks / Guards / Exterior Safety',
  windows: 'Windows / Doors / Interior Carpentry',
  crawlspace: 'Crawlspace / Attic / Insulation / Moisture',
  garage: 'Garage / Misc.',
  site: 'Site / Grounds',
};

export const SECTION_ORDER: EstimateSectionKey[] = [
  'roofing',
  'exterior',
  'decks',
  'windows',
  'crawlspace',
  'garage',
  'site',
];

export const ALLOWANCE_LABELS: Record<keyof Omit<EstimateAllowances, 'subtotal'>, string> = {
  concealedDamage: 'Concealed rot / hidden damage allowance',
  projectManagement: 'Project management / coordination',
  mobilization: 'Mobilization / staging',
  debrisDisposal: 'Debris disposal',
};

export const REQUIRED_NOTES: string[] = [
  'Pricing is based on inspection and allowances',
  'Field conditions may change cost',
  'Electrical, Plumbing, HVAC excluded unless specified',
  'Concealed damage allowance included',
];
