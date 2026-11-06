import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Layers, 
  Activity, 
  Radio, 
  Sliders, 
  Sparkles,
  ExternalLink,
  RotateCcw,
  Crop,
  StepBack,
  StepForward,
  ChevronLeft,
  ChevronRight
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
    // Assume 30fps baseline
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

  // Convert seconds to SMPTE Drop-Frame format: 01:00:23;14
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

        {/* Timeline Scrubber Overlay with WebP preview tooltip */}
        <div 
          className="absolute bottom-12 left-4 right-4 h-2 bg-slate-800/80 hover:h-3 rounded-full cursor-pointer transition-all z-30"
          onClick={handleSeek}
          onMouseMove={handleMouseMoveScrub}
          onMouseLeave={() => setHoverPosition(null)}
        >
          <div 
            className="absolute top-0 left-0 h-full bg-slate-600/60 rounded-full"
            style={{ width: `${Math.min(100, ((currentTime + bufferHealth) / (duration || 30)) * 100)}%` }}
          />
          <div 
            className="absolute top-0 left-0 h-full bg-cyan-400 rounded-full"
            style={{ width: `${((currentTime) / (duration || 1)) * 100}%` }}
          />

          {hoverPosition !== null && (
            <div 
              className="absolute -top-20 -translate-x-1/2 p-1.5 rounded-lg bg-slate-950 border border-slate-700 shadow-xl pointer-events-none z-40 flex flex-col items-center"
              style={{ left: `${hoverPosition * 100}%` }}
            >
              <div className="w-24 h-14 bg-slate-900 rounded overflow-hidden relative flex items-center justify-center border border-slate-800">
                <span className="text-[10px] font-mono text-cyan-400 font-semibold">
                  {formatSmpteTimecode(hoverTime)}
                </span>
                <span className="absolute bottom-1 right-1 text-[8px] bg-black/70 px-1 rounded text-slate-400 font-mono">
                  {selectedQuality.toUpperCase()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Floating Player Controls Bar */}
        <div className="absolute bottom-0 left-0 right-0 px-4 py-2.5 bg-gradient-to-t from-black/95 via-black/75 to-transparent flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="p-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>

            {/* Jog-shuttle frame stepping controls */}
            <button
              onClick={() => stepFrame(-1)}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              title="Step -1 frame (1/30s)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => stepFrame(1)}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              title="Step +1 frame (1/30s)"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={toggleMute}
              className="text-slate-300 hover:text-white transition-colors ml-1"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* SMPTE Drop-Frame Counter */}
            <span className="text-xs font-mono font-bold text-cyan-300 tabular-nums ml-2 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
              {formatSmpteTimecode(currentTime)}
            </span>
          </div>

          {/* Multi-Bitrate Resolution Selector */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-700 rounded-lg p-0.5">
              {(['auto', '1080p', '720p', '480p'] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => handleQualityChange(q)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase transition-colors ${
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
          <div className="text-[9px] uppercase text-slate-500 dark:text-slate-500 font-semibold">Color Space</div>
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">BT.709 8-bit YUV</div>
        </div>
      </div>

      {masterPlaylistUrl && (
        <div className="mt-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs transition-colors">
          <div className="flex items-center gap-2 truncate mr-2">
            <span className="text-slate-500 dark:text-slate-400 shrink-0 font-medium font-mono">Master Playlist:</span>
            <span className="font-mono text-cyan-600 dark:text-cyan-400 truncate select-all">{masterPlaylistUrl}</span>
          </div>
          <a
            href={masterPlaylistUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 shrink-0 font-mono"
          >
            <span>Inspect</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
};
