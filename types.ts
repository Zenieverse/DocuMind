
export enum ProcessingStep {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  OCR_EXTRACTING = 'OCR_EXTRACTING', // Mapping PaddleOCR-VL
  SEMANTIC_ANALYSIS = 'SEMANTIC_ANALYSIS', // Mapping ERNIE 4.5
  MULTIMODAL_REASONING = 'MULTIMODAL_REASONING', // Mapping ERNIE 5
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface DocumentEntity {
  type: string;
  value: string;
  confidence: number;
}

export interface AnalysisResult {
  markdown: string;
  jsonSchema: any;
  sections: {
    title: string;
    content: string;
    riskScore: number;
    entities: DocumentEntity[];
  }[];
  explanation: string;
  websiteCode?: string;
}

export interface AppState {
  file: File | null;
  previewUrl: string | null;
  step: ProcessingStep;
  result: AnalysisResult | null;
  error: string | null;
}
