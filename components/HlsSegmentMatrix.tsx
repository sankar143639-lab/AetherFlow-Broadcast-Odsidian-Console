import React, { useState } from 'react';
import { Layers, ShieldCheck, CheckCircle2, Clock, Eye, Server, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface SegmentChunk {
  index: number;
  filename: string;
  durationSeconds: number;
  sizeKb: number;
  isIFrame: boolean;
  checksum: string;
  edgeCached: boolean;
  status: 'PENDING' | 'ENCODING' | 'PACKED' | 'EDGE_SYNCED';
  ptsTimestamp: string;
  bitrateKbps: number;
}

export interface HlsSegmentMatrixProps {
  progressPercent: number;
  isProcessing: boolean;
  selectedResolution?: string;
}

export const HlsSegmentMatrix: React.FC<HlsSegmentMatrixProps> = ({
  progressPercent,
  isProcessing,
  selectedResolution = '1080p',
}) => {
  const [selectedChunk, setSelectedChunk] = useState<SegmentChunk | null>(null);

  const totalChunks = 24;
  const packedCount = Math.min(totalChunks, Math.floor((progressPercent / 100) * totalChunks));

  const chunks: SegmentChunk[] = Array.from({ length: totalChunks }).map((_, i) => {
    const isPacked = i < packedCount;
    const isEncoding = i === packedCount && isProcessing;
    const status: SegmentChunk['status'] = isPacked 
      ? (i < packedCount - 2 ? 'EDGE_SYNCED' : 'PACKED') 
      : (isEncoding ? 'ENCODING' : 'PENDING');

    const ptsSeconds = i * 4;
    const ptsMinutes = Math.floor(ptsSeconds / 60);
    const ptsRemainder = ptsSeconds % 60;
    const ptsStr = `00:${ptsMinutes < 10 ? '0' : ''}${ptsMinutes}:${ptsRemainder < 10 ? '0' : ''}${ptsRemainder}.000`;

    return {
      index: i,
      filename: `${selectedResolution}_${String(i).padStart(3, '0')}.ts`,
      durationSeconds: 4.0,
      sizeKb: selectedResolution === '1080p' ? 2450 + (i % 5) * 80 : selectedResolution === '720p' ? 1380 + (i % 4) * 50 : 590 + (i % 3) * 30,
      isIFrame: i % 3 === 0,
      checksum: `sha256:7b${(i * 37 + 109).toString(16)}...9f`,
      edgeCached: status === 'EDGE_SYNCED',
      status,
      ptsTimestamp: ptsStr,
      bitrateKbps: selectedResolution === '1080p' ? 4900 + (i % 7) * 40 : 2750 + (i % 5) * 25,
    };
  });

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/60 backdrop-blur-md p-5 shadow-xl dark:shadow-2xl relative overflow-hidden transition-colors">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-cyan-100 dark:bg-cyan-950/80 border border-cyan-300 dark:border-cyan-800/80 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-sm">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              HLS Segment Chunker Matrix
              <span className="text-[10px] font-mono text-cyan-700 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-300 dark:border-cyan-800/40">
                {selectedResolution} VOD Ladder
              </span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-slate-500 dark:text-slate-400">Packed:</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums">
            {packedCount} / {totalChunks} Chunks (4.0s Keyframe GOP)
          </span>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span className="text-slate-500 dark:text-slate-400">MPEG-TS Encapsulation</span>
        </div>
      </div>

      {/* Segment Micro-Tiles Grid */}
      <div className="mt-4 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
        {chunks.map((chunk) => {
          const isSelected = selectedChunk?.index === chunk.index;
          return (
            <button
              key={chunk.index}
              onClick={() => setSelectedChunk(chunk)}
              className={`p-2 rounded-lg border text-left flex flex-col justify-between transition-all relative overflow-hidden ${
                isSelected
                  ? 'ring-2 ring-cyan-500 dark:ring-cyan-400 border-cyan-500 dark:border-cyan-400 bg-cyan-100/70 dark:bg-cyan-950/40 shadow-lg'
                  : chunk.status === 'EDGE_SYNCED'
                  ? 'border-emerald-300 dark:border-emerald-500/50 bg-emerald-50/70 dark:bg-emerald-950/10 hover:border-emerald-400'
                  : chunk.status === 'PACKED'
                  ? 'border-cyan-300 dark:border-cyan-500/40 bg-cyan-50/70 dark:bg-cyan-950/20 hover:border-cyan-400'
                  : chunk.status === 'ENCODING'
                  ? 'border-amber-400 dark:border-amber-500/60 bg-amber-50 dark:bg-amber-950/20 animate-pulse'
                  : 'border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/40 opacity-50 hover:opacity-80'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                <span className="font-bold text-slate-800 dark:text-slate-200">#{chunk.index}</span>
                {chunk.isIFrame && (
                  <span className="text-[8px] bg-cyan-500 text-slate-950 font-black px-1 rounded">
                    IDR
                  </span>
                )}
              </div>

              <div className="text-[10px] font-mono tabular-nums text-slate-600 dark:text-slate-300 truncate">
                {chunk.status === 'PENDING' ? '---' : `${chunk.sizeKb}KB`}
              </div>

              <div className="mt-1 flex items-center justify-between text-[8px] font-mono">
                <span
                  className={
                    chunk.status === 'EDGE_SYNCED'
                      ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                      : chunk.status === 'PACKED'
                      ? 'text-cyan-600 dark:text-cyan-400 font-semibold'
                      : chunk.status === 'ENCODING'
                      ? 'text-amber-600 dark:text-amber-400 font-bold'
                      : 'text-slate-400 dark:text-slate-600'
                  }
                >
                  {chunk.status === 'EDGE_SYNCED'
                    ? 'CDN OK'
                    : chunk.status === 'PACKED'
                    ? 'S3 RAW'
                    : chunk.status === 'ENCODING'
                    ? 'X264'
                    : 'QUEUE'}
                </span>
                <span className="text-slate-400 dark:text-slate-500">4.0s</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Chunk Deep-Inspection Modal / Popover Bar */}
      <AnimatePresence>
        {selectedChunk && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mt-4 p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-cyan-400 dark:border-cyan-800/60 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono shadow-md transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-cyan-100 dark:bg-cyan-500/10 border border-cyan-300 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>{selectedChunk.filename}</span>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-800/80">
                    PTS: {selectedChunk.ptsTimestamp}
                  </span>
                </div>
                <div className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5">
                  Size: {selectedChunk.sizeKb} KB · Target Bitrate: {selectedChunk.bitrateKbps} kbps · Chunk Type:{' '}
                  {selectedChunk.isIFrame ? 'Instantaneous Decoder Refresh (IDR I-Frame)' : 'Predicted Frame (P-Frame)'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
              <span className="text-[11px] text-slate-600 dark:text-slate-500 font-mono truncate max-w-xs">
                {selectedChunk.checksum}
              </span>
              <button
                onClick={() => setSelectedChunk(null)}
                className="px-2.5 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
