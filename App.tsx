
import React, { useState, useRef, useEffect } from 'react';
import { AppMode, AppState, ProcessingStep, AnalysisResult } from './types';
import * as gemini from './services/geminiService';
import { ProcessingIndicator } from './components/ProcessingIndicator';
import { GoogleGenAI, Modality } from "@google/genai";

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('DOC_INTEL');
  const [state, setState] = useState<AppState>({
    file: null, previewUrl: null, step: ProcessingStep.IDLE, result: null, error: null,
  });
  
  // Dashboard UI States
  const [activeResultTab, setActiveResultTab] = useState('sections');
  const [isKeySetup, setIsKeySetup] = useState(false);
  
  // Doc Intel Configuration
  const [intelIntent, setIntelIntent] = useState('Extract structured insights and detect risks.');
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [mapsEnabled, setMapsEnabled] = useState(false);
  const [thinkingEnabled, setThinkingEnabled] = useState(false);

  // Creative Suite States
  const [creativePrompt, setCreativePrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageSize, setImageSize] = useState('1K');
  const [creativeOutput, setCreativeOutput] = useState<string | null>(null);

  // Hugging Face Integration - Default to Zenieverse
  const [hfQuery, setHfQuery] = useState('Zenieverse');
  const [hfResults, setHfResults] = useState<{ explanation: string; items: any[]; groundingUrls: any[] } | null>(null);

  // Chat / Conversations
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [isLiteMode, setIsLiteMode] = useState(false);

  // Live Voice Session
  const [isLiveActive, setIsLiveActive] = useState(false);
  const liveSessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);

  // Transcription
  const [transcriptionResult, setTranscriptionResult] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Official Zenieverse / DocuMind Links
  const REPO_URL = "https://huggingface.co/Zenieverse/DocuMind-ERNIE4.5-Document-Reasoning";
  const GITHUB_URL = "https://github.com/Zenieverse/DocuMind";
  const PROFILE_URL = "https://huggingface.co/Zenieverse";

  // Initial setup check for API key
  useEffect(() => {
    const checkKey = async () => {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      setIsKeySetup(hasKey);
    };
    checkKey();
  }, []);

  const resetOutputs = () => {
    setState(prev => ({ ...prev, result: null, error: null, step: ProcessingStep.IDLE }));
    setCreativeOutput(null);
    setTranscriptionResult('');
    setChatHistory([]);
    setHfResults(null);
  };

  const handleModeChange = (newMode: AppMode) => {
    setMode(newMode);
    resetOutputs();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setState(prev => ({ ...prev, file, previewUrl: url }));
      resetOutputs();
    }
  };

  const ensureApiKey = async () => {
    const hasKey = await (window as any).aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await (window as any).aistudio.openSelectKey();
      setIsKeySetup(true);
    }
  };

  const runIntelligencePipeline = async () => {
    if (!state.file) return;
    setState(prev => ({ ...prev, step: ProcessingStep.OCR_EXTRACTING }));
    try {
      const reader = new FileReader();
      reader.readAsDataURL(state.file);
      reader.onload = async () => {
        const base64 = reader.result?.toString().split(',')[1] || '';
        
        setTimeout(() => setState(prev => ({ ...prev, step: ProcessingStep.SEMANTIC_ANALYSIS })), 1200);
        setTimeout(() => setState(prev => ({ ...prev, step: ProcessingStep.MULTIMODAL_REASONING })), 2800);

        const { data, grounding } = await gemini.processMultimodalIntel(
          base64, state.file!.type, intelIntent, 
          { useSearch: searchEnabled, useMaps: mapsEnabled, useThinking: thinkingEnabled }
        );
        
        setState(prev => ({ 
          ...prev, 
          result: { ...data, groundingUrls: grounding }, 
          step: ProcessingStep.COMPLETED 
        }));
        setActiveResultTab('sections');
      };
    } catch (err: any) {
      setState(prev => ({ ...prev, step: ProcessingStep.FAILED, error: err.message }));
    }
  };

  const exploreHf = async () => {
    setState(prev => ({ ...prev, step: ProcessingStep.PROCESSING }));
    try {
      const { data, grounding } = await gemini.exploreHuggingFace(hfQuery);
      setHfResults({ ...data, groundingUrls: grounding });
      setState(prev => ({ ...prev, step: ProcessingStep.COMPLETED }));
    } catch (err: any) {
      setState(prev => ({ ...prev, step: ProcessingStep.FAILED, error: err.message }));
    }
  };

  const handleCreativeAction = async (task: 'PRO_GEN' | 'FLASH_EDIT' | 'VEO_VIDEO') => {
    setState(prev => ({ ...prev, step: ProcessingStep.PROCESSING }));
    try {
      let output = '';
      if (task === 'PRO_GEN') {
        await ensureApiKey();
        output = await gemini.generateImagePro(creativePrompt, aspectRatio, imageSize);
      } else if (task === 'FLASH_EDIT' && state.file) {
        const reader = new FileReader();
        reader.readAsDataURL(state.file);
        reader.onload = async () => {
          const b64 = reader.result?.toString().split(',')[1] || '';
          const result = await gemini.editImageFlash(b64, state.file!.type, creativePrompt);
          setCreativeOutput(result);
          setState(prev => ({ ...prev, step: ProcessingStep.COMPLETED }));
        };
        return;
      } else if (task === 'VEO_VIDEO') {
        await ensureApiKey();
        const b64 = state.file ? await new Promise<string>((r) => {
          const rd = new FileReader(); rd.onload = () => r(rd.result?.toString().split(',')[1] || ''); rd.readAsDataURL(state.file!);
        }) : undefined;
        output = await gemini.generateVideoVeo(creativePrompt, b64, state.file?.type, aspectRatio as any);
      }
      setCreativeOutput(output);
      setState(prev => ({ ...prev, step: ProcessingStep.COMPLETED }));
    } catch (err: any) {
      if (err.message?.includes("Requested entity was not found")) {
        await (window as any).aistudio.openSelectKey();
      }
      setState(prev => ({ ...prev, step: ProcessingStep.FAILED, error: err.message }));
    }
  };

  const handleAudioProcessing = async () => {
    if (!state.file) return;
    setState(prev => ({ ...prev, step: ProcessingStep.PROCESSING }));
    try {
      const reader = new FileReader();
      reader.readAsDataURL(state.file);
      reader.onload = async () => {
        const b64 = reader.result?.toString().split(',')[1] || '';
        const text = await gemini.transcribeAudio(b64, state.file!.type);
        setTranscriptionResult(text);
        setState(prev => ({ ...prev, step: ProcessingStep.COMPLETED }));
      };
    } catch (err: any) {
      setState(prev => ({ ...prev, step: ProcessingStep.FAILED, error: err.message }));
    }
  };

  const handleChatMessaging = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: msg }]);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const modelName = isLiteMode ? 'gemini-3-flash-preview' : 'gemini-3-pro-preview';
      const config: any = {};
      if (thinkingEnabled && !isLiteMode) {
        config.thinkingConfig = { thinkingBudget: 32768 };
      }
      
      const response = await ai.models.generateContent({
        model: modelName,
        contents: msg,
        config
      });
      setChatHistory(prev => [...prev, { role: 'ai', text: response.text || '...' }]);
    } catch (err: any) {
      setChatHistory(prev => [...prev, { role: 'ai', text: `ERROR: ${err.message}` }]);
    }
  };

  const toggleLiveVoiceInterface = async () => {
    if (isLiveActive) {
      liveSessionRef.current?.close();
      setIsLiveActive(false);
      return;
    }

    try {
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (ev) => {
              const inputData = ev.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              sessionPromise.then(s => s.sendRealtimeInput({ media: { data: gemini.encodeAudio(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
            setIsLiveActive(true);
          },
          onmessage: async (msg) => {
            const b64 = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (b64) {
              const ctx = audioContextRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await gemini.decodeAudioData(gemini.decodeBase64Audio(b64), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
            }
          },
          onclose: () => setIsLiveActive(false),
          onerror: (e) => console.error('LIVE_PROTOCOL_FAULT:', e)
        },
        config: { 
          responseModalities: [Modality.AUDIO], 
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } } 
        }
      });
      liveSessionRef.current = await sessionPromise;
    } catch (e) {
      console.error('LIVE_START_FAILED:', e);
    }
  };

  const handleTTSNarration = async (text: string) => {
    try {
      const b64Audio = await gemini.generateTTS(text);
      if (b64Audio) {
        if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const buffer = await gemini.decodeAudioData(gemini.decodeBase64Audio(b64Audio), audioContextRef.current, 24000, 1);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        source.start();
      }
    } catch (e) {
      console.error('TTS_FAILED', e);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#020617] text-slate-200">
      <header className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-900/40 group hover:rotate-12 transition-transform cursor-pointer">
              <svg className="text-white h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white leading-none">DocuMind AI</h1>
              <p className="text-[10px] text-slate-500 font-mono mt-1 uppercase tracking-[0.2em]">ERNIE 4.5 Powered Suite</p>
            </div>
          </div>
          
          <nav className="hidden lg:flex bg-slate-900/50 p-1.5 rounded-xl border border-slate-800">
            {(['DOC_INTEL', 'CREATIVE', 'HUGGING_FACE', 'CHAT', 'TRANSCRIPTION'] as AppMode[]).map(m => (
              <button 
                key={m}
                onClick={() => handleModeChange(m)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all ${mode === m ? 'bg-cyan-500 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {m.replace('_', ' ')}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
             <a 
              href={REPO_URL} 
              target="_blank" 
              className="px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-[9px] font-bold text-yellow-500 hover:bg-yellow-500 hover:text-white transition-all uppercase tracking-widest"
             >
               HF REPO
             </a>
             {!isKeySetup && (
                <button 
                  onClick={ensureApiKey}
                  className="px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-[9px] font-bold text-cyan-500 hover:bg-cyan-500 hover:text-white transition-all"
                >
                  KEY
                </button>
             )}
             <button onClick={() => handleTTSNarration("Zenieverse protocols fully active. ERNIE reasoning online.")} className="h-9 w-9 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700 text-slate-400 hover:text-white transition-all shadow-lg">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
             </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-12 gap-6 overflow-hidden">
        {/* Workspace Controls Sidebar */}
        <aside className="col-span-12 lg:col-span-3 flex flex-col gap-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-6 shadow-xl backdrop-blur-sm">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Workspace Terminal</h3>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="group border-2 border-dashed border-slate-800 rounded-2xl p-6 flex flex-col items-center gap-4 cursor-pointer hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all"
            >
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
              <div className="h-12 w-12 bg-slate-950 rounded-2xl flex items-center justify-center text-slate-600 group-hover:text-cyan-400 transition-all">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Input Media</p>
                <p className="text-[10px] text-slate-600 mt-1 uppercase font-mono">Zenieverse Protocol Ready</p>
              </div>
            </div>

            {mode === 'DOC_INTEL' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pipeline Intent</label>
                  <textarea value={intelIntent} onChange={e => setIntelIntent(e.target.value)} className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs outline-none focus:border-cyan-500/50 transition-all resize-none font-mono" />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <button onClick={() => setThinkingEnabled(!thinkingEnabled)} className={`w-full py-2.5 rounded-lg border text-[10px] font-black tracking-widest transition-all ${thinkingEnabled ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-lg' : 'border-slate-800 text-slate-600'}`}>DEEP THINKING</button>
                  <button onClick={() => setSearchEnabled(!searchEnabled)} className={`w-full py-2.5 rounded-lg border text-[10px] font-black tracking-widest transition-all ${searchEnabled ? 'bg-blue-500/10 border-blue-500 text-blue-400 shadow-lg' : 'border-slate-800 text-slate-600'}`}>WEB SEARCH</button>
                  <button onClick={() => setMapsEnabled(!mapsEnabled)} className={`w-full py-2.5 rounded-lg border text-[10px] font-black tracking-widest transition-all ${mapsEnabled ? 'bg-green-500/10 border-green-500 text-green-400 shadow-lg' : 'border-slate-800 text-slate-600'}`}>MAPS INTEL</button>
                </div>
                <button onClick={runIntelligencePipeline} disabled={!state.file} className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-white py-3.5 rounded-xl font-black text-[10px] tracking-widest shadow-xl shadow-cyan-900/20 transition-all">EXECUTE PIPELINE</button>
              </div>
            )}

            {mode === 'HUGGING_FACE' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">HF Resource Query</label>
                  <input value={hfQuery} onChange={e => setHfQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && exploreHf()} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs outline-none focus:border-cyan-500/50 transition-all font-mono" placeholder="Search Zenieverse..." />
                </div>
                <button onClick={exploreHf} className="w-full bg-yellow-600 hover:bg-yellow-500 text-white py-3.5 rounded-xl font-black text-[10px] tracking-widest shadow-xl shadow-yellow-900/20 transition-all uppercase">Analyze Hub</button>
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-[9px] text-slate-500 text-center leading-relaxed font-mono">
                  Deep integration with Zenieverse ERNIE protocols. Grounded via multimodal synthesis.
                </div>
              </div>
            )}

            {mode === 'CREATIVE' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Generative Script</label>
                  <textarea value={creativePrompt} onChange={e => setCreativePrompt(e.target.value)} className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs outline-none focus:border-cyan-500/50 transition-all resize-none font-mono" placeholder="Style, content, or modulate prompt..." />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-[10px] outline-none text-slate-400 font-bold uppercase">
                    <option>1:1</option><option>3:4</option><option>4:3</option><option>9:16</option><option>16:9</option><option>21:9</option>
                  </select>
                  <select value={imageSize} onChange={e => setImageSize(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-[10px] outline-none text-slate-400 font-bold uppercase">
                    <option>1K</option><option>2K</option><option>4K</option>
                  </select>
                </div>
                <div className="space-y-2 pt-2">
                   <button onClick={() => handleCreativeAction('PRO_GEN')} className="w-full bg-indigo-600/10 border border-indigo-500 text-indigo-400 py-3 rounded-xl text-[10px] font-black tracking-widest hover:bg-indigo-600 hover:text-white transition-all">GENERATE PRO IMAGE</button>
                   <button onClick={() => handleCreativeAction('FLASH_EDIT')} disabled={!state.file} className="w-full bg-cyan-600/10 border border-cyan-500 text-cyan-400 py-3 rounded-xl text-[10px] font-black tracking-widest hover:bg-cyan-600 hover:text-white transition-all disabled:opacity-20">EDIT FLASH IMAGE</button>
                   <button onClick={() => handleCreativeAction('VEO_VIDEO')} className="w-full bg-purple-600/10 border border-purple-500 text-purple-400 py-3 rounded-xl text-[10px] font-black tracking-widest hover:bg-purple-600 hover:text-white transition-all">ANIMATE WITH VEO</button>
                </div>
              </div>
            )}

            {mode === 'CHAT' && (
              <div className="space-y-4">
                 <button 
                  onClick={toggleLiveVoiceInterface}
                  className={`w-full h-28 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all border-2 shadow-2xl ${isLiveActive ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-cyan-500/10 border-cyan-500 text-cyan-500'}`}
                 >
                   <div className={`h-4 w-4 rounded-full ${isLiveActive ? 'bg-red-500 animate-ping' : 'bg-cyan-500'}`} />
                   <span className="text-[10px] font-black tracking-[0.2em]">{isLiveActive ? 'KILL SESSION' : 'INIT LIVE VOICE'}</span>
                 </button>
              </div>
            )}

            {mode === 'TRANSCRIPTION' && (
              <div className="space-y-4">
                <button 
                  onClick={handleAudioProcessing} 
                  disabled={!state.file}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-white py-3.5 rounded-xl font-black text-[10px] tracking-widest transition-all"
                >
                  TRANSCRIBE AUDIO
                </button>
              </div>
            )}
            
            {(state.step !== ProcessingStep.IDLE && state.step !== ProcessingStep.COMPLETED) && (
              <ProcessingIndicator currentStep={state.step} />
            )}
          </div>
        </aside>

        {/* Main Interface Content Area */}
        <section className="col-span-12 lg:col-span-9 flex flex-col gap-6 overflow-hidden">
          {/* Top Viewer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[400px]">
             {/* Workspace Viewer */}
             <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl relative">
               <div className="px-5 py-3 bg-slate-800/40 border-b border-slate-800 flex justify-between items-center z-10">
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Asset Buffer</span>
                 {state.file && <span className="text-[10px] text-cyan-500 font-mono truncate max-w-[150px]">{state.file.name.toUpperCase()}</span>}
               </div>
               <div className="flex-1 bg-slate-950 flex items-center justify-center p-8 relative">
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.02),transparent_70%)]" />
                 {state.previewUrl ? (
                   <img src={state.previewUrl} className="max-w-full max-h-full rounded-xl shadow-2xl border border-slate-800" alt="Input Preview" />
                 ) : (
                   <div className="text-slate-800 flex flex-col items-center gap-4 opacity-20">
                     <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                     <p className="text-[10px] font-black tracking-[0.4em] uppercase">Pending Media</p>
                   </div>
                 )}
               </div>
             </div>

             {/* Synthesis / Result Viewer */}
             <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl relative">
                <div className="px-5 py-3 bg-slate-800/40 border-b border-slate-800 flex justify-between items-center z-10">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Synthesis Output</span>
                  <div className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-[8px] font-black text-cyan-400 tracking-tighter uppercase">Protocol Ready</div>
                </div>
                <div className="flex-1 bg-slate-950 p-6 overflow-auto relative">
                   {creativeOutput ? (
                     <div className="h-full flex flex-col items-center justify-center gap-6 animate-in fade-in zoom-in duration-500">
                       {creativeOutput.includes('video') ? (
                         <video src={creativeOutput} controls className="max-w-full max-h-[85%] rounded-2xl shadow-2xl border border-slate-800" />
                       ) : (
                         <img src={creativeOutput} className="max-w-full max-h-[85%] rounded-2xl shadow-2xl border border-slate-800" alt="Generated Output" />
                       )}
                       <div className="flex gap-4">
                         <button onClick={() => handleTTSNarration("Creative generation protocol complete.")} className="px-5 py-2.5 bg-slate-900 rounded-xl text-[10px] font-black text-slate-400 hover:text-white border border-slate-800 transition-all uppercase tracking-widest">Narrate</button>
                         <a href={creativeOutput} download="documind_export" className="px-5 py-2.5 bg-cyan-600 rounded-xl text-[10px] font-black text-white hover:bg-cyan-500 transition-all uppercase tracking-widest">Export</a>
                       </div>
                     </div>
                   ) : transcriptionResult ? (
                     <div className="h-full flex flex-col animate-in fade-in slide-in-from-top-2 duration-500">
                       <h4 className="text-[10px] font-black text-slate-600 uppercase mb-4 tracking-[0.2em]">Transcribed Buffer</h4>
                       <div className="flex-1 bg-slate-900/40 rounded-2xl p-6 border border-slate-800 text-sm text-slate-300 leading-relaxed font-mono selection:bg-cyan-500/40">
                         {transcriptionResult}
                       </div>
                     </div>
                   ) : mode === 'HUGGING_FACE' && hfResults ? (
                     <div className="h-full flex flex-col animate-in fade-in duration-500 space-y-6">
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-inner relative group">
                          <h4 className="text-[10px] font-black text-yellow-600 uppercase mb-4 tracking-[0.2em]">HF Analysis Result</h4>
                          <p className="text-sm text-slate-300 leading-relaxed font-medium">{hfResults.explanation}</p>
                        </div>
                        <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Retrieved Grounds</h4>
                          <div className="grid grid-cols-1 gap-3">
                             {hfResults.groundingUrls?.map((g: any, i: number) => (
                               <a key={i} href={g.web?.uri} target="_blank" className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex items-center gap-4 hover:border-yellow-500/50 transition-all group shadow-md">
                                 <div className="h-10 w-10 bg-slate-950 rounded-xl flex items-center justify-center text-slate-600 group-hover:text-yellow-400 transition-colors shadow-lg">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                                 </div>
                                 <div className="flex-1 min-w-0">
                                   <span className="text-[10px] font-bold text-slate-400 truncate block group-hover:text-slate-200 uppercase tracking-widest">{g.web?.title || 'Resource Link'}</span>
                                   <span className="text-[9px] text-slate-600 truncate block font-mono mt-1 opacity-60">{g.web?.uri}</span>
                                 </div>
                               </a>
                             ))}
                          </div>
                        </div>
                     </div>
                   ) : mode === 'CHAT' ? (
                     <div className="h-full flex flex-col animate-in fade-in duration-500">
                        <div className="flex-1 space-y-4 overflow-auto pb-4 scrollbar-none">
                          {chatHistory.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center gap-4 opacity-10">
                              <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                              <p className="text-[10px] font-black uppercase tracking-[0.4em]">Intelligence terminal</p>
                            </div>
                          )}
                          {chatHistory.map((c, i) => (
                            <div key={i} className={`flex ${c.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-1 duration-300`}>
                              <div className={`max-w-[85%] p-4 rounded-2xl text-xs leading-relaxed ${c.role === 'user' ? 'bg-cyan-600 text-white shadow-xl shadow-cyan-900/20' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
                                {c.text}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="pt-4 border-t border-slate-800 space-y-3">
                          <div className="flex gap-2">
                             <button onClick={() => setIsLiteMode(!isLiteMode)} className={`px-4 py-1.5 rounded-lg border text-[8px] font-black tracking-widest transition-all ${isLiteMode ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500 shadow-lg shadow-yellow-950/20' : 'border-slate-800 text-slate-600'}`}>LITE CORE</button>
                             <button onClick={() => setThinkingEnabled(!thinkingEnabled)} className={`px-4 py-1.5 rounded-lg border text-[8px] font-black tracking-widest transition-all ${thinkingEnabled ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-lg shadow-cyan-950/20' : 'border-slate-800 text-slate-600'}`}>PRO REASONING</button>
                          </div>
                          <div className="flex gap-2">
                            <input 
                              value={chatInput} 
                              onChange={e => setChatInput(e.target.value)} 
                              onKeyDown={e => e.key === 'Enter' && handleChatMessaging()}
                              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-cyan-500 transition-all font-mono placeholder:text-slate-700" 
                              placeholder="Direct model query..." 
                            />
                            <button onClick={handleChatMessaging} className="bg-cyan-600 text-white px-4 rounded-xl shadow-xl shadow-cyan-900/30 hover:bg-cyan-500 transition-all active:scale-[0.95]">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                            </button>
                          </div>
                        </div>
                     </div>
                   ) : state.result ? (
                     <div className="space-y-6 animate-in fade-in duration-700">
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-inner relative group">
                          <button onClick={() => handleTTSNarration(state.result!.explanation)} className="absolute top-4 right-4 text-slate-600 hover:text-cyan-400 transition-colors">
                             <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                          </button>
                          <h4 className="text-[10px] font-black text-slate-600 uppercase mb-4 tracking-[0.2em]">Semantic Reasoning</h4>
                          <p className="text-sm text-slate-300 leading-relaxed font-medium">{state.result.explanation}</p>
                        </div>
                     </div>
                   ) : (
                     <div className="h-full flex flex-col items-center justify-center text-slate-800 gap-5 opacity-40">
                       <div className="h-10 w-10 border-2 border-slate-900 border-t-cyan-600 rounded-full animate-spin" />
                       <p className="text-[10px] font-black tracking-[0.4em] uppercase italic">Reasoning Pending</p>
                     </div>
                   )}
                </div>
             </div>
          </div>

          {/* Bottom Pane: Zenieverse Explorer */}
          <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl relative">
             <div className="flex border-b border-slate-800 bg-slate-800/40 overflow-x-auto scrollbar-none">
                {mode === 'HUGGING_FACE' ? (
                  <button className="px-10 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 border-yellow-500 text-yellow-400 bg-slate-950/50 shadow-inner">
                    ZENIEVERSE EXPLORER
                  </button>
                ) : (
                  ['sections', 'markdown', 'json', 'web'].map(tab => (
                    <button key={tab} onClick={() => setActiveResultTab(tab)} className={`px-10 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 ${activeResultTab === tab ? 'border-cyan-500 text-cyan-400 bg-slate-950/50 shadow-inner' : 'border-transparent text-slate-600 hover:text-slate-300'}`}>
                      {tab}
                    </button>
                  ))
                )}
             </div>
             
             <div className="flex-1 overflow-auto p-8 bg-slate-950/40 relative">
                {mode === 'HUGGING_FACE' ? (
                  <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-700 h-full">
                    {!hfResults && (
                      <div className="bg-gradient-to-br from-yellow-500/10 to-transparent border border-yellow-500/20 rounded-3xl p-10 flex flex-col items-center text-center gap-6 shadow-2xl">
                        <div className="h-16 w-16 bg-slate-900 rounded-3xl flex items-center justify-center text-yellow-500 border border-yellow-500/30 shadow-yellow-900/40 shadow-2xl">
                           <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                        </div>
                        <div className="flex flex-col gap-2 items-center">
                          <div className="flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full">
                             <div className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
                             <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest">Zenieverse Verified Core</span>
                          </div>
                          <h4 className="text-sm font-black text-white uppercase tracking-widest mb-2 mt-2">DocuMind-ERNIE 4.5 Repository</h4>
                          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                            Deploy high-performance document reasoning protocols directly from the Zenieverse source. Powered by ERNIE 4.5 and ERNIE 5 multimodal foundations.
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4">
                          <a 
                            href={REPO_URL} 
                            target="_blank" 
                            className="px-8 py-3 bg-yellow-600 hover:bg-yellow-500 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-yellow-900/40 flex items-center gap-3 group"
                          >
                            <span>Model Repo</span>
                            <svg className="h-4 w-4 text-white/50 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          </a>
                          <a 
                            href={GITHUB_URL} 
                            target="_blank" 
                            className="px-8 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl flex items-center gap-3 group"
                          >
                            <span>GitHub Source</span>
                            <svg className="h-4 w-4 text-slate-600 group-hover:text-slate-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                          </a>
                        </div>
                      </div>
                    )}
                    {hfResults && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {hfResults.items?.map((item, idx) => (
                          <div key={idx} className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4 hover:border-yellow-600/50 hover:bg-slate-900 transition-all group shadow-lg relative overflow-hidden">
                            <h4 className="text-sm font-black text-slate-100 uppercase tracking-tight truncate">{item.name}</h4>
                            <p className="text-[11px] text-slate-400 leading-relaxed font-medium line-clamp-2">{item.description}</p>
                            <a href={item.url.startsWith('http') ? item.url : `https://${item.url}`} target="_blank" className="block text-center py-2 mt-4 bg-slate-950 border border-slate-800 rounded-xl text-[10px] font-black text-slate-500 hover:text-white transition-all uppercase tracking-widest">
                              View on HF
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : state.result ? (
                   <div className="animate-in slide-in-from-bottom-2 duration-700 h-full">
                     {activeResultTab === 'sections' && (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
                         {state.result.sections.map((s, idx) => (
                           <div key={idx} className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4">
                             <h4 className="text-xs font-black text-cyan-400 uppercase">{s.title}</h4>
                             <p className="text-[11px] text-slate-400 leading-relaxed font-medium">{s.content}</p>
                           </div>
                         ))}
                       </div>
                     )}
                     {activeResultTab === 'markdown' && (
                       <div className="bg-slate-950/80 rounded-2xl p-8 border border-slate-800 min-h-full">
                          <pre className="text-xs font-mono text-slate-500 whitespace-pre-wrap leading-loose">{state.result.markdown}</pre>
                       </div>
                     )}
                   </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-5 gap-8">
                    <svg className="h-24 w-24 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    <p className="text-[12px] font-black uppercase tracking-[0.4em] text-center max-w-sm leading-relaxed">Synthesis matrix awaiting Zenieverse stream</p>
                  </div>
                )}
             </div>
          </div>
        </section>
      </main>

      <footer className="h-10 border-t border-slate-800 bg-slate-950 px-8 flex items-center justify-between text-[9px] font-mono text-slate-600 tracking-widest uppercase font-black">
         <div className="flex items-center gap-8">
           <div className="flex items-center gap-2.5">
             <div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" /> 
             <span>Protocol: Status Ready</span>
           </div>
         </div>
         <div className="hidden lg:flex gap-8 items-center opacity-40">
           <span className="tracking-widest">DocuMind AI Powered by ERNIE © 2025</span>
         </div>
      </footer>
    </div>
  );
};

export default App;
