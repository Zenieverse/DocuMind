
import React, { useState, useCallback, useRef } from 'react';
import { ProcessingStep, AppState, AnalysisResult } from './types';
import { processDocument } from './services/geminiService';
import { ProcessingIndicator } from './components/ProcessingIndicator';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    file: null,
    previewUrl: null,
    step: ProcessingStep.IDLE,
    result: null,
    error: null,
  });
  const [intent, setIntent] = useState<string>('analyze contract and check for missing clauses');
  const [activeTab, setActiveTab] = useState<'markdown' | 'json' | 'sections' | 'web'>('sections');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setState(prev => ({ ...prev, file, previewUrl: url, result: null, error: null, step: ProcessingStep.IDLE }));
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result?.toString().split(',')[1] || '');
      reader.onerror = error => reject(error);
    });
  };

  const runAnalysis = async () => {
    if (!state.file) return;

    try {
      setState(prev => ({ ...prev, step: ProcessingStep.OCR_EXTRACTING, error: null }));
      
      const base64 = await fileToBase64(state.file);
      
      // Simulate sequential steps for better UX visual feedback
      setTimeout(() => setState(prev => ({ ...prev, step: ProcessingStep.SEMANTIC_ANALYSIS })), 2000);
      setTimeout(() => setState(prev => ({ ...prev, step: ProcessingStep.MULTIMODAL_REASONING })), 4000);

      const result = await processDocument(base64, state.file.type, intent);
      
      setState(prev => ({ ...prev, step: ProcessingStep.COMPLETED, result }));
    } catch (err: any) {
      console.error(err);
      setState(prev => ({ ...prev, step: ProcessingStep.FAILED, error: err.message || 'Analysis failed' }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-900/20">
              <svg className="text-white h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              DocuMind AI
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-slate-700 text-slate-500 font-mono">
              ERNIE 5.0 CORE
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Documentation</button>
            <button className="text-sm font-medium bg-white text-slate-950 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors shadow-sm">
              Deploy Agent
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex max-w-7xl mx-auto w-full p-6 gap-6 overflow-hidden">
        {/* Left Sidebar: Controls & Progress */}
        <aside className="w-80 flex flex-col gap-6 shrink-0">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Document Input</h3>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 rounded-lg p-6 flex flex-col items-center gap-3 cursor-pointer hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all"
            >
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,application/pdf" />
              <svg className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              <div className="text-center">
                <p className="text-xs font-medium text-slate-300">Drop PDF or Image</p>
                <p className="text-[10px] text-slate-500 mt-1">Multimodal processing enabled</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-slate-500 uppercase">Analysis Intent</label>
              <textarea 
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none resize-none transition-all placeholder:text-slate-700"
                placeholder="Describe your goal..."
              />
            </div>

            <button 
              onClick={runAnalysis}
              disabled={!state.file || state.step !== ProcessingStep.IDLE && state.step !== ProcessingStep.COMPLETED && state.step !== ProcessingStep.FAILED}
              className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 
                ${(!state.file || state.step !== ProcessingStep.IDLE && state.step !== ProcessingStep.COMPLETED && state.step !== ProcessingStep.FAILED)
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-cyan-500 text-white hover:bg-cyan-400 active:scale-[0.98]'}`}
            >
              {state.step === ProcessingStep.IDLE || state.step === ProcessingStep.COMPLETED ? 'Start Intelligence' : 'Processing...'}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
          </div>

          {(state.step !== ProcessingStep.IDLE && state.step !== ProcessingStep.FAILED) && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-6">Processing Pipeline</h3>
              <ProcessingIndicator currentStep={state.step} />
            </div>
          )}
        </aside>

        {/* Main Content: Viewer & Results */}
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          {/* Top Preview/Insight Section */}
          <div className="grid grid-cols-2 gap-6 h-[400px]">
             {/* Left: Original Document */}
             <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden relative">
               <div className="px-4 py-2 border-b border-slate-800 bg-slate-800/30 flex justify-between items-center">
                 <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Original Input</span>
                 <span className="text-[10px] text-cyan-500 font-mono">PADDLE-OCR-VL READY</span>
               </div>
               <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950">
                 {state.previewUrl ? (
                   <img src={state.previewUrl} className="max-w-full max-h-full rounded shadow-2xl" alt="Document Preview" />
                 ) : (
                   <div className="text-slate-700 italic text-sm">No document loaded</div>
                 )}
               </div>
             </div>

             {/* Right: AI Explanation/Reasoning */}
             <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
               <div className="px-4 py-2 border-b border-slate-800 bg-slate-800/30">
                 <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">ERNIE 5 Reasoning</span>
               </div>
               <div className="flex-1 overflow-auto p-6 space-y-4">
                 {state.result ? (
                   <div className="animate-in fade-in duration-700">
                     <p className="text-slate-300 leading-relaxed text-sm">
                       {state.result.explanation}
                     </p>
                     <div className="mt-6 flex gap-3">
                        <div className="px-3 py-1 bg-cyan-900/30 border border-cyan-800 rounded text-[10px] text-cyan-400 font-mono">ENTITY EXTRACTED</div>
                        <div className="px-3 py-1 bg-blue-900/30 border border-blue-800 rounded text-[10px] text-blue-400 font-mono">STRUCTURE VALIDATED</div>
                     </div>
                   </div>
                 ) : state.step !== ProcessingStep.IDLE ? (
                   <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-600">
                     <div className="h-8 w-8 rounded-full border-2 border-cyan-500/20 border-t-cyan-500 animate-spin" />
                     <p className="text-xs font-mono animate-pulse">Synthesizing semantic nodes...</p>
                   </div>
                 ) : (
                   <div className="h-full flex items-center justify-center text-slate-700 italic text-sm">
                     Waiting for analysis initiation...
                   </div>
                 )}
               </div>
             </div>
          </div>

          {/* Bottom Structured Results Tabs */}
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
             <div className="flex border-b border-slate-800 bg-slate-800/30">
                <button 
                  onClick={() => setActiveTab('sections')} 
                  className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'sections' ? 'border-cyan-500 text-cyan-400 bg-slate-800/50' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                  Analyzed Sections
                </button>
                <button 
                  onClick={() => setActiveTab('markdown')} 
                  className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'markdown' ? 'border-cyan-500 text-cyan-400 bg-slate-800/50' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                  Markdown (Clean)
                </button>
                <button 
                  onClick={() => setActiveTab('json')} 
                  className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'json' ? 'border-cyan-500 text-cyan-400 bg-slate-800/50' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                  JSON Schema
                </button>
                {state.result?.websiteCode && (
                  <button 
                    onClick={() => setActiveTab('web')} 
                    className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 ${activeTab === 'web' ? 'border-cyan-500 text-cyan-400 bg-slate-800/50' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                    Deployable Output
                  </button>
                )}
             </div>

             <div className="flex-1 overflow-auto p-6">
                {!state.result && state.step === ProcessingStep.IDLE && (
                   <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-600 opacity-50">
                     <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                     <p className="text-sm font-medium">Intelligence results will appear here</p>
                   </div>
                )}

                {state.result && (
                  <div className="animate-in slide-in-from-bottom-2 duration-500 h-full">
                    {activeTab === 'sections' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {state.result.sections.map((section, idx) => (
                          <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-4 hover:border-slate-700 transition-colors">
                            <div className="flex justify-between items-start">
                              <h4 className="text-cyan-400 font-bold text-sm tracking-tight">{section.title}</h4>
                              <div className={`text-[10px] px-2 py-0.5 rounded-full border ${section.riskScore > 0.5 ? 'border-red-900 bg-red-950/30 text-red-400' : 'border-green-900 bg-green-950/30 text-green-400'}`}>
                                Risk Score: {(section.riskScore * 100).toFixed(0)}%
                              </div>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed line-clamp-4">{section.content}</p>
                            <div className="flex flex-wrap gap-2">
                              {section.entities.map((ent, eIdx) => (
                                <span key={eIdx} className="bg-slate-900 border border-slate-800 px-2 py-1 rounded text-[10px] text-slate-500">
                                  <strong className="text-slate-300">{ent.type}:</strong> {ent.value}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeTab === 'markdown' && (
                      <div className="h-full bg-slate-950 rounded-lg border border-slate-800 p-6">
                        <pre className="text-xs font-mono text-slate-400 whitespace-pre-wrap leading-relaxed">
                          {state.result.markdown}
                        </pre>
                      </div>
                    )}

                    {activeTab === 'json' && (
                      <div className="h-full bg-slate-950 rounded-lg border border-slate-800 p-6 overflow-auto">
                        <pre className="text-xs font-mono text-cyan-500/80">
                          {JSON.stringify(state.result.jsonSchema, null, 2)}
                        </pre>
                      </div>
                    )}

                    {activeTab === 'web' && (
                      <div className="h-full flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-slate-500">Generated UI based on document schema & intent</p>
                          <button className="text-[10px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-3 py-1 rounded hover:bg-cyan-500/30 transition-all">
                            COPY SOURCE
                          </button>
                        </div>
                        <div className="flex-1 bg-white rounded-lg border border-slate-800 overflow-hidden shadow-2xl">
                          <iframe 
                            srcDoc={state.result.websiteCode}
                            className="w-full h-full"
                            title="Preview"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
             </div>
          </div>
        </div>
      </main>

      {/* Status Bar */}
      <footer className="h-8 border-t border-slate-800/60 bg-slate-950 px-6 flex items-center justify-between text-[10px] font-mono text-slate-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className={`h-2 w-2 rounded-full ${state.step === ProcessingStep.FAILED ? 'bg-red-500' : 'bg-green-500'}`} />
            <span>SYSTEM READY</span>
          </div>
          <span>LATENCY: 450ms</span>
          <span>GPU: V100 CLUSTER</span>
        </div>
        <div>
          DOCUMIND AI V2.4.0-STABLE
        </div>
      </footer>
    </div>
  );
};

export default App;
