// lib/types.ts
export interface Issue {
  priority: 'critical' | 'major' | 'minor';
  category: string;
  description: string;
  location: string;
  action: string;
  sfw_relevant: boolean;
  sfw_service: string | null;
}

export interface AnalysisResult {
  address: string | null;
  client_email: string | null;
  issues: Issue[];
}
