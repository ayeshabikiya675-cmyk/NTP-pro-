/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Shield, Search, Image as ImageIcon, Globe, AlertTriangle, CheckCircle, FileText, Send, Loader2, X, RefreshCw, Zap, Camera, Clipboard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { analyzeNews, AnalysisResult } from './services/gemini';

export default function App() {
  const [input, setInput] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [fingerprint, setFingerprint] = useState("HSH: PENDING_INPUT");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateFingerprint = () => {
    const chars = '0123456789ABCDEF';
    let res = 'HSH: ';
    for (let i = 0; i < 8; i++) res += chars[Math.floor(Math.random() * chars.length)];
    setFingerprint(res);
  };

  // Auto-scan when content is provided
  const handleScan = async (text?: string, img?: string | null) => {
    const currentText = text !== undefined ? text : input;
    const currentImg = img !== undefined ? img : image;
    
    if (!currentText && !currentImg) return;
    
    setAnalyzing(true);
    setError(null);
    setResult(null);
    generateFingerprint();
    try {
      const scanResult = await analyzeNews(currentText, currentImg || undefined);
      setResult(scanResult);
    } catch (err: any) {
      setError(err.message || 'Analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        setError("Image size exceeds 4MB limit.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const b64 = reader.result as string;
        setImage(b64);
        handleScan(undefined, b64); // Auto-scan on upload
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const b64 = reader.result as string;
            setImage(b64);
            handleScan(undefined, b64); // Auto-scan on paste
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("Camera access denied or unavailable.");
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setImage(dataUrl);
      stopCamera();
      handleScan(undefined, dataUrl); // Auto-scan on capture
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraActive(false);
  };

  const reset = () => {
    setInput('');
    setImage(null);
    setResult(null);
    setError(null);
    setFingerprint("HSH: PENDING_INPUT");
    if (isCameraActive) stopCamera();
  };

  return (
    <div 
      onPaste={handlePaste}
      className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 overflow-hidden"
    >
      {/* Header */}
      <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-8 shrink-0 shadow-lg z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-lg shadow-[0_0_15px_rgba(37,99,235,0.4)]">N</div>
          <div>
            <h1 className="text-sm font-black tracking-[0.2em] uppercase">NTP PRO</h1>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">News Trace Proof Pro V4.2</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[9px] font-black uppercase text-emerald-400 tracking-wider">Global Network Active</span>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-black text-white uppercase tracking-tight">1.2M Articles Indexed Today</p>
            <p className="text-[8px] text-slate-500 font-bold uppercase mt-0.5">Last sync: 1 min ago</p>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 p-6 grid grid-cols-12 gap-6 overflow-hidden max-w-[1600px] mx-auto w-full">
        
        {/* Left Column: Scanner Module */}
        <section className="col-span-12 lg:col-span-3 flex flex-col gap-6 overflow-y-auto pr-2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-[400px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl flex justify-between items-center">
              <h2 className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Content Scanner</h2>
              <Search className="w-4 h-4 text-slate-400" />
            </div>
            <div className="p-5 flex-1 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Input News Data</label>
                  <span className="text-[9px] text-slate-400 font-mono">TEXT_ANALYSIS_MODALITY</span>
                </div>
                <textarea 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="w-full h-44 p-4 text-sm bg-slate-50 border border-slate-200 rounded-lg resize-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 leading-relaxed shadow-inner" 
                  placeholder="Paste a news headline, article excerpt, or social media claim here for a deep credibility scan..."
                />
              </div>
              
              <div className="flex flex-col gap-2">
                <button 
                  onClick={() => handleScan()}
                  disabled={analyzing || (!input && !image)}
                  className="w-full py-4 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-500/30 active:scale-[0.98] group"
                >
                  {analyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                  <span className="tracking-wide uppercase text-sm">
                    {analyzing ? 'Scanning Intelligence...' : 'Initiate Truth Scan'}
                  </span>
                </button>
                <p className="text-[9px] text-center text-slate-400 uppercase tracking-tighter">AI models may take 5-10s for global cross-referencing</p>
              </div>

              {result && (
                <div className="mt-2 border-t border-slate-100 pt-5 animate-in fade-in slide-in-from-top-2 duration-500">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-widest flex items-center gap-2">
                    <div className="w-1 h-1 bg-slate-400 rounded-full" />
                    Neural Verdict Summary
                  </h3>
                  <div className={`p-5 rounded-xl border-2 flex items-center justify-between shadow-sm relative overflow-hidden ${result.isFake ? 'bg-rose-50 border-rose-200 shadow-rose-100' : 'bg-emerald-50 border-emerald-200 shadow-emerald-100'}`}>
                    {/* Status Pillar Indicator */}
                    <div className={`absolute top-0 left-0 w-1.5 h-full ${result.isFake ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                    
                    <div className="pl-2">
                      <div className="flex items-center gap-2 mb-1">
                        {result.isFake ? (
                          <div className="bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded tracking-widest flex items-center gap-1 uppercase">
                            <AlertTriangle className="w-3 h-3" /> Misleading / Error
                          </div>
                        ) : (
                          <div className="bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded tracking-widest flex items-center gap-1 uppercase">
                            <CheckCircle className="w-3 h-3" /> Verified
                          </div>
                        )}
                        <p className={`text-[10px] font-bold uppercase ${result.isFake ? 'text-rose-700/60' : 'text-emerald-700/60'}`}>
                          {result.verdict}
                        </p>
                      </div>
                      <p className={`text-[10px] font-bold uppercase opacity-60 ${result.isFake ? 'text-rose-600' : 'text-emerald-600'}`}>
                        Integrity Confidence
                      </p>
                    </div>
                    <div className={`text-3xl font-black tabular-nums ${result.isFake ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {result.confidenceScore}<span className="text-sm ml-0.5">%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-[10px] font-bold uppercase text-slate-400 mb-4 tracking-wider">Report Components</h2>
            <div className="flex flex-col gap-2">
              <button className="flex items-center justify-between p-2.5 text-[11px] border border-slate-100 rounded-md hover:bg-slate-50 text-slate-600 transition-colors">
                <span className="flex items-center gap-2"><FileText className="w-3.5 h-3.5" /> Logical Fallacy Log</span>
                <span className={`text-[9px] font-black uppercase ${analyzing ? 'text-blue-500 animate-pulse' : result ? 'text-emerald-500' : 'text-slate-300 italic'}`}>
                  {analyzing ? 'Scanning...' : result ? 'Verified' : 'Ready'}
                </span>
              </button>
              <button className="flex items-center justify-between p-2.5 text-[11px] border border-slate-100 rounded-md hover:bg-slate-50 text-slate-600 transition-colors">
                <span className="flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> Source Cross-Check</span>
                <span className={`text-[9px] font-black uppercase ${analyzing ? 'text-blue-500 animate-pulse' : result ? 'text-emerald-500' : 'text-slate-300 italic'}`}>
                  {analyzing ? 'Syncing...' : result ? 'Crossed' : 'Ready'}
                </span>
              </button>
              <button onClick={reset} className="flex items-center justify-between p-2.5 text-[11px] border border-blue-100 bg-blue-50/30 rounded-md hover:bg-blue-50 text-blue-600 font-bold transition-colors">
                <span>SYSTEM RESET</span>
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* Center Column: Global Monitoring */}
        <section className="col-span-12 lg:col-span-4 flex flex-col gap-4 overflow-hidden px-2">
          <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-2xl grow overflow-hidden flex flex-col relative group">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center z-10 bg-slate-900/80 backdrop-blur-md">
              <h2 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Global Monitoring</h2>
              <div className="bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                 <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest">Active Scanning</span>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center relative bg-slate-900">
              <AnimatePresence mode="wait">
                {analyzing ? (
                  <motion.div 
                    key="analyzing"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center p-12 text-center z-10"
                  >
                    <div className="relative mb-8">
                      <div className="w-32 h-32 border-2 border-blue-500/10 border-t-blue-500 rounded-full animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Globe className="w-10 h-10 text-blue-500 animate-pulse" />
                      </div>
                    </div>
                    <h3 className="text-lg font-black text-white uppercase tracking-widest mb-2">Neural Cross-Ref</h3>
                    <p className="text-[8px] text-blue-400 uppercase tracking-[0.4em] font-black animate-pulse">Syncing with World Data Nodes...</p>
                  </motion.div>
                ) : !result ? (
                  <motion.div 
                    key="awaiting"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center p-8 text-center z-10"
                  >
                    <div className="w-16 h-16 bg-blue-500/5 rounded-full flex items-center justify-center mb-10 group-hover:scale-110 transition-transform duration-700 border border-blue-500/10">
                      <Globe className="w-8 h-8 text-blue-500/30" />
                    </div>
                    <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] mb-6">Awaiting Signal</h3>
                    <div className="space-y-4 max-w-xs transition-opacity duration-500 opacity-60">
                      <div className="flex items-start gap-3 text-left">
                        <div className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-500 text-[10px] font-bold flex items-center justify-center shrink-0">1</div>
                        <p className="text-[10px] text-slate-400 font-medium leading-relaxed">Paste text content on the left or upload a screenshot on the right.</p>
                      </div>
                      <div className="flex items-start gap-3 text-left">
                        <div className="w-5 h-5 rounded-full bg-blue-600/20 text-blue-500 text-[10px] font-bold flex items-center justify-center shrink-0">2</div>
                        <p className="text-[10px] text-slate-400 font-medium leading-relaxed">NTP-PRO will cross-reference global archives and identify logical fallacies.</p>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="results"
                    initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                    className="w-full h-full p-6 overflow-y-auto z-10 scrollbar-thin scrollbar-thumb-slate-800"
                  >
                    {/* Verdict Banner */}
                    <div className={`p-6 rounded-xl border-2 mb-6 ${result.isFake ? 'bg-rose-950/20 border-rose-500/30' : 'bg-emerald-950/20 border-emerald-500/30'}`}>
                      <div className="flex items-center gap-3 mb-4">
                        {result.isFake ? <AlertTriangle className="w-6 h-6 text-rose-500" /> : <CheckCircle className="w-6 h-6 text-emerald-500" />}
                        <h3 className={`text-xl font-black uppercase tracking-tighter ${result.isFake ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {result.isFake ? 'Misleading / Error' : 'Verified Authentic'}
                        </h3>
                      </div>
                      <div className="prose prose-invert max-w-none text-slate-300 text-xs leading-relaxed font-medium">
                        <ReactMarkdown>{result.reportMarkdown}</ReactMarkdown>
                      </div>
                      <button 
                        onClick={reset}
                        className="mt-6 flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                      >
                         <RefreshCw className="w-3.5 h-3.5" /> Clear & New Scan
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Background Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
            </div>

            {/* Monitoring Hotspot Bar */}
            <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex justify-between items-center z-10">
              <div>
                <p className="text-[7px] text-slate-500 font-black uppercase tracking-widest mb-1">Primary Hotspot</p>
                <p className="text-[10px] font-black text-white uppercase tracking-tight">Inter-Continental Relay</p>
              </div>
              <div className="text-right">
                <p className="text-[7px] text-slate-500 font-black uppercase tracking-widest mb-1">Threat Level: Elevated</p>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className={`h-1 w-5 rounded-full ${i <= 3 ? 'bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]' : 'bg-slate-800'}`} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Intelligence Feed */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex-none">
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Live Global Intelligence Feed</h3>
            <div className="space-y-4">
              <div className="flex gap-3 items-start border-l-2 border-emerald-500 pl-4 py-0.5">
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">Official Economic Policy Indexed</p>
                  <p className="text-[8px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">Verified Source: Central Treasury • 42s ago</p>
                </div>
              </div>
              <div className="flex gap-3 items-start border-l-2 border-amber-500 pl-4 py-0.5">
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">Viral Health Claim Pattern Detected</p>
                  <p className="text-[8px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">Alert: Misleading Contextual Clip • 2m ago</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Global Intelligence Hub (New Side Widget) */}
        <section className="col-span-12 lg:col-span-2 flex flex-col gap-6">
          <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden h-full">
            <div className="p-4 border-b border-slate-800 bg-slate-800/50 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <h2 className="text-[10px] font-black uppercase text-white tracking-[0.2em]">Intel Hub</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-4 font-sans scrollbar-thin scrollbar-thumb-slate-700">
              <AnimatePresence>
                {/* Category: Political News */}
                <motion.div 
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Politics</h3>
                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-ping" />
                  </div>
                  <div className="p-2.5 bg-slate-800/40 rounded border border-slate-800 hover:border-blue-500/30 transition-all group">
                    <p className="text-[10px] text-slate-300 leading-snug font-bold group-hover:text-white">Regional election integrity scan active in 4 sectors.</p>
                    <p className="text-[7px] text-slate-500 uppercase mt-1">2m ago • Verified</p>
                  </div>
                </motion.div>
  
                {/* Category: General News */}
                <motion.div 
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Global Feed</h3>
                  </div>
                  <div className="p-2.5 bg-slate-800/40 rounded border border-slate-800 hover:border-emerald-500/30 transition-all group">
                    <p className="text-[10px] text-slate-300 leading-snug font-medium group-hover:text-white">Verified sources confirmed humanitarian corridor sync.</p>
                    <p className="text-[7px] text-slate-500 uppercase mt-1">15m ago • International</p>
                  </div>
                </motion.div>
  
                {/* Category: Health/Tech News */}
                <motion.div 
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-[8px] font-black text-purple-400 uppercase tracking-widest">Tech Alerts</h3>
                  </div>
                  <div className="p-2.5 bg-slate-800/40 rounded border border-slate-800 hover:border-purple-500/30 transition-all group">
                    <p className="text-[10px] text-slate-300 leading-snug italic opacity-80 group-hover:opacity-100 group-hover:text-white transition-all">AI-generated financial claim detected in viral threads.</p>
                    <p className="text-[7px] text-rose-500 uppercase mt-1 font-black">Misleading Content</p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex justify-center">
              <span className="text-[7px] font-bold text-slate-600 uppercase tracking-widest">Auto-indexing v2.4</span>
            </div>
          </div>
        </section>

        {/* Right Column: Evidence Lab */}
        <section className="col-span-12 lg:col-span-3 flex flex-col gap-6">
          <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-2xl grow flex flex-col text-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-800/10 flex justify-between items-center">
              <h2 className="text-[10px] font-black uppercase text-white tracking-[0.2em]">Visual Evidence Lab</h2>
              <FileText className="w-3.5 h-3.5 text-slate-500" />
            </div>
            
            <div className="p-4 flex-1 flex flex-col relative overflow-hidden">
              <div 
                onClick={() => !isCameraActive && fileInputRef.current?.click()}
                className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/50 hover:bg-slate-950 transition-all cursor-pointer group mb-4 min-h-[180px] relative overflow-hidden ${isCameraActive ? 'cursor-default' : ''}`}
              >
                {isCameraActive ? (
                  <div className="absolute inset-0 bg-black flex flex-col">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 px-4">
                      <button 
                        onClick={(e) => { e.stopPropagation(); capturePhoto(); }}
                        className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-transform active:scale-90"
                      >
                        <Camera className="w-6 h-6" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); stopCamera(); }}
                        className="bg-slate-800 hover:bg-rose-600 text-white p-3 rounded-full shadow-lg transition-all"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                  </div>
                ) : image ? (
                  <img src={image} className="w-full h-full object-contain p-2 opacity-90 rounded-lg" />
                ) : (
                  <>
                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-6 border border-slate-700 group-hover:bg-blue-600 transition-colors">
                      <ImageIcon className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-xs font-black text-white uppercase tracking-widest">Upload Evidence</p>
                    <p className="text-[8px] text-slate-500 mt-2 uppercase font-bold tracking-[0.2em] text-center px-4">Click to upload, paste from clipboard,<br/>or use capture</p>
                  </>
                )}
                <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleFileUpload} />
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div className="space-y-4">
                {!isCameraActive && (
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={startCamera}
                      className="flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 text-[9px] font-black rounded-lg border border-slate-700 uppercase tracking-widest transition-all shadow-lg active:scale-95"
                    >
                      <Camera className="w-3.5 h-3.5 text-blue-400" /> Capture
                    </button>
                    <button 
                      className="flex items-center justify-center gap-2 py-3 bg-slate-800/50 text-[9px] font-black rounded-lg border border-slate-800 uppercase tracking-widest opacity-50 cursor-default"
                    >
                      <Clipboard className="w-3.5 h-3.5 text-slate-500" /> Ctrl+V Scan
                    </button>
                  </div>
                )}
                
                <div className="space-y-3">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <p className="text-[7px] uppercase tracking-widest text-slate-600 mb-1.5 font-black">Metadata Fingerprint</p>
                    <p className="text-[9px] font-mono text-emerald-500 truncate tracking-tight">{image ? fingerprint : "HSH: PENDING_INPUT"}</p>
                  </div>
                  
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <div className="flex justify-between items-center mb-1.5">
                      <p className="text-[7px] uppercase tracking-widest text-slate-600 font-black">Pixel Integrity</p>
                      <p className="text-[9px] font-mono text-slate-400">{image ? '88.4%' : '0%'}</p>
                    </div>
                    <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: image ? '88.4%' : '0%' }}
                        className="h-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]" 
                      />
                    </div>
                  </div>
                </div>

                <div className="text-center pt-2">
                  <p className="text-[7px] font-bold text-slate-600 italic uppercase tracking-widest">"Universal clarity is the ultimate objective of the NTP protocol."</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Standard Fixed Live Intelligence Screening Bar */}
      <div className="h-9 bg-slate-900 text-white flex items-center overflow-hidden border-t border-slate-800 z-40 relative shrink-0">
        <div className="flex-none bg-blue-600 h-full px-4 flex items-center gap-2 z-10 shadow-[5px_0_15px_rgba(0,0,0,0.3)]">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-tighter shrink-0">Live Intelligence Screening</span>
        </div>
        <div className="flex-1 overflow-hidden relative bg-slate-900">
          <div className="whitespace-nowrap flex gap-12 items-center px-4 animate-[marquee_45s_linear_infinity] font-mono text-[10px] font-bold uppercase tracking-widest text-slate-400">
             <span className="flex items-center gap-2 text-slate-300"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> [ASIA] TOKYO: Neural scan detecting health misinformation patterns in local threads</span>
             <span className="flex items-center gap-2 font-black opacity-30">•</span>
             <span className="flex items-center gap-2 text-white"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> [GLOBAL] UN-GENEVA: Verified official humanitarian response logs indexed</span>
             <span className="flex items-center gap-2 font-black opacity-30">•</span>
             <span className="flex items-center gap-2 text-slate-300"><Globe className="w-3.5 h-3.5 text-blue-500" /> [ASIA] NEW DELHI: High-volume financial integrity check success on regional banking claims</span>
             <span className="flex items-center gap-2 font-black opacity-30">•</span>
             <span className="flex items-center gap-2 text-slate-300"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> [AMERICAS] NYC: Surge in synthetic video artifacts identified in social media viral feeds</span>
             <span className="flex items-center gap-2 font-black opacity-30">•</span>
             <span className="flex items-center gap-2 text-white"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> [EUROPE] LONDON: Official policy docs for energy sector cross-referenced and confirmed</span>
             <span className="flex items-center gap-2 font-black opacity-30">•</span>
             <span className="flex items-center gap-2 text-slate-300"><Globe className="w-3.5 h-3.5 text-blue-500" /> [GLOBAL] News Trace Proof protocol active across all international data nodes</span>
             
             {/* Duplicate for seamless wrap */}
             <span className="flex items-center gap-2 text-slate-300"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> [ASIA] TOKYO: Neural scan detecting health misinformation patterns in local threads</span>
             <span className="flex items-center gap-2 font-black opacity-30">•</span>
             <span className="flex items-center gap-2 text-white"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> [GLOBAL] UN-GENEVA: Verified official humanitarian response logs indexed</span>
          </div>
        </div>
      </div>

      {/* Footer Status Bar */}
      <footer className="h-8 bg-slate-200 border-t border-slate-300 px-6 flex items-center justify-between text-[10px] text-slate-500 font-bold tracking-tight shrink-0">
        <div className="flex gap-4 uppercase">
          <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full" /> AES-256_SECURED</span>
          <span className="opacity-50">|</span>
          <span>Latency: 14ms</span>
          <span className="opacity-50">|</span>
          <span className="text-slate-400">IP: PROXIED_GLOBAL</span>
        </div>
        <div className="flex gap-4 items-center uppercase">
          <div className="flex gap-3">
             <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> NODE_01</span>
             <span className="flex items-center gap-1.5 text-slate-400"><div className="w-1.5 h-1.5 bg-slate-300 rounded-full" /> NODE_04</span>
          </div>
          <span className="text-slate-400 tabular-nums">© 2026 NTP PRO LABS</span>
        </div>
      </footer>

      {error && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-rose-600 text-white px-6 py-2 rounded-full shadow-2xl text-[11px] font-bold uppercase tracking-widest z-[100] animate-bounce">
          {error}
        </div>
      )}
    </div>
  );
}
