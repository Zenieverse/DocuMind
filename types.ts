
export enum ProcessingStep {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  OCR_EXTRACTING = 'OCR_EXTRACTING',
  SEMANTIC_ANALYSIS = 'SEMANTIC_ANALYSIS',
  MULTIMODAL_REASONING = 'MULTIMODAL_REASONING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export type AppMode = 'DOC_INTEL' | 'CREATIVE' | 'LIVE_VOICE' | 'CHAT' | 'VIDEO' | 'TRANSCRIPTION' | 'HUGGING_FACE';

export interface AnalysisResult {
  markdown: string;
  jsonSchema: any;
  sections: {
    title: string;
    content: string;
    riskScore: number;
    entities: { type: string; value: string; confidence: number }[];
  }[];
  explanation: string;
  websiteCode?: string;
  groundingUrls?: { web?: { uri: string; title: string }; maps?: { uri: string; title: string } }[];
}

export interface AppState {
  file: File | null;
  previewUrl: string | null;
  step: ProcessingStep;
  result: AnalysisResult | null;
  error: string | null;
}
