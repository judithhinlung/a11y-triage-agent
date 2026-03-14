export interface AuditRequest {
  id: string;
  url: string;
  requestedAt: string; // ISO 8601
  options?: {
    depth?: number;       // crawl depth (default: 1)
    includeScreenshot?: boolean;
    wcagLevel?: 'A' | 'AA' | 'AAA';
  };
}

export interface CrawlResult {
  requestId: string;
  url: string;
  crawledAt: string; // ISO 8601
  htmlSnapshot: string;
  links: string[];
  statusCode: number;
  error?: string;
}

export interface ScanViolation {
  id: string;
  crawlResultId: string;
  wcagCriteria: string;   // e.g. "1.1.1"
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  selector: string;       // CSS selector of the offending element
  helpUrl?: string;
}

export interface MLClassification {
  violationId: string;
  label: string;          // e.g. "missing-alt-text"
  confidence: number;     // 0–1
  suggestedFix?: string;
  modelVersion: string;
}

export interface ReportOutput {
  requestId: string;
  generatedAt: string;    // ISO 8601
  url: string;
  summary: {
    total: number;
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
  violations: ScanViolation[];
  classifications: MLClassification[];
  format: 'json' | 'html' | 'pdf';
}
