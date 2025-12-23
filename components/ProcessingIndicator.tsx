
import React from 'react';
import { ProcessingStep } from '../types';

interface ProcessingIndicatorProps {
  currentStep: ProcessingStep;
}

const steps = [
  { id: ProcessingStep.OCR_EXTRACTING, label: 'PaddleOCR: Visual Extraction', desc: 'Analyzing layout, tables & markers' },
  { id: ProcessingStep.SEMANTIC_ANALYSIS, label: 'ERNIE 4.5: Semantic Layer', desc: 'Classifying sections & detecting risks' },
  { id: ProcessingStep.MULTIMODAL_REASONING, label: 'ERNIE 5: Multimodal Fuse', desc: 'Generating human-level insights' },
];

export const ProcessingIndicator: React.FC<ProcessingIndicatorProps> = ({ currentStep }) => {
  const getStepIndex = (step: ProcessingStep) => {
    switch(step) {
      case ProcessingStep.OCR_EXTRACTING: return 0;
      case ProcessingStep.SEMANTIC_ANALYSIS: return 1;
      case ProcessingStep.MULTIMODAL_REASONING: return 2;
      case ProcessingStep.COMPLETED: return 3;
      default: return -1;
    }
  };

  const currentIndex = getStepIndex(currentStep);

  return (
    <div className="space-y-6">
      {steps.map((step, idx) => {
        const isActive = idx === currentIndex;
        const isDone = idx < currentIndex;

        return (
          <div key={step.id} className={`flex items-start gap-4 transition-opacity duration-500 ${isDone || isActive ? 'opacity-100' : 'opacity-30'}`}>
            <div className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${isDone ? 'bg-cyan-500 border-cyan-500' : isActive ? 'border-cyan-400 animate-pulse' : 'border-slate-700'}`}>
              {isDone ? (
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              ) : (
                <div className={`h-2 w-2 rounded-full ${isActive ? 'bg-cyan-400' : 'bg-slate-700'}`} />
              )}
            </div>
            <div>
              <h4 className={`text-sm font-semibold ${isActive ? 'text-cyan-400' : 'text-slate-300'}`}>{step.label}</h4>
              <p className="text-xs text-slate-500">{step.desc}</p>
              {isActive && (
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full bg-cyan-500 animate-[loading_1.5s_infinite_linear]" style={{ width: '40%' }}></div>
                </div>
              )}
            </div>
          </div>
        );
      })}
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );
};
