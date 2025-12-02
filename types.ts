export interface SearchSource {
  uri: string;
  title: string;
}

export interface ParsedAnalysis {
  title: string;
  summary: string;
  impacts: string[];
  historicalContext: string;
}

export interface AnalysisResult {
  rawText: string;
  parsed: ParsedAnalysis;
  sources: SearchSource[];
}

export enum LoadingState {
  IDLE = 'IDLE',
  SEARCHING = 'SEARCHING',
  ANALYZING = 'ANALYZING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR',
}
