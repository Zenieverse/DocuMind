
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
  
  // Tab/Global Settings
  const [activeTab, setActiveTab] = useState('sections');
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  
  // Doc/Media Intel Settings
  const [intent, setIntent] = useState('Extract structured insights and detect risks.');
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [mapsEnabled, setMapsEnabled] = useState(false);

  // Creative Suite States
  const [creativePrompt, setCreativePrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageSize, setImageSize] = useState('1K');
  const [creativeOutput, setCreativeOutput] = useState<string | null>(null);

  // Chat / Conversations
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [chatModelType, setChatModelType] = useState<'PRO' | 'LITE'>('PRO');

  // Live Voice Session
  const [isLiveActive, setIsLiveActive] = useState(false);
  const liveSessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);

  // Transcription
  const [transcript, setTranscript] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetOutputs = () => {
    setState(prev => ({ ...prev, result: null, error: null, step: ProcessingStep.IDLE }));
    setCreativeOutput(null);
    setTranscript('');
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
    }
  };

  const runMultimodalAnalysis = async () => {
    if (!state.file) return;
    setState(prev => ({ ...prev, step: ProcessingStep.OCR_EXTRACTING }));
    try {
      const reader = new FileReader();
      reader.readAsDataURL(state.file);
      reader.onload = async () => {
        const base64 = reader.result?.toString().split(',')[1] || '';
        
        // Progress simulation for pipeline visualization
        setTimeout(() => setState(prev => ({ ...prev, step: ProcessingStep.SEMANTIC_ANALYSIS })), 1200);
        setTimeout(() => setState(prev => ({ ...prev, step: ProcessingStep.MULTIMODAL_REASONING })), 2800);

        const { data, grounding } = await gemini.processMultimodalIntel(
          base64, state.file!.type, intent, 
          { useSearch: searchEnabled, useMaps: mapsEnabled, useThinking: thinkingEnabled }
        );
        
        setState(prev => ({ 
          ...prev, 
          result: { ...data, groundingUrls: grounding }, 
          step: ProcessingStep.COMPLETED 
        }));
        setActiveTab('sections');
      };
    } catch (err: any) {
      setState(prev => ({ ...prev, step: ProcessingStep.FAILED, error: err.message }));
    }
  };

  const executeCreativeTask = async (task: 'PRO_GEN' | 'FLASH_EDIT' | 'VEO_VIDEO') => {
    setState(prev => ({ ...prev, step: ProcessingStep.PROCESSING }));
    try {
      if (task === 'PRO_GEN') {
        await ensureApiKey();
        const result = await gemini.generateImagePro(creativePrompt, aspectRatio, imageSize);
        setCreativeOutput(result);
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
        const result = await gemini.generateVideoVeo(creativePrompt, b64, state.file?.type, aspectRatio as any);
        setCreativeOutput(result);
      }
      setState(prev => ({ ...prev, step: ProcessingStep.COMPLETED }));
    } catch (err: any) {
      if (err.message?.includes("Requested entity was not found")) await (window as any).aistudio.openSelectKey();
      setState(prev => ({ ...prev, step: ProcessingStep.FAILED, error: err.message }));
    }
  };

  const handleAudioTranscription = async () => {
    if (!state.file) return;
    setState(prev => ({ ...prev, step: ProcessingStep.PROCESSING }));
    try {
      const reader = new FileReader();
      reader.readAsDataURL(state.file);
      reader.onload = async () => {
        const b64 = reader.result?.toString().split(',')[1] || '';
        const text = await gemini.transcribeAudio(b64, state.file!.type);
        setTranscript(text);
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
      const modelName = chatModelType === 'LITE' ? 'gemini-flash-lite-latest' : 'gemini-3-pro-preview';
      const config: any = {};
      if (thinkingEnabled && chatModelType === 'PRO') {
        config.thinkingConfig = { thinkingBudget: 32768 };
      }
      
      const response = await ai.models.generateContent({
        model: modelName,
        contents: msg,
        config
      });
      setChatHistory(prev => [...prev, { role: 'ai', text: response.text || 'Synthesis incomplete.' }]);
    } catch (err: any) {
      setChatHistory(prev => [...prev, { role: 'ai', text: `PROTOCOL ERROR: ${err.message}` }]);
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
              sessionPromise.then(s => s.sendRealtimeInput({ 
                media: { data: gemini.encodeAudio(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } 
              }));
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
      console.error('LIVE_INIT_FAILED:', e);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-200">
      <header className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-900/40 group hover:rotate-12 transition-transform">
              <svg className="text-white h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white leading-none">DocuMind AI</h1>
              <p className="text-[10px] text-slate-500 font-mono mt-1 uppercase tracking-widest">Enterprise Multimodal Suite</p>
            </div>
          </div>
          
          <nav className="hidden lg:flex bg-slate-900/40 p-1.5 rounded-xl border border-slate-800">
            {(['DOC_INTEL', 'CREATIVE', 'LIVE_VOICE', 'CHAT', 'TRANSCRIPTION'] as AppMode[]).map(m => (
              <button 
                key={m}
                onClick={() => { setMode(m); resetOutputs(); }}
                className={`px-4 py-2 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all ${mode === m ? 'bg-cyan-500 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'}`}
              >
                {m.replace('_', ' ')}
              </button>
            ))}
          </nav>

          <button 
            onClick={() => gemini.generateTTS("DocuMind AI protocol online. Awaiting directive.")}
            className="h-10 w-10 bg-slate-900 border border-slate-700 rounded-full flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white transition-all shadow-lg active:scale-95"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-12 gap-8 overflow-hidden">
        {/* Left Sidebar Control Panel */}
        <aside className="col-span-12 lg:col-span-3 flex flex-col gap-8">
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-8 shadow-2xl backdrop-blur-sm">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 border-b border-slate-800 pb-4">Control Terminal</h3>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="group border-2 border-dashed border-slate-800 rounded-2xl p-8 flex flex-col items-center gap-4 cursor-pointer hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all active:scale-[0.98]"
            >
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
              <div className="h-14 w-14 bg-slate-950 rounded-2xl flex items-center justify-center text-slate-600 group-hover:text-cyan-400 group-hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] transition-all">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-slate-300">Multimodal Input</p>
                <p className="text-[10px] text-slate-600 mt-2 uppercase tracking-tighter">PDF / IMG / VID / AUD</p>
              </div>
            </div>

            {mode === 'DOC_INTEL' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Analysis Prompt</label>
                  <textarea value={intent} onChange={e => setIntent(e.target.value)} className="w-full h-28 bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs outline-none focus:border-cyan-500/50 transition-all resize-none font-mono" />
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <button onClick={() => setThinkingEnabled(!thinkingEnabled)} className={`w-full py-3 rounded-xl border text-[10px] font-black tracking-widest transition-all ${thinkingEnabled ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'border-slate-800 text-slate-600 hover:text-slate-400'}`}>DEEP REASONING</button>
                  <button onClick={() => setSearchEnabled(!searchEnabled)} className={`w-full py-3 rounded-xl border text-[10px] font-black tracking-widest transition-all ${searchEnabled ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'border-slate-800 text-slate-600 hover:text-slate-400'}`}>WEB GROUNDING</button>
                  <button onClick={() => setMapsEnabled(!mapsEnabled)} className={`w-full py-3 rounded-xl border text-[10px] font-black tracking-widest transition-all ${mapsEnabled ? 'bg-green-500/10 border-green-500 text-green-400' : 'border-slate-800 text-slate-600 hover:text-slate-400'}`}>GEOSPATIAL INTEL</button>
                </div>
                <button onClick={runMultimodalAnalysis} disabled={!state.file} className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-700 text-white py-4 rounded-2xl font-black text-[10px] tracking-widest shadow-2xl shadow-cyan-900/30 transition-all">EXECUTE PIPELINE</button>
                {state.step !== ProcessingStep.IDLE && state.step !== ProcessingStep.COMPLETED && (
                  <ProcessingIndicator currentStep={state.step} />
                )}
              </div>
            )}

            {mode === 'CREATIVE' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Generative Script</label>
                  <textarea value={creativePrompt} onChange={e => setCreativePrompt(e.target.value)} className="w-full h-28 bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs outline-none focus:border-cyan-500/50 transition-all resize-none font-mono" placeholder="Scene settings, lighting, edits..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] outline-none text-slate-400 font-bold uppercase">
                    <option>1:1</option><option>3:4</option><option>4:3</option><option>9:16</option><option>16:9</option><option>21:9</option><option>2:3</option><option>3:2</option>
                  </select>
                  <select value={imageSize} onChange={e => setImageSize(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] outline-none text-slate-400 font-bold uppercase">
                    <option>1K</option><option>2K</option><option>4K</option>
                  </select>
                </div>
                <div className="space-y-3">
                   <button onClick={() => executeCreativeTask('PRO_GEN')} className="w-full bg-indigo-600/10 border border-indigo-500 text-indigo-400 py-3 rounded-xl text-[10px] font-black hover:bg-indigo-600 hover:text-white transition-all">GENERATE PRO IMAGE</button>
                   <button onClick={() => executeCreativeTask('FLASH_EDIT')} disabled={!state.file} className="w-full bg-cyan-600/10 border border-cyan-500 text-cyan-400 py-3 rounded-xl text-[10px] font-black hover:bg-cyan-600 hover:text-white disabled:opacity-20 transition-all">EDIT FLASH IMAGE</button>
                   <button onClick={() => executeCreativeTask('VEO_VIDEO')} className="w-full bg-purple-600/10 border border-purple-500 text-purple-400 py-3 rounded-xl text-[10px] font-black hover:bg-purple-600 hover:text-white transition-all">ANIMATE WITH VEO</button>
                </div>
              </div>
            )}

            {mode === 'LIVE_VOICE' && (
              <div className="flex flex-col gap-6 py-4">
                 <button 
                  onClick={toggleLiveVoiceInterface}
                  className={`w-full h-32 rounded-3xl flex flex-col items-center justify-center gap-4 transition-all border-2 shadow-2xl ${isLiveActive ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-cyan-500/10 border-cyan-500 text-cyan-500'}`}
                 >
                   <div className={`h-4 w-4 rounded-full ${isLiveActive ? 'bg-red-500 animate-ping' : 'bg-cyan-500'}`} />
                   <span className="text-[10px] font-black tracking-[0.3em]">{isLiveActive ? 'KILL SESSION' : 'INIT LIVE VOICE'}</span>
                 </button>
                 <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 text-[9px] text-slate-500 text-center leading-relaxed font-mono">
                   Conversational Low-Latency Engine Active. Real-time audio stream routed via Native Modality.
                 </div>
              </div>
            )}

            {mode === 'TRANSCRIPTION' && (
              <div className="space-y-6">
                <button 
                  onClick={handleAudioTranscription} 
                  disabled={!state.file}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-700 text-white py-4 rounded-2xl font-black text-[10px] tracking-widest transition-all"
                >
                  TRANSCRIBE AUDIO
                </button>
                <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 text-[10px] text-slate-500 text-center uppercase tracking-widest">
                  FLASH LITE ENCODER READY
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main Display Area */}
        <section className="col-span-12 lg:col-span-9 flex flex-col gap-8 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[420px]">
             {/* Workspace View */}
             <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl relative group">
               <div className="px-6 py-4 bg-slate-800/40 border-b border-slate-800 flex justify-between items-center z-10">
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Input Workspace</span>
                 {state.file && <span className="text-[10px] text-cyan-500 font-mono truncate max-w-[160px]">{state.file.name.toUpperCase()}</span>}
               </div>
               <div className="flex-1 bg-slate-950 flex items-center justify-center p-10 relative overflow-hidden">
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.04),transparent_70%)]" />
                 {state.previewUrl ? (
                   <img src={state.previewUrl} className="max-w-full max-h-full rounded-2xl shadow-2xl border border-slate-800 transition-transform duration-500 group-hover:scale-[1.03]" alt="Preview" />
                 ) : (
                   <div className="text-slate-800 flex flex-col items-center gap-5 opacity-40">
                     <svg className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                     <p className="text-[10px] font-black tracking-[0.4em] uppercase">Pending Data Stream</p>
                   </div>
                 )}
               </div>
             </div>

             {/* Output Synthesis View */}
             <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl relative">
                <div className="px-6 py-4 bg-slate-800/40 border-b border-slate-800 flex justify-between items-center z-10">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Synthesis Engine</span>
                  <div className="px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-[8px] font-black text-cyan-400">GEMINI ENGINE OK</div>
                </div>
                <div className="flex-1 bg-slate-950 p-8 overflow-auto relative">
                   {creativeOutput ? (
                     <div className="h-full flex flex-col items-center justify-center gap-8 animate-in fade-in zoom-in duration-500">
                       {creativeOutput.includes('video') ? (
                         <video src={creativeOutput} controls className="max-w-full max-h-[85%] rounded-2xl shadow-2xl border border-slate-800" />
                       ) : (
                         <img src={creativeOutput} className="max-w-full max-h-[85%] rounded-2xl shadow-2xl border border-slate-800" alt="Result" />
                       )}
                       <div className="flex gap-6">
                         <button onClick={() => gemini.generateTTS("Protocol execution successful. Media generated.")} className="px-6 py-3 bg-slate-900 rounded-xl text-[10px] font-bold text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 transition-all">NARRATE RESULT</button>
                         <a href={creativeOutput} download="documind_export" className="px-6 py-3 bg-cyan-600 rounded-xl text-[10px] font-black text-white hover:bg-cyan-500 shadow-xl shadow-cyan-900/40 transition-all">EXPORT ASSET</a>
                       </div>
                     </div>
                   ) : transcript ? (
                     <div className="h-full flex flex-col animate-in fade-in slide-in-from-top-3 duration-500">
                       <h4 className="text-[10px] font-black text-slate-600 uppercase mb-6 tracking-widest">Transcription Data Buffer</h4>
                       <div className="flex-1 bg-slate-900/60 rounded-3xl p-8 border border-slate-800 text-sm text-slate-300 leading-relaxed font-mono selection:bg-cyan-500/40 shadow-inner">
                         {transcript}
                       </div>
                     </div>
                   ) : mode === 'CHAT' ? (
                     <div className="h-full flex flex-col animate-in fade-in duration-500">
                        <div className="flex-1 space-y-5 overflow-auto pb-6 scrollbar-thin scrollbar-thumb-slate-800 pr-2">
                          {chatHistory.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center gap-5 opacity-10">
                              <svg className="h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                              <p className="text-[10px] font-black uppercase tracking-[0.5em]">Direct Intelligence Terminal</p>
                            </div>
                          )}
                          {chatHistory.map((c, i) => (
                            <div key={i} className={`flex ${c.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                              <div className={`max-w-[85%] p-5 rounded-3xl text-xs leading-relaxed ${c.role === 'user' ? 'bg-cyan-600 text-white shadow-2xl shadow-cyan-900/30' : 'bg-slate-800 text-slate-300 border border-slate-700 shadow-xl'}`}>
                                {c.text}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="pt-6 border-t border-slate-800 space-y-4">
                          <div className="flex gap-3">
                             <button onClick={() => setChatModelType(chatModelType === 'LITE' ? 'PRO' : 'LITE')} className={`px-4 py-2 rounded-xl border text-[9px] font-black tracking-widest transition-all ${chatModelType === 'LITE' ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500' : 'border-slate-800 text-slate-600'}`}>LITE ENGINE</button>
                             <button onClick={() => setThinkingEnabled(!thinkingEnabled)} className={`px-4 py-2 rounded-xl border text-[9px] font-black tracking-widest transition-all ${thinkingEnabled ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'border-slate-800 text-slate-600'}`}>DEEP THINKING</button>
                          </div>
                          <div className="flex gap-3">
                            <input 
                              value={chatInput} 
                              onChange={e => setChatInput(e.target.value)} 
                              onKeyDown={e => e.key === 'Enter' && handleChatMessaging()}
                              className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 text-xs outline-none focus:border-cyan-500 transition-all font-mono placeholder:text-slate-700" 
                              placeholder="Query documind network..." 
                            />
                            <button onClick={handleChatMessaging} className="bg-cyan-600 text-white px-6 rounded-2xl shadow-2xl shadow-cyan-900/40 hover:bg-cyan-500 transition-all active:scale-[0.95]">
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                            </button>
                          </div>
                        </div>
                     </div>
                   ) : state.result ? (
                     <div className="space-y-8 animate-in fade-in duration-700">
                        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 shadow-inner">
                          <h4 className="text-[10px] font-black text-slate-600 uppercase mb-5 tracking-[0.3em]">AI Semantic Fuse</h4>
                          <p className="text-sm text-slate-300 leading-relaxed font-medium">{state.result.explanation}</p>
                        </div>
                        {state.result.groundingUrls && state.result.groundingUrls.length > 0 && (
                          <div className="space-y-5">
                            <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Grounding Citations</h4>
                            <div className="grid grid-cols-1 gap-4">
                               {state.result.groundingUrls.map((g: any, i: number) => (
                                 <a key={i} href={g.web?.uri || g.maps?.uri} target="_blank" className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl flex items-center gap-5 hover:border-cyan-500/50 transition-all group hover:bg-slate-800/40 shadow-xl">
                                   <div className="h-12 w-12 bg-slate-950 rounded-2xl flex items-center justify-center text-slate-600 group-hover:text-cyan-400 transition-colors shadow-2xl">
                                      {g.web ? (
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                                      ) : (
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                      )}
                                   </div>
                                   <div className="flex-1 min-w-0">
                                     <span className="text-[10px] font-bold text-slate-400 truncate block group-hover:text-slate-200 tracking-wide uppercase">{g.web?.title || g.maps?.title || 'External Protocol'}</span>
                                     <span className="text-[9px] text-slate-600 truncate block font-mono mt-1">{g.web?.uri || g.maps?.uri}</span>
                                   </div>
                                 </a>
                               ))}
                            </div>
                          </div>
                        )}
                     </div>
                   ) : (
                     <div className="h-full flex flex-col items-center justify-center text-slate-800 gap-6 opacity-40">
                       <div className="h-14 w-14 border-2 border-slate-900 border-t-cyan-500 rounded-full animate-spin" />
                       <p className="text-[10px] font-black tracking-[0.6em] uppercase italic">Engine Initializing</p>
                     </div>
                   )}
                </div>
             </div>
          </div>

          {/* Bottom Pane: Detailed Analysis Tabs */}
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
             <div className="flex border-b border-slate-800 bg-slate-800/50 overflow-x-auto scrollbar-none">
                {['sections', 'markdown', 'json', 'web'].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} className={`px-12 py-5 text-[10px] font-black uppercase tracking-[0.3em] transition-all border-b-2 ${activeTab === tab ? 'border-cyan-500 text-cyan-400 bg-slate-950/50 shadow-inner' : 'border-transparent text-slate-600 hover:text-slate-300'}`}>
                    {tab}
                  </button>
                ))}
             </div>
             
             <div className="flex-1 overflow-auto p-10 bg-slate-950/40 relative">
                {state.result ? (
                  <div className="animate-in slide-in-from-bottom-3 duration-700 h-full">
                     {activeTab === 'sections' && (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-4">
                         {state.result.sections.map((s, idx) => (
                           <div key={idx} className="bg-slate-900/60 border border-slate-800 p-8 rounded-3xl space-y-5 hover:border-slate-600 hover:bg-slate-900/80 transition-all group shadow-2xl relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-30 transition-opacity">
                                <svg className="h-10 w-10 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                             </div>
                             <div className="flex justify-between items-center">
                               <h4 className="text-xs font-black text-cyan-400 uppercase tracking-wider">{s.title}</h4>
                               <div className="px-3 py-1.5 rounded-full border border-slate-800 bg-slate-950 text-[10px] font-black font-mono text-slate-600 shadow-inner">RISK: {(s.riskScore * 100).toFixed(0)}%</div>
                             </div>
                             <p className="text-[12px] text-slate-400 leading-relaxed font-medium group-hover:text-slate-200 transition-colors">{s.content}</p>
                             <div className="flex flex-wrap gap-2.5 pt-4 border-t border-slate-800/60">
                                {s.entities?.map((e: any, ei: number) => (
                                  <span key={ei} className="px-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-xl text-[9px] font-black text-slate-500 uppercase tracking-tighter hover:text-cyan-500 transition-all shadow-md">
                                    {e.value} <span className="opacity-30 font-mono ml-2">[{e.type}]</span>
                                  </span>
                                ))}
                             </div>
                           </div>
                         ))}
                       </div>
                     )}
                     {activeTab === 'markdown' && (
                       <div className="bg-slate-950/90 rounded-3xl p-12 border border-slate-800 min-h-full shadow-2xl selection:bg-cyan-500/40">
                          <pre className="text-xs font-mono text-slate-500 whitespace-pre-wrap leading-relaxed tracking-wide">{state.result.markdown}</pre>
                       </div>
                     )}
                     {activeTab === 'json' && (
                       <div className="bg-slate-950/90 rounded-3xl p-12 border border-slate-800 min-h-full shadow-2xl">
                          <pre className="text-xs font-mono text-cyan-900/70 leading-relaxed">{JSON.stringify(state.result.jsonSchema, null, 2)}</pre>
                       </div>
                     )}
                     {activeTab === 'web' && (
                       <div className="h-full flex flex-col gap-8">
                          <div className="flex justify-between items-center bg-slate-900/80 p-6 rounded-3xl border border-slate-800 shadow-2xl">
                             <div className="flex flex-col">
                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Codebase Synthesis Output</span>
                                <span className="text-[9px] text-slate-600 font-mono mt-1">TAILWIND PROTOCOL READY</span>
                             </div>
                             <div className="flex gap-4">
                               <button className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-[10px] font-black text-slate-400 uppercase transition-all">COPY CODE</button>
                               <button className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-[10px] font-black text-white uppercase tracking-widest transition-all shadow-2xl shadow-cyan-900/40">DEPLOY AGENT</button>
                             </div>
                          </div>
                          <div className="flex-1 bg-white rounded-3xl shadow-[0_60px_100px_rgba(0,0,0,0.8)] border border-slate-800 overflow-hidden group">
                             {state.result.websiteCode ? (
                               <iframe srcDoc={state.result.websiteCode} className="w-full h-full" title="Generated Web Output" />
                             ) : (
                               <div className="h-full flex flex-col items-center justify-center gap-6 bg-slate-950 text-slate-800">
                                  <svg className="h-16 w-16 opacity-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                                  <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-30">No UI component synthesized</p>
                               </div>
                             )}
                          </div>
                       </div>
                     )}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-5 gap-10">
                    <svg className="h-40 w-40 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    <p className="text-[14px] font-black uppercase tracking-[0.8em] text-center max-w-lg leading-loose">Schematic Matrix Awaiting Synthesis Stream</p>
                  </div>
                )}
             </div>
          </div>
        </section>
      </main>

      <footer className="h-12 border-t border-slate-800 bg-slate-950 px-10 flex items-center justify-between text-[10px] font-mono text-slate-600 tracking-tighter uppercase font-black">
         <div className="flex items-center gap-10">
           <div className="flex items-center gap-3">
             <div className={`h-2 w-2 rounded-full ${state.step === ProcessingStep.FAILED ? 'bg-red-500 animate-pulse' : 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.6)]'}`} /> 
             <span>DOCUMIND_PROTOCOL_OK</span>
           </div>
           <div className="hidden md:flex items-center gap-3 font-black text-slate-800">|</div>
           <div className="hidden md:flex items-center gap-3">
             <div className="h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_12px_rgba(34,211,238,0.6)]" /> 
             <span>AES_512_SECURED</span>
           </div>
         </div>
         <div className="hidden lg:flex gap-12 items-center">
           <div className="flex items-center gap-3"><span className="opacity-30">V-CORE:</span> <span className="text-slate-500">92%</span></div>
           <div className="flex items-center gap-3"><span className="opacity-30">P-MEM:</span> <span className="text-slate-500">4.1GB</span></div>
           <div className="flex items-center gap-3"><span className="opacity-30">SYNC:</span> <span className="text-slate-500">18MS</span></div>
           <span className="text-slate-700 opacity-20">|</span>
           <span className="tracking-[0.3em] text-cyan-700/60">SYS_BUILD_V5.5.2_GOLD</span>
         </div>
      </footer>
    </div>
  );
};

export default App;
