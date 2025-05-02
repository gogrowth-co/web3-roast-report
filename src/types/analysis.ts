
export interface Finding {
  category: string;
  severity: 'low' | 'medium' | 'high';
  feedback: string;
}

export interface AIAnalysis {
  score: number;
  summary: string;
  findings: Finding[];
  categories: { [key: string]: number };
  screenshot_url?: string;
  
  // New API fields
  overallScore?: number;
  categoryScores?: { [key: string]: number };
  feedback?: {
    category: string;
    severity: 'low' | 'medium' | 'high';
    feedback: string;
  }[];
  error?: string;
}
