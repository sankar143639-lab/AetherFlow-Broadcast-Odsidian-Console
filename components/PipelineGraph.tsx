import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  CloudUpload, 
  Database, 
  Layers, 
  Cpu, 
  Globe, 
  CheckCircle2, 
  Clock, 
  Activity,
  AlertTriangle,
  RotateCw,
  Zap,
  Sliders,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { PipelineStage } from '../lib/types.ts';

export interface PipelineGraphProps {
  currentStage: PipelineStage;
  progressPercent: number;
  currentFps?: number;
  currentBitrate?: string;
  isFailed?: boolean;
}

interface NodeDefinition {
  id: string;
  stageMatch: PipelineStage[];
  title: string;
  subtitle: string;
  tech: string;
  icon: React.ComponentType<{ className?: string }>;
  telemetry: (props: PipelineGraphProps) => string;
}

const NODES: NodeDefinition[] = [
  {
    id: 'upload',
    stageMatch: ['CLIENT_UPLOAD', 'S3_INGEST'],
    title: '1. Ingest Gate',
    subtitle: 'Zero-Bypass Client Direct',
    tech: 'AWS S3 SigV4 PUT',
    icon: CloudUpload,
    telemetry: (p) => (p.currentStage === 'CLIENT_UPLOAD' || p.currentStage === 'S3_INGEST' ? `${p.progressPercent}% streamed` : 'HTTP 200 OK · ETag verified'),
  },
  {
    id: 'queue',
    stageMatch: ['BULLMQ_DISPATCH', 'PROBE_METADATA'],
    title: '2. Priority Broker',
    subtitle: 'Redis Stream Orchestration',
    tech: 'BullMQ + Lettuce',
    icon: Layers,
    telemetry: () => 'Priority P10 · Acked in 1.4ms',
  },
  {
    id: 'transcode',
    stageMatch: [
      'TRANSCODE_480P', 
      'TRANSCODE_720P', 
      'TRANSCODE_1080P', 
      'GENERATE_HLS_MASTER', 
      'SPRITE_SHEET_GEN', 
      'AUDIO_SPECTRUM_EXTRACT'
    ],
    title: '3. Transcode Matrix',
    subtitle: 'Multi-Bitrate HLS Passes',
    tech: 'FFmpeg 6.1 (libx264/aac)',
    icon: Cpu,
    telemetry: (p) => (p.currentFps ? `${p.currentFps} FPS · ${p.currentBitrate || '5.0 Mbps'}` : '1080p · 720p · 480p Ladder'),
  },
  {
    id: 'storage',
    stageMatch: ['S3_CDN_SYNC'],
    title: '4. Rendition Vault',
    subtitle: 'Segment & Manifest Sync',
    tech: 'S3 Multi-AZ + Checksums',
    icon: Database,
    telemetry: () => 'Master M3U8 · WebP Sprites',
  },
  {
    id: 'cdn',
    stageMatch: ['COMPLETED'],
    title: '5. Edge Distribution',
    subtitle: 'CloudFront Global Mesh',
    tech: 'Edge Cache TTL 31536000s',
    icon: Globe,
    telemetry: () => 'Edge Pop Active · Sub-10ms TTFB',
  },
];

