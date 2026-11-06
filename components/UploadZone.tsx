import React, { useState, useRef, useCallback } from 'react';
import { 
  UploadCloud, 
  FileVideo, 
  Film, 
  CheckCircle2, 
  Sliders, 
  Play, 
  AlertCircle, 
  Radio, 
  Sparkles, 
  ShieldCheck,
  Disc
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface UploadZoneProps {
  onUploadStart: (fileInfo: {
    name: string;
    size: number;
    mimeType: string;
    videoUrl?: string;
    duration?: number;
    width?: number;
    height?: number;
    presetId?: string;
    priority: number;
  }) => void;
  isProcessing: boolean;
  uploadProgress: number;
  uploadStage: string;
}

const BROADCAST_PRESETS = [
  {
    id: 'netflix-imf-4k',
    title: 'Netflix IMF 4K Master',
    spec: '3840x2160 · 60 FPS · 48.2 MB · HEVC/H.264',
    filename: 'netflix_imf_reference_master_4k.mp4',
    mimeType: 'video/mp4',
    size: 50541363,
    duration: 32,
    width: 3840,
    height: 2160,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  },
  {
    id: 'apple-hls-ladder',
    title: 'Apple Adaptive Ladder',
    spec: '1920x1080 · 30 FPS · 24.6 MB · 6 Renditions',
    filename: 'apple_spec_adaptive_burst.webm',
    mimeType: 'video/webm',
    size: 25794969,
    duration: 20,
    width: 1920,
    height: 1080,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  },
  {
    id: 'bbc-live-broadcast',
    title: 'BBC DVB Broadcast',
    spec: '1280x720 · 50 FPS · 16.4 MB · EBU R128',
    filename: 'bbc_dvb_transcode_sample.mp4',
    mimeType: 'video/mp4',
    size: 17196646,
    duration: 15,
    width: 1280,
    height: 720,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  },
];

export const UploadZone: React.FC<UploadZoneProps> = ({
  onUploadStart,
  isProcessing,
  uploadProgress,
  uploadStage,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('netflix-imf-4k');
  const [enable1080p, setEnable1080p] = useState(true);
  const [enable720p, setEnable720p] = useState(true);
  const [enable480p, setEnable480p] = useState(true);
  const [enableSprites, setEnableSprites] = useState(true);
  const [enableWaveform, setEnableWaveform] = useState(true);
  const [priority, setPriority] = useState<number>(8);
  const [gopSize, setGopSize] = useState<'2s' | '4s'>('4s');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getPriorityLabel = (val: number) => {
    if (val <= 3) return { label: 'Low / Batch Background', color: 'text-blue-400', badgeBg: 'bg-blue-950/80 border-blue-800' };
    if (val <= 6) return { label: 'Standard Ingestion', color: 'text-cyan-400', badgeBg: 'bg-cyan-950/80 border-cyan-800' };
    if (val <= 8) return { label: 'Elevated Fast-Track', color: 'text-amber-400', badgeBg: 'bg-amber-950/80 border-amber-800' };
    return { label: 'VIP Real-Time / Live Stream', color: 'text-rose-400', badgeBg: 'bg-rose-950/80 border-rose-800' };
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setErrorMsg(null);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndStageFile(files[0]);
    }
  }, []);

  const validateAndStageFile = (file: File) => {
    const validMimes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska', 'audio/mpeg', 'audio/wav'];
    const hasValidExt = /\.(mp4|webm|mov|mkv|mp3|wav)$/i.test(file.name);

    if (!validMimes.includes(file.type) && !hasValidExt) {
      setErrorMsg('Unsupported format. Please upload MP4, WebM, MOV, MKV, MP3, or WAV.');
      return;
    }

    setSelectedFile(file);
    setSelectedPresetId('');
  };

  const triggerPipelineExecution = () => {
    if (isProcessing) return;

    if (selectedFile) {
      const videoUrl = URL.createObjectURL(selectedFile);
      onUploadStart({
        name: selectedFile.name,
        size: selectedFile.size,
        mimeType: selectedFile.type || 'video/mp4',
        videoUrl,
        duration: 30,
        width: 1920,
        height: 1080,
        priority,
      });
    } else {
      const preset = BROADCAST_PRESETS.find((p) => p.id === selectedPresetId) || BROADCAST_PRESETS[0];
      onUploadStart({
        name: preset.filename,
        size: preset.size,
        mimeType: preset.mimeType,
        videoUrl: preset.videoUrl,
        duration: preset.duration,
        width: preset.width,
        height: preset.height,
        presetId: preset.id,
        priority,
      });
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/60 backdrop-blur-md p-6 shadow-xl dark:shadow-2xl relative overflow-hidden transition-colors">
      {/* Precision Millimeter Ticks */}
      <div className="absolute top-2 left-2 text-[9px] font-mono text-slate-400 dark:text-slate-700 select-none">
        + INGEST_GATEWAY::CH_01
      </div>
      <div className="absolute top-2 right-2 text-[9px] font-mono text-slate-400 dark:text-slate-700 select-none">
        SIGV4_AUTHENTICATED
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-950 border border-cyan-300 dark:border-cyan-800 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-sm">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Media Ingest Deck & Pre-Signed S3 Uplink
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Zero-server-bypass client direct streaming with AWS S3 SHA-256 HMAC pre-signed authorization
            </p>
          </div>
        </div>

        {/* Priority & GOP Status */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400 text-[10px]">GOP:</span>
            <div className="flex bg-slate-100 dark:bg-slate-950 p-0.5 rounded border border-slate-200 dark:border-slate-800 text-[10px]">
              {(['2s', '4s'] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGopSize(g)}
                  className={`px-2 py-0.5 rounded transition-colors ${gopSize === g ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400 text-[10px]">Queue Rank:</span>
            <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${getPriorityLabel(priority).badgeBg} ${getPriorityLabel(priority).color}`}>
              P{priority}
            </span>
          </div>
        </div>
      </div>

      {/* Broadcast Master Presets */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
            Certified Broadcast Profiles & Test Masters:
          </span>
          {selectedFile && (
            <button
              onClick={() => setSelectedFile(null)}
              className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline font-mono"
            >
              Reset to Benchmark Master
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {BROADCAST_PRESETS.map((preset) => {
            const isSelected = selectedPresetId === preset.id && !selectedFile;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setSelectedPresetId(preset.id);
                  setSelectedFile(null);
                  setErrorMsg(null);
                }}
                className={`text-left p-3 rounded-lg border transition-all ${
                  isSelected
                    ? 'border-cyan-500 dark:border-cyan-400/90 bg-cyan-50/80 dark:bg-cyan-950/30 shadow-md shadow-cyan-500/10 dark:shadow-cyan-950/60 ring-1 ring-cyan-500/30'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-200 font-mono truncate">{preset.title}</span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums leading-tight">{preset.spec}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* BullMQ Job Priority Slider Control (1 - 10) */}
      <div className="mt-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/70 font-mono shadow-sm dark:shadow-md transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              BullMQ Queue Priority Calibration (1 - 10):
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${getPriorityLabel(priority).badgeBg} ${getPriorityLabel(priority).color}`}>
              P{priority} · {getPriorityLabel(priority).label}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
            <span>Quick:</span>
            {[1, 5, 8, 10].map((val) => (
              <button
                key={val}
                type="button"
                disabled={isProcessing}
                onClick={() => setPriority(val)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  priority === val
                    ? 'bg-cyan-500 text-slate-950 font-black'
                    : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                P{val}
              </button>
            ))}
          </div>
        </div>

        {/* The Range Slider */}
        <div className="flex items-center gap-4">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 select-none">P1 (Min)</span>
          <div className="relative flex-1 flex items-center">
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value, 10))}
              disabled={isProcessing}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-200 dark:bg-slate-800 accent-cyan-500 dark:accent-cyan-400 focus:outline-none disabled:opacity-50"
            />
          </div>
          <span className="text-[10px] text-rose-500 dark:text-rose-400 font-bold shrink-0 select-none">P10 (VIP)</span>
        </div>

        {/* Numerical Tick Markers 1 to 10 */}
        <div className="flex justify-between text-[9px] text-slate-400 dark:text-slate-500 mt-1.5 px-1 font-mono">
          {Array.from({ length: 10 }).map((_, i) => (
            <span
              key={i + 1}
              className={`cursor-pointer transition-colors ${
                priority === i + 1 ? 'text-cyan-600 dark:text-cyan-400 font-bold' : 'hover:text-slate-800 dark:hover:text-slate-300'
              }`}
              onClick={() => !isProcessing && setPriority(i + 1)}
            >
              {i + 1}
            </span>
          ))}
        </div>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`relative mt-4 overflow-hidden rounded-xl border-2 border-dashed p-6 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[150px] ${
          isDragging
            ? 'border-cyan-500 dark:border-cyan-400 bg-cyan-50/80 dark:bg-cyan-950/30 shadow-lg shadow-cyan-500/10'
            : isProcessing
            ? 'border-slate-300 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-950/70 cursor-not-allowed'
            : selectedFile
            ? 'border-emerald-500 dark:border-emerald-500/80 bg-emerald-50/80 dark:bg-emerald-950/15'
            : 'border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 hover:border-slate-400 dark:hover:border-slate-700'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,video/x-matroska,audio/mpeg,audio/wav"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              validateAndStageFile(e.target.files[0]);
            }
          }}
          className="hidden"
          disabled={isProcessing}
        />

        {/* Animated Optical Pulse Waves during processing */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none overflow-hidden"
            >
              <svg className="w-full h-full opacity-20" viewBox="0 0 800 200" preserveAspectRatio="none">
                <motion.path
                  d="M0,100 C150,160 350,40 500,100 C650,160 750,50 800,100 L800,200 L0,200 Z"
                  fill="url(#cyan-glow-optics)"
                  animate={{
                    d: [
                      'M0,100 C150,160 350,40 500,100 C650,160 750,50 800,100 L800,200 L0,200 Z',
                      'M0,120 C180,60 320,150 500,90 C680,40 720,140 800,110 L800,200 L0,200 Z',
                      'M0,100 C150,160 350,40 500,100 C650,160 750,50 800,100 L800,200 L0,200 Z',
                    ],
                  }}
                  transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
                />
                <defs>
                  <linearGradient id="cyan-glow-optics" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.1" />
                  </linearGradient>
                </defs>
              </svg>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative z-10 flex flex-col items-center text-center">
          {selectedFile ? (
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                <FileVideo className="w-6 h-6" />
              </div>
              <div className="text-left font-mono">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">{selectedFile.name}</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                  {formatBytes(selectedFile.size)} · {selectedFile.type || 'video/mp4'} · Ready for Ingest
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-2 shadow-sm">
                <UploadCloud className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono">
                Drop raw media or click to browse local files
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-500 mt-1 font-mono">
                Direct SigV4 Multi-Part S3 Upload · Up to 10 GB per Master
              </p>
            </>
          )}

          {isProcessing && (
            <div className="w-full max-w-md mt-4">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 dark:text-slate-400 mb-1">
                <span>{uploadStage || 'Streaming to S3...'}</span>
                <span className="text-cyan-600 dark:text-cyan-400 font-bold tabular-nums">{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="mt-3 p-3 rounded-lg bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-800/60 text-xs text-red-800 dark:text-red-300 flex items-center gap-2 font-mono">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Transcode Matrix Controls Bar */}
      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            Active Profiles:
          </span>
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100">
            <input
              type="checkbox"
              checked={enable1080p}
              onChange={(e) => setEnable1080p(e.target.checked)}
              disabled={isProcessing}
              className="rounded bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span>1080p (5M)</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100">
            <input
              type="checkbox"
              checked={enable720p}
              onChange={(e) => setEnable720p(e.target.checked)}
              disabled={isProcessing}
              className="rounded bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span>720p (2.8M)</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100">
            <input
              type="checkbox"
              checked={enable480p}
              onChange={(e) => setEnable480p(e.target.checked)}
              disabled={isProcessing}
              className="rounded bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span>480p (1.2M)</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100">
            <input
              type="checkbox"
              checked={enableSprites}
              onChange={(e) => setEnableSprites(e.target.checked)}
              disabled={isProcessing}
              className="rounded bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span>5x5 Sprites</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100">
            <input
              type="checkbox"
              checked={enableWaveform}
              onChange={(e) => setEnableWaveform(e.target.checked)}
              disabled={isProcessing}
              className="rounded bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span>FFT Waveform</span>
          </label>
        </div>

        {/* Primary Dispatch CTA */}
        <button
          onClick={triggerPipelineExecution}
          disabled={isProcessing}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold tracking-wide font-mono transition-all ${
            isProcessing
              ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-500 cursor-not-allowed'
              : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/25 active:scale-98'
          }`}
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{isProcessing ? 'TRANSCODE ENGINE ACTIVE...' : 'ENGAGE TRANSCODE PIPELINE'}</span>
        </button>
      </div>
    </div>
  );
};
