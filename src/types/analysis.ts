
export interface Finding {
  category: string;
  severity: 'low' | 'medium' | 'high';
  feedback: string;
}

export interface FixSuggestion {
  issue: string;
  severity: 'low' | 'medium' | 'high';
  suggestedFix: string;
}

export interface SuggestedRewrite {
  headline?: string;
  subheadline?: string;
}

export interface RawWeb3Analysis {
  heroSection: {
    score: number;
    severity: 'low' | 'medium' | 'high';
    feedback: string;
  };
  trustAndSocialProof: {
    score: number;
    severity: 'low' | 'medium' | 'high';
    feedback: string;
  };
  messagingClarity: {
    score: number;
    severity: 'low' | 'medium' | 'high';
    feedback: string;
  };
  ctaStrategy: {
    score: number;
    severity: 'low' | 'medium' | 'high';
    feedback: string;
  };
  visualFlow: {
    score: number;
    severity: 'low' | 'medium' | 'high';
    feedback: string;
  };
  web3Relevance: {
    score: number;
    severity: 'low' | 'medium' | 'high';
    feedback: string;
  };
  fixMap: FixSuggestion[];
  suggestedRewrite: SuggestedRewrite;
  overallScore: number;
}

export interface AIAnalysis {
  score: number;
  summary: string;
  findings: Finding[];
  categories: { [key: string]: number };
  
  // Raw analysis data for advanced usage
  rawAnalysis?: RawWeb3Analysis;
  
  // Legacy API fields (for compatibility)
  overallScore?: number;
  categoryScores?: { [key: string]: number };
  feedback?: {
    category: string;
    severity: 'low' | 'medium' | 'high';
    feedback: string;
  }[];
  error?: string;
}