export const PipelineGraph: React.FC<PipelineGraphProps> = ({
  currentStage,
  progressPercent,
  currentFps = 0,
  currentBitrate = '0 kbps',
  isFailed = false,
}) => {
  const [selectedSilicon, setSelectedSilicon] = useState<'nvenc' | 'videotoolbox' | 'cpu' | 'qsv'>('nvenc');

  const getNodeState = (node: NodeDefinition) => {
    if (isFailed && currentStage === 'FAILED_DLQ') {
      if (node.id === 'transcode') return 'error';
    }

    const stageOrder: PipelineStage[] = [
      'IDLE',
      'CLIENT_UPLOAD',
      'S3_INGEST',
      'BULLMQ_DISPATCH',
      'PROBE_METADATA',
      'TRANSCODE_480P',
      'TRANSCODE_720P',
      'TRANSCODE_1080P',
      'GENERATE_HLS_MASTER',
      'SPRITE_SHEET_GEN',
      'AUDIO_SPECTRUM_EXTRACT',
      'S3_CDN_SYNC',
      'COMPLETED',
    ];

    const currentIdx = stageOrder.indexOf(currentStage);
    const isCurrentActive = node.stageMatch.includes(currentStage);
    const maxNodeStageIdx = Math.max(...node.stageMatch.map((s) => stageOrder.indexOf(s)));

    if (currentStage === 'COMPLETED') return 'completed';
    if (isCurrentActive) return 'active';
    if (currentIdx > maxNodeStageIdx && currentIdx > 0) return 'completed';
    return 'pending';
  };

  const getConnectorState = (fromIdx: number, toIdx: number): 'completed' | 'flowing' | 'primed' | 'pending' => {
    const fromState = getNodeState(NODES[fromIdx]);
    const toState = getNodeState(NODES[toIdx]);

    if (fromState === 'completed' && toState === 'completed') {
      return 'completed';
    }
    if (fromState === 'completed' && toState === 'active') {
      return 'flowing';
    }
    if (fromState === 'active' && toState === 'pending') {
      return 'primed';
    }
    return 'pending';
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/60 backdrop-blur-md p-6 shadow-xl dark:shadow-2xl relative overflow-hidden transition-colors">
      {/* Decorative Technical Tick Marks */}
      <div className="absolute top-2 left-2 text-[9px] font-mono text-slate-400 dark:text-slate-700 select-none">
        + MATRIX_NODE_SYS::0x4E7A
      </div>
      <div className="absolute top-2 right-2 text-[9px] font-mono text-slate-400 dark:text-slate-700 select-none">
        CLOCK_SYNC: SMPTE 59.94p
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-cyan-100 dark:bg-cyan-950 border border-cyan-300 dark:border-cyan-800 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-sm">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Optical Matrix Signal Flow & Hardware Silicon Path
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Live deterministic pipeline state transitions with BullMQ Redis broker and S3 multi-part staging
            </p>
          </div>
        </div>

        {/* Silicon Engine Selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 dark:text-slate-400 text-[11px] font-mono hidden md:inline">Silicon Acceleration:</span>
          <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] font-mono">
            {[
              { id: 'nvenc', label: 'NVIDIA NVENC' },
              { id: 'videotoolbox', label: 'Apple VT' },
              { id: 'qsv', label: 'Intel QSV' },
              { id: 'cpu', label: 'CPU libx264' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSilicon(s.id as any)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  selectedSilicon === s.id
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Node Flow Visualizer Grid */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-4 relative">
        {NODES.map((node, index) => {
          const state = getNodeState(node);
          const Icon = node.icon;
          const nextIndex = index + 1;
          const hasNext = nextIndex < NODES.length;
          const connectorState = hasNext ? getConnectorState(index, nextIndex) : 'pending';

          return (
            <React.Fragment key={node.id}>
              <div className="relative flex flex-col">
                {/* Desktop Directional Connection Conduit spanning to next node */}
                {hasNext && (
                  <div className="hidden md:flex absolute top-7 -right-4 w-4 h-6 z-20 items-center justify-center pointer-events-none">
                    {/* Conduit pipeline track */}
                    <div className="relative w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                      {/* Completed stage link: solid illuminated cyan line */}
                      {connectorState === 'completed' && (
                        <div className="w-full h-full bg-cyan-500 dark:bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
                      )}

                      {/* Active streaming link: flowing directional media packets */}
                      {(connectorState === 'flowing' || connectorState === 'primed') && (
                        <div className="w-full h-full relative overflow-hidden">
                          <motion.div
                            className="absolute inset-y-0 w-3 bg-gradient-to-r from-transparent via-cyan-400 to-white rounded-full shadow-[0_0_10px_#06B6D4]"
                            animate={{ x: [-12, 18] }}
                            transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Directional flow chevron indicating media trajectory */}
                    <div className="absolute right-0 translate-x-1 flex items-center justify-center">
                      <ChevronRight
                        className={`w-3.5 h-3.5 transition-colors stroke-[2.5] ${
                          connectorState === 'completed'
                            ? 'text-cyan-600 dark:text-cyan-400'
                            : connectorState === 'flowing' || connectorState === 'primed'
                            ? 'text-cyan-500 animate-pulse drop-shadow-[0_0_6px_#06B6D4]'
                            : 'text-slate-300 dark:text-slate-700'
                        }`}
                      />
                    </div>
                  </div>
                )}

                {/* Main Node Card with Active Multi-Layer Pulse Animation */}
                <motion.div
                  animate={
                    state === 'active'
                      ? {
                          scale: [1, 1.02, 1],
                          boxShadow: [
                            '0 0 0 1px rgba(6, 182, 212, 0.4), 0 0 16px -2px rgba(6, 182, 212, 0.25)',
                            '0 0 0 4px rgba(6, 182, 212, 0.8), 0 0 32px 4px rgba(6, 182, 212, 0.5)',
                            '0 0 0 1px rgba(6, 182, 212, 0.4), 0 0 16px -2px rgba(6, 182, 212, 0.25)',
                          ],
                          borderColor: [
                            'rgba(6, 182, 212, 0.6)',
                            'rgba(6, 182, 212, 1)',
                            'rgba(6, 182, 212, 0.6)',
                          ],
                        }
                      : {}
                  }
                  transition={
                    state === 'active'
                      ? {
                          repeat: Infinity,
                          duration: 1.8,
                          ease: 'easeInOut',
                        }
                      : undefined
                  }
                  className={`flex-1 rounded-xl p-4 border transition-all relative overflow-hidden ${
                    state === 'active'
                      ? 'border-cyan-500 dark:border-cyan-400 bg-cyan-50/90 dark:bg-cyan-950/50 shadow-xl ring-2 ring-cyan-500/50'
                      : state === 'completed'
                      ? 'border-emerald-400 dark:border-emerald-500/60 bg-emerald-50/80 dark:bg-emerald-950/10'
                      : state === 'error'
                      ? 'border-red-400 dark:border-red-500/80 bg-red-50/80 dark:bg-red-950/30'
                      : 'border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-950/30'
                  }`}
                >
                  {/* Active scanline beam */}
                  {state === 'active' && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent pointer-events-none"
                      animate={{ y: ['-100%', '100%'] }}
                      transition={{ repeat: Infinity, duration: 1.8, ease: 'linear' }}
                    />
                  )}

                  <div className="flex items-center justify-between mb-2">
                    {/* Icon container with radar pulse wave when active */}
                    <div className="relative">
                      {state === 'active' && (
                        <>
                          <span className="absolute -inset-1.5 rounded-xl bg-cyan-400/40 animate-ping pointer-events-none" />
                          <span className="absolute -inset-1 rounded-xl bg-cyan-500/20 animate-pulse pointer-events-none" />
                        </>
                      )}
                      <div
                        className={`relative z-10 p-2 rounded-lg border transition-colors ${
                          state === 'active'
                            ? 'bg-cyan-500 dark:bg-cyan-400 text-slate-950 font-bold shadow-md shadow-cyan-500/40 border-cyan-300'
                            : state === 'completed'
                            ? 'bg-emerald-100 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400'
                            : state === 'error'
                            ? 'bg-red-100 dark:bg-red-500/20 border-red-300 dark:border-red-500 text-red-700 dark:text-red-400'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Status badge */}
                    {state === 'completed' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                    {state === 'active' && (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400 text-[10px] font-mono text-cyan-700 dark:text-cyan-300 font-bold shadow-xs">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                        </span>
                        <span>ACTIVE</span>
                      </div>
                    )}
                    {state === 'error' && (
                      <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                    )}
                    {state === 'pending' && (
                      <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600 shrink-0" />
                    )}
                  </div>

                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono tracking-tight flex items-center justify-between">
                    <span>{node.title}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{node.subtitle}</div>
                  
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex flex-col gap-1">
                    <div className="text-[9px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-mono">
                      {node.tech}
                    </div>
                    <div className="text-[11px] font-mono text-cyan-700 dark:text-cyan-300 font-semibold tabular-nums truncate flex items-center gap-1.5">
                      {state === 'active' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping shrink-0" />
                      )}
                      <span>{node.telemetry({ currentStage, progressPercent, currentFps, currentBitrate })}</span>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Mobile Vertical Directional Flow Connector between stacked cards */}
              {hasNext && (
                <div className="flex md:hidden items-center justify-center py-1 pointer-events-none">
                  <div className="flex items-center gap-2">
                    <div className="relative w-1 h-6 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      {connectorState === 'completed' && (
                        <div className="w-full h-full bg-cyan-500 dark:bg-cyan-400" />
                      )}
                      {(connectorState === 'flowing' || connectorState === 'primed') && (
                        <motion.div
                          className="w-full h-3 bg-gradient-to-b from-transparent via-cyan-400 to-white rounded-full shadow-[0_0_8px_#06B6D4]"
                          animate={{ y: [-12, 24] }}
                          transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
                        />
                      )}
                    </div>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-colors stroke-[2.5] ${
                        connectorState === 'completed'
                          ? 'text-cyan-600 dark:text-cyan-400'
                          : connectorState === 'flowing' || connectorState === 'primed'
                          ? 'text-cyan-500 animate-pulse'
                          : 'text-slate-300 dark:text-slate-700'
                      }`}
                    />
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
