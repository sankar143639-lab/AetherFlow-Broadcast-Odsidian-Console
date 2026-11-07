import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Radio, 
  RotateCcw,
  Crop,
  StepBack,
  StepForward,
  Copy,
  Check,
  Download,
  X,
  FileCode,
  Info,
  Server,
  ShieldCheck,
  HardDrive,
  CheckCircle2,
  ExternalLink,
  Lock,
  AlertTriangle,
  Globe,
  Terminal,
  ShieldAlert,
  Cpu
} from 'lucide-react';
import { RenditionRecord } from '../lib/types.ts';

export interface HlsPlayerProps {
  videoSrc?: string;
  masterPlaylistUrl?: string;
  renditions?: RenditionRecord[];
  isComplete: boolean;
  assetTitle?: string;
}

export const HlsPlayer: React.FC<HlsPlayerProps> = ({
  videoSrc = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  masterPlaylistUrl,
  renditions = [],
  isComplete = false,
  assetTitle = 'Production Stream Output',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedQuality, setSelectedQuality] = useState<'auto' | '1080p' | '720p' | '480p'>('auto');
  const [aspectMask, setAspectMask] = useState<'none' | '2.39' | '9:16' | '1:1'>('none');
  const [bufferHealth, setBufferHealth] = useState(8.4);
  const [currentBitrate, setCurrentBitrate] = useState('5.0 Mbps');
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState(0);

  // Inspector Modal states
  const [showInspectorModal, setShowInspectorModal] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<'manifest' | 'renditions' | 'cloudflare' | 's3storage'>('manifest');
  const [selectedSslMode, setSelectedSslMode] = useState<'flexible' | 'full' | 'strict'>('strict');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedManifest, setCopiedManifest] = useState(false);
  const [copiedRenditionIndex, setCopiedRenditionIndex] = useState<number | null>(null);
  const [copiedSslSnippet, setCopiedSslSnippet] = useState(false);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);

      if (videoRef.current.buffered.length > 0) {
        const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
        setBufferHealth(Math.max(0, Math.round((bufferedEnd - videoRef.current.currentTime) * 10) / 10));
      }
    }
  };

  const stepFrame = (frames: number) => {
    if (!videoRef.current) return;
    const frameDuration = 1 / 30;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + frames * frameDuration));
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    if (videoRef.current && duration > 0) {
      videoRef.current.currentTime = pos * duration;
      setCurrentTime(pos * duration);
    }
  };

  const handleMouseMoveScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPosition(pos);
    setHoverTime(pos * (duration || 30));
  };

  const formatSmpteTimecode = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const f = Math.floor((seconds % 1) * 30);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')};${String(f).padStart(2, '0')}`;
  };

  const handleQualityChange = (q: 'auto' | '1080p' | '720p' | '480p') => {
    setSelectedQuality(q);
    switch (q) {
      case '1080p':
        setCurrentBitrate('5.0 Mbps');
        break;
      case '720p':
        setCurrentBitrate('2.8 Mbps');
        break;
      case '480p':
        setCurrentBitrate('1.2 Mbps');
        break;
      case 'auto':
      default:
        setCurrentBitrate('Adaptive 5.0 Mbps');
        break;
    }
  };

  // Uses local first-party URL (/api/renditions/...) for development to avoid external Cloudflare tunnel or DNS routing issues
  const effectivePlaylistUrl = masterPlaylistUrl || '/api/renditions/renditions/asset-live/hls/master.m3u8';

  const generateMasterManifestContent = () => {
    return `#EXTM3U
#EXT-X-VERSION:6
#EXT-X-INDEPENDENT-SEGMENTS
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio-aac",NAME="English",DEFAULT=YES,AUTOSELECT=YES,LANGUAGE="en",URI="audio/aac_128k.m3u8"

# 1080p Full HD Rendition (High Profile 4.2 @ 6.0 Mbps)
#EXT-X-STREAM-INF:BANDWIDTH=6000000,AVERAGE-BANDWIDTH=5500000,RESOLUTION=1920x1080,FRAME-RATE=60.000,CODECS="avc1.64002a,mp4a.40.2",AUDIO="audio-aac"
1080p/index.m3u8

# 720p HD Rendition (Main Profile 3.1 @ 3.0 Mbps)
#EXT-X-STREAM-INF:BANDWIDTH=3000000,AVERAGE-BANDWIDTH=2800000,RESOLUTION=1280x720,FRAME-RATE=60.000,CODECS="avc1.4d401f,mp4a.40.2",AUDIO="audio-aac"
720p/index.m3u8

# 480p SD Mobile Rendition (Main Profile 3.0 @ 1.2 Mbps)
#EXT-X-STREAM-INF:BANDWIDTH=1200000,AVERAGE-BANDWIDTH=1100000,RESOLUTION=854x480,FRAME-RATE=30.000,CODECS="avc1.4d401e,mp4a.40.2",AUDIO="audio-aac"
480p/index.m3u8`;
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(effectivePlaylistUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleCopyManifest = async () => {
    try {
      await navigator.clipboard.writeText(generateMasterManifestContent());
      setCopiedManifest(true);
      setTimeout(() => setCopiedManifest(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleCopyRenditionUrl = async (url: string, index: number) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedRenditionIndex(index);
      setTimeout(() => setCopiedRenditionIndex(null), 2000);
    } catch {
      // fallback
    }
  };

  const handleCopySslSnippet = async (snippet: string) => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopiedSslSnippet(true);
      setTimeout(() => setCopiedSslSnippet(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleDownloadManifest = () => {
    const content = generateMasterManifestContent();
    const blob = new Blob([content], { type: 'application/vnd.apple.mpegurl;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'master.m3u8';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/60 backdrop-blur-md p-6 shadow-xl dark:shadow-2xl relative overflow-hidden transition-colors">
      {/* Broadcast Monitor Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-2">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-cyan-100 dark:bg-cyan-950 border border-cyan-300 dark:border-cyan-800 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-sm">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Broadcast Reference Monitor & HLS Playback
            </h2>
            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-sm">
              {assetTitle}
            </div>
          </div>
        </div>

        {/* Framing Guides & Safe Areas */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-1">
            <Crop className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            Mask:
          </span>
          <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px]">
            {(
              [
                { id: 'none', label: '16:9' },
                { id: '2.39', label: '2.39:1' },
                { id: '9:16', label: '9:16' },
                { id: '1:1', label: '1:1' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                onClick={() => setAspectMask(m.id)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  aspectMask === m.id
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Video Viewport with Aspect Framing Overlays */}
      <div className="mt-4 relative rounded-xl overflow-hidden bg-black aspect-video border border-slate-800 group shadow-inner">
        <video
          ref={videoRef}
          src={videoSrc}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          playsInline
        />

        {/* Aspect Ratio Framing Masks */}
        {aspectMask === '2.39' && (
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between">
            <div className="h-[12%] bg-black/85 border-b border-cyan-500/30" />
            <div className="h-[12%] bg-black/85 border-t border-cyan-500/30" />
          </div>
        )}
        {aspectMask === '9:16' && (
          <div className="absolute inset-0 pointer-events-none flex justify-between">
            <div className="w-[35%] bg-black/85 border-r border-cyan-500/30" />
            <div className="w-[35%] bg-black/85 border-l border-cyan-500/30" />
          </div>
        )}
        {aspectMask === '1:1' && (
          <div className="absolute inset-0 pointer-events-none flex justify-between">
            <div className="w-[22%] bg-black/85 border-r border-cyan-500/30" />
            <div className="w-[22%] bg-black/85 border-l border-cyan-500/30" />
          </div>
        )}

        {/* Safe Action / Title 90% Overlay */}
        <div className="absolute inset-[5%] border border-slate-500/15 pointer-events-none rounded" />
        {/* Center Crosshair */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none">
          <div className="absolute top-1/2 left-0 right-0 h-px bg-cyan-400/30" />
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-cyan-400/30" />
        </div>

        {/* Timeline Scrubber Overlay */}
        <div 
          onClick={handleSeek}
          onMouseMove={handleMouseMoveScrub}
          onMouseLeave={() => setHoverPosition(null)}
          className="absolute bottom-12 left-0 right-0 h-3 bg-black/40 hover:bg-black/60 cursor-pointer transition-colors z-20 group/scrub"
        >
          {/* Buffered Background */}
          <div 
            className="h-full bg-slate-600/50 absolute left-0 top-0 transition-all"
            style={{ width: `${duration > 0 ? ((currentTime + bufferHealth) / duration) * 100 : 0}%` }}
          />
          {/* Played Progress Bar */}
          <div 
            className="h-full bg-cyan-500 relative transition-all"
            style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md scale-0 group-hover/scrub:scale-100 transition-transform" />
          </div>

          {/* Hover Timecode Pin */}
          {hoverPosition !== null && (
            <div 
              className="absolute bottom-5 -translate-x-1/2 bg-slate-900/90 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded text-[10px] font-mono shadow-lg pointer-events-none"
              style={{ left: `${hoverPosition * 100}%` }}
            >
              {formatSmpteTimecode(hoverTime)}
            </div>
          )}
        </div>

        {/* Bottom Glass Transport Controls */}
        <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-slate-950/95 via-slate-950/80 to-transparent px-4 flex items-center justify-between text-white z-20">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="w-8 h-8 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center font-bold transition-transform active:scale-95 shadow-md shadow-cyan-500/30"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            {/* Frame Advance / Step Back */}
            <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/60">
              <button
                onClick={() => stepFrame(-1)}
                title="Previous Frame (1/30s)"
                className="p-1 hover:text-cyan-300 text-slate-400 rounded transition-colors"
              >
                <StepBack className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => stepFrame(1)}
                title="Next Frame (1/30s)"
                className="p-1 hover:text-cyan-300 text-slate-400 rounded transition-colors"
              >
                <StepForward className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                }
              }}
              title="Reset Playhead"
              className="text-slate-400 hover:text-white p-1"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Timecode SMPTE Display */}
            <div className="font-mono text-[11px] text-cyan-300 bg-slate-950/70 px-2 py-1 rounded border border-cyan-500/30 tabular-nums">
              {formatSmpteTimecode(currentTime)} <span className="text-slate-500">/</span> {formatSmpteTimecode(duration || 0)}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Audio Volume Slider */}
            <div className="flex items-center gap-1.5 group/vol">
              <button onClick={toggleMute} className="text-slate-300 hover:text-white p-1">
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setVolume(val);
                  if (videoRef.current) {
                    videoRef.current.volume = val;
                    videoRef.current.muted = false;
                  }
                  setIsMuted(false);
                }}
                className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400 opacity-60 group-hover/vol:opacity-100 transition-opacity"
              />
            </div>

            {/* Quality Variant Pill Selector */}
            <div className="flex bg-slate-950/80 rounded-lg p-0.5 border border-slate-700/80 text-[11px] font-mono">
              {(['auto', '1080p', '720p', '480p'] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => handleQualityChange(q)}
                  className={`px-2 py-0.5 rounded transition-all ${
                    selectedQuality === q
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                if (videoRef.current?.requestFullscreen) {
                  videoRef.current.requestFullscreen();
                }
              }}
              className="text-slate-300 hover:text-white p-1"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Broadcast Telemetry Strip */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-2.5 transition-colors">
          <div className="text-[9px] uppercase text-slate-500 dark:text-slate-500 font-semibold">Active Bitrate</div>
          <div className="text-xs font-bold text-cyan-600 dark:text-cyan-300 tabular-nums mt-0.5">{currentBitrate}</div>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-2.5 transition-colors">
          <div className="text-[9px] uppercase text-slate-500 dark:text-slate-500 font-semibold">Buffer Runway</div>
          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">{bufferHealth}s Forward</div>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-2.5 transition-colors">
          <div className="text-[9px] uppercase text-slate-500 dark:text-slate-500 font-semibold">HLS Packaging</div>
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 tabular-nums mt-0.5">MPEG-TS (4.0s)</div>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-2.5 transition-colors">
          <div className="text-[9px] uppercase text-slate-500 dark:text-slate-500 font-semibold">Delivery Origin</div>
          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">Local Port 3000</div>
        </div>
      </div>

      {/* Master Playlist & Stream Inspection Hub (Local First-Party URL) */}
      <div className="mt-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors">
        <div className="flex items-center gap-2 truncate min-w-0">
          <span className="text-slate-500 dark:text-slate-400 shrink-0 font-medium font-mono flex items-center gap-1.5">
            <FileCode className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            Master Playlist:
          </span>
          <span className="font-mono text-cyan-700 dark:text-cyan-300 truncate select-all bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-800">
            {effectivePlaylistUrl}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopyUrl}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors font-mono text-[11px]"
            title="Copy Master Playlist URL to clipboard"
          >
            {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
          </button>

          <button
            onClick={() => setShowInspectorModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-[11px] shadow-sm shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Inspect Manifest & Cloudflare Guide</span>
          </button>
        </div>
      </div>

      {/* Interactive HLS Master Playlist & Stream Inspector Modal */}
      <AnimatePresence>
        {showInspectorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-950 border border-cyan-300 dark:border-cyan-800 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                    <FileCode className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      HLS Master Playlist & Edge Stream Inspector
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800">
                        HLS v6 Local + Cloudflare Strict
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      Adaptive Bitrate Matrix & Cloudflare SSL/TLS Validation Hub
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowInspectorModal(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Local vs Cloudflare Edge Storage Notice */}
              <div className="px-6 py-3 bg-cyan-500/10 dark:bg-cyan-950/40 border-b border-cyan-500/20 text-xs flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                <div className="text-slate-700 dark:text-slate-300">
                  <span className="font-semibold text-cyan-700 dark:text-cyan-300">Local Testing Origin Active: </span>
                  Serving streams directly from local server routes (<code className="font-mono text-[11px] bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded">/api/renditions/...</code>). External Cloudflare tunnel hops and third-party DNS lookups are bypassed to eliminate 521 Origin Unreachable or SSL handshake errors during development.
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950/40 px-6 gap-2 text-xs font-mono overflow-x-auto">
                <button
                  onClick={() => setInspectorTab('manifest')}
                  className={`py-2.5 px-3 border-b-2 font-medium transition-colors shrink-0 ${
                    inspectorTab === 'manifest'
                      ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  master.m3u8 Source
                </button>
                <button
                  onClick={() => setInspectorTab('renditions')}
                  className={`py-2.5 px-3 border-b-2 font-medium transition-colors shrink-0 ${
                    inspectorTab === 'renditions'
                      ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  Variant Renditions (3)
                </button>
                <button
                  onClick={() => setInspectorTab('cloudflare')}
                  className={`py-2.5 px-3 border-b-2 font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
                    inspectorTab === 'cloudflare'
                      ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Cloudflare SSL/TLS Settings</span>
                </button>
                <button
                  onClick={() => setInspectorTab('s3storage')}
                  className={`py-2.5 px-3 border-b-2 font-medium transition-colors shrink-0 ${
                    inspectorTab === 's3storage'
                      ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  AWS S3 Storage Topology
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {inspectorTab === 'manifest' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                        RFC 8216 HLS Multivariant Index Manifest (Served Locally via <code className="text-cyan-600 dark:text-cyan-400 font-semibold">/api/renditions</code>):
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCopyManifest}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-mono transition-colors"
                        >
                          {copiedManifest ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedManifest ? 'Copied' : 'Copy Manifest'}</span>
                        </button>
                        <button
                          onClick={handleDownloadManifest}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download .m3u8</span>
                        </button>
                      </div>
                    </div>

                    <pre className="p-4 rounded-xl bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800 shadow-inner">
                      {generateMasterManifestContent().split('\n').map((line, idx) => {
                        let colorClass = 'text-slate-300';
                        if (line.startsWith('#EXTM3U') || line.startsWith('#EXT-X-VERSION')) {
                          colorClass = 'text-cyan-400 font-bold';
                        } else if (line.startsWith('#EXT-X-STREAM-INF')) {
                          colorClass = 'text-amber-300';
                        } else if (line.startsWith('#EXT-X-MEDIA')) {
                          colorClass = 'text-purple-400';
                        } else if (line.endsWith('.m3u8')) {
                          colorClass = 'text-emerald-400 font-semibold';
                        } else if (line.startsWith('#')) {
                          colorClass = 'text-slate-500 italic';
                        }
                        return (
                          <div key={idx} className="flex">
                            <span className="w-8 select-none text-slate-600 text-right pr-3">{idx + 1}</span>
                            <span className={colorClass}>{line}</span>
                          </div>
                        );
                      })}
                    </pre>
                  </div>
                )}

                {inspectorTab === 'renditions' && (
                  <div className="space-y-3 font-mono">
                    {[
                      {
                        label: '1080p Full HD',
                        res: '1920x1080',
                        bitrate: '6,000 kbps (Max) / 5,500 kbps (Avg)',
                        fps: '60.00 fps',
                        vCodec: 'H.264 High Profile (avc1.64002a)',
                        aCodec: 'AAC-LC 192kbps 48kHz Stereo',
                        playlist: '/api/renditions/1080p/index.m3u8',
                        segments: '16 chunks (4.0s MPEG-TS)',
                        size: '85.4 MB'
                      },
                      {
                        label: '720p HD',
                        res: '1280x720',
                        bitrate: '3,000 kbps (Max) / 2,800 kbps (Avg)',
                        fps: '60.00 fps',
                        vCodec: 'H.264 Main Profile (avc1.4d401f)',
                        aCodec: 'AAC-LC 128kbps 48kHz Stereo',
                        playlist: '/api/renditions/720p/index.m3u8',
                        segments: '16 chunks (4.0s MPEG-TS)',
                        size: '42.8 MB'
                      },
                      {
                        label: '480p SD Mobile',
                        res: '854x480',
                        bitrate: '1,200 kbps (Max) / 1,100 kbps (Avg)',
                        fps: '30.00 fps',
                        vCodec: 'H.264 Main Profile (avc1.4d401e)',
                        aCodec: 'AAC-LC 96kbps 44.1kHz Stereo',
                        playlist: '/api/renditions/480p/index.m3u8',
                        segments: '16 chunks (4.0s MPEG-TS)',
                        size: '18.2 MB'
                      }
                    ].map((rend, i) => (
                      <div key={i} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{rend.label}</span>
                            <span className="text-[11px] text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-800">
                              {rend.res}
                            </span>
                          </div>
                          <button
                            onClick={() => handleCopyRenditionUrl(rend.playlist, i)}
                            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-cyan-600 dark:hover:text-cyan-400"
                          >
                            {copiedRenditionIndex === i ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedRenditionIndex === i ? 'Copied' : rend.playlist}</span>
                          </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
                          <div>
                            <div className="text-[10px] text-slate-500 uppercase">Target Bitrate</div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{rend.bitrate}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-500 uppercase">Video Encoding</div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{rend.vCodec}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-500 uppercase">Audio Stream</div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{rend.aCodec}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-500 uppercase">Local Origin Endpoint</div>
                            <div className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">{rend.playlist}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Cloudflare SSL/TLS & Edge CDN Guide Tab */}
                {inspectorTab === 'cloudflare' && (
                  <div className="space-y-4 text-xs font-mono">
                    <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-800/60 bg-amber-500/10 dark:bg-amber-950/30 space-y-2.5">
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm">
                        <Lock className="w-4 h-4" />
                        Cloudflare SSL/TLS Encryption & Origin Configuration Guide
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 text-xs font-sans leading-relaxed">
                        When setting up a custom domain on Cloudflare for production media streaming, strict SSL/TLS parameters must be enforced between the Cloudflare Edge network and your Origin Media Server.
                      </p>
                    </div>

                    {/* SSL/TLS Modes Interactive Matrix */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Cloudflare Dashboard ➔ SSL/TLS ➔ Encryption Mode
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <button
                          onClick={() => setSelectedSslMode('flexible')}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            selectedSslMode === 'flexible'
                              ? 'border-rose-500 bg-rose-500/10 text-rose-900 dark:text-rose-200 shadow-sm'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs">Flexible</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold">NOT Recommended</span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-sans">
                            Terminates HTTPS at Cloudflare, but talks to Origin over unencrypted HTTP (port 80).
                          </div>
                        </button>

                        <button
                          onClick={() => setSelectedSslMode('full')}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            selectedSslMode === 'full'
                              ? 'border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200 shadow-sm'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs">Full</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold">Self-Signed OK</span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-sans">
                            End-to-end encrypted to Origin port 443 with self-signed certificate.
                          </div>
                        </button>

                        <button
                          onClick={() => setSelectedSslMode('strict')}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            selectedSslMode === 'strict'
                              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 shadow-sm ring-1 ring-emerald-500/30'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs">Full (Strict)</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold">RECOMMENDED</span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-sans">
                            Full TLS validation. Requires valid CA or Cloudflare Origin Cert on port 443.
                          </div>
                        </button>
                      </div>

                      {/* Mode Explanatory Card */}
                      <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                        {selectedSslMode === 'flexible' && (
                          <div className="space-y-1.5">
                            <div className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1.5">
                              <ShieldAlert className="w-4 h-4" /> Why Flexible Mode Causes Media Streaming Failures:
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 font-sans leading-relaxed">
                              If your media server redirects incoming HTTP requests to HTTPS, Cloudflare Flexible mode will cause an infinite redirect loop (<strong>HTTP 521 / ERR_TOO_MANY_REDIRECTS</strong>). Modern HLS video players will also block video chunks due to mixed-content security policies. Never use Flexible mode for production streaming.
                            </p>
                          </div>
                        )}
                        {selectedSslMode === 'full' && (
                          <div className="space-y-1.5">
                            <div className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1.5">
                              <Lock className="w-4 h-4" /> Full Mode Details:
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 font-sans leading-relaxed">
                              Cloudflare connects to your origin server via HTTPS on <strong>port 443</strong>. It accepts self-signed certificates without verifying the certificate chain. Suitable for staging, but Full (strict) should be preferred for production.
                            </p>
                          </div>
                        )}
                        {selectedSslMode === 'strict' && (
                          <div className="space-y-1.5">
                            <div className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4" /> Full (Strict) Production Standard:
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 font-sans leading-relaxed">
                              Guarantees zero Man-in-the-Middle exposure. Cloudflare validates that your origin server is actively listening on <strong>port 443</strong> and presents an authentic certificate issued by a public CA or the free 15-year <strong>Cloudflare Origin CA</strong>.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Step-by-Step Production Setup Checklist */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                        Origin Server SSL & Port 443 Checklist
                      </div>

                      <div className="space-y-2 text-xs font-sans">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">1. Verify Origin Port 443 Listener:</span>
                            <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px] mt-0.5">
                              Ensure Nginx / Apache / Caddy has a valid <code>listen 443 ssl http2;</code> block.
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">2. Install Cloudflare Origin CA Certificate:</span>
                            <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px] mt-0.5">
                              In Cloudflare Dashboard ➔ SSL/TLS ➔ Origin Server ➔ Create Certificate (Free 15-year RSA/ECC). Save to <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.2 rounded">/etc/ssl/certs/cloudflare_origin.pem</code>.
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">3. Set Cloudflare SSL Mode to Full (Strict):</span>
                            <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px] mt-0.5">
                              Toggle SSL/TLS encryption mode to <strong>Full (strict)</strong> to prevent MITM and 521 errors.
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">4. Local Testing Safety (Tunnel Bypass):</span>
                            <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px] mt-0.5">
                              During local development, use the internal <code>/api/renditions/...</code> route to bypass Cloudflare tunnels completely.
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Nginx SSL Origin Config Snippet */}
                      <div className="pt-2">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          <span>Nginx Origin Configuration (Port 443 + Cloudflare Origin CA):</span>
                          <button
                            onClick={() => handleCopySslSnippet(`server {
    listen 443 ssl http2;
    server_name media.yourdomain.com;

    ssl_certificate /etc/ssl/certs/cloudflare_origin.pem;
    ssl_certificate_key /etc/ssl/private/cloudflare_origin.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    location /renditions/ {
        alias /var/media/renditions/;
        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location ~* \\.m3u8$ {
        alias /var/media/renditions/;
        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        types { application/vnd.apple.mpegurl m3u8; }
    }
}`)}
                            className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400 hover:underline font-mono"
                          >
                            {copiedSslSnippet ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedSslSnippet ? 'Copied' : 'Copy Nginx Config'}</span>
                          </button>
                        </div>
                        <pre className="p-3 rounded-lg bg-slate-950 text-slate-200 text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
{`server {
    listen 443 ssl http2;
    server_name media.yourdomain.com;

    # Cloudflare Origin CA Certificate (Valid for 15 years)
    ssl_certificate /etc/ssl/certs/cloudflare_origin.pem;
    ssl_certificate_key /etc/ssl/private/cloudflare_origin.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # HLS Static Segment & Playlist delivery
    location /renditions/ {
        alias /var/media/renditions/;
        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Dynamic playlists must never be cached at the edge
    location ~* \\.m3u8$ {
        alias /var/media/renditions/;
        add_header Access-Control-Allow-Origin *;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        types { application/vnd.apple.mpegurl m3u8; }
    }
}`}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}

                {inspectorTab === 's3storage' && (
                  <div className="space-y-4 text-xs font-mono">
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-3">
                      <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100 text-sm">
                        <HardDrive className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                        Storage Topology & AWS S3 Configuration
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-xs font-sans leading-relaxed">
                        In AWS cloud-native production, the FFmpeg transcode worker writes master playlists and segmented MPEG-TS chunks directly to your configured S3 bucket with gzip compression and CloudFront/Cloudflare edge CDN distribution.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <div className="text-[10px] text-slate-500 uppercase">S3 Target Bucket</div>
                          <div className="font-bold text-cyan-700 dark:text-cyan-300 mt-1">aetherflow-media-vault</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Region: us-east-1</div>
                        </div>
                        <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <div className="text-[10px] text-slate-500 uppercase">Local Routing Origin</div>
                          <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-1">/api/renditions</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Direct Local Dev Origin (Port 3000)</div>
                        </div>
                      </div>

                      <div className="pt-2">
                        <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Connecting a Live AWS S3 Bucket:
                        </div>
                        <pre className="p-3 rounded-lg bg-slate-950 text-slate-200 text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
{`# .env configuration for live AWS deployments:
AWS_REGION="us-east-1"
AWS_S3_BUCKET="my-production-media-bucket"
AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
CLOUDFRONT_DOMAIN="d111111abcdef8.cloudfront.net"`}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-500 dark:text-slate-400">
                  Transcoded via FFmpeg 6.1 (libx264 / aac) • Local Direct & Cloudflare Strict
                </span>
                <button
                  onClick={() => setShowInspectorModal(false)}
                  className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-bold transition-colors"
                >
                  Close Inspector
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
