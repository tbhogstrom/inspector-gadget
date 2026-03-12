export type BidScore = 'sensible' | 'warning' | 'do_not_move_forward';

export interface CategoryScore {
  rating: BidScore;
  explanation: string;
}

export interface SpecificIssue {
  category: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  follow_up_question: string;
}

export interface BidCheckerResult {
  overall_score: BidScore;
  category_scores: {
    scope_alignment: CategoryScore;
    pricing: CategoryScore;
    payment_terms: CategoryScore;
    insurance_licensing: CategoryScore;
    warranty: CategoryScore;
    timeline: CategoryScore;
    deceptive_tactics: CategoryScore;
  };
  specific_issues: SpecificIssue[];
  follow_up_questions: string[];
  sfw_tm_suggestion: string;
}
