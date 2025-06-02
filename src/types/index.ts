export interface EmailFilter {
  sender?: string;
  fromDate?: string;
  toDate?: string;
  subject?: string;
  query?: string;
}

export interface EmailData {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  body: {
    plain?: string;
    html?: string;
  };
  attachments: Array<{
    filename: string;
    mimeType: string;
    data: string;
  }>;
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'eml';
  path: string;
}

export interface EmailThread {
  threadId: string;
  subject: string;
  participants: string[];
  startDate: string;
  endDate: string;
  messageCount: number;
  messages: EmailData[];
}

export interface ThreadAnalysisResult {
  threadId: string;
  subject: string;
  summary: string;
  topics: string[];
  relevanceScore: number;
  sentimentScore?: number;
  keyInsights: string[];
}

export interface AnalysisOptions {
  inputFile: string;
  outputFile?: string;
  query: string;
  minMessages?: number;
  dateRange?: {
    from?: string;
    to?: string;
  };
  participants?: string[];
  model?: string;
  maxTokens?: number;
}
