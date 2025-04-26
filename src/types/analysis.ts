
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
}
