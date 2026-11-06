import React, { useState, useEffect, useRef } from 'react';
import { Activity, Gauge, Sliders, Eye, Radio, Sparkles } from 'lucide-react';

export interface BroadcastVectorscopeProps {
  isPlaying?: boolean;
}

export const BroadcastVectorscope: React.FC<BroadcastVectorscopeProps> = ({ isPlaying = false }) => {
  const [activeScope, setActiveScope] = useState<'waveform' | 'rgb_parade' | 'vectorscope' | 'ebu_loudness'>('waveform');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let timeOffset = 0;

    const renderScope = () => {
      animId = requestAnimationFrame(renderScope);
      timeOffset += isPlaying ? 0.08 : 0.01;

      const w = canvas.width;
      const h = canvas.height;

      ctx.fillStyle = '#060A10';
      ctx.fillRect(0, 0, w, h);

      if (activeScope === 'waveform') {
        // Draw IRE Scale Graticule (0 to 100 IRE)
        ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);

        const ireLines = [100, 75, 50, 25, 7.5, 0];
        ireLines.forEach((ire) => {
          const y = h - (ire / 100) * (h - 24) - 12;
          ctx.beginPath();
          ctx.moveTo(28, y);
          ctx.lineTo(w - 10, y);
          ctx.stroke();

          ctx.fillStyle = ire === 100 || ire === 0 ? '#06B6D4' : '#64748B';
          ctx.font = '9px "JetBrains Mono"';
          ctx.fillText(`${ire}`, 6, y + 3);
        });

        ctx.setLineDash([]);

        // Draw Simulated Luma Raster Waveform Trace
        ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
        for (let x = 32; x < w - 10; x += 2) {
          const normX = x / w;
          const baseLuma = Math.sin(normX * 8 + timeOffset) * 0.25 + 0.5;
          const highFreq = Math.sin(normX * 42 + timeOffset * 2) * 0.15;
          const noise = (Math.random() - 0.5) * (isPlaying ? 0.2 : 0.05);

          const lumaVal = Math.max(0.05, Math.min(0.95, baseLuma + highFreq + noise));
          const y = h - lumaVal * (h - 24) - 12;

          // Phosphor intensity dots
          ctx.fillRect(x, y - 4, 1.5, 8);
          ctx.fillStyle = 'rgba(6, 240, 255, 0.7)';
          ctx.fillRect(x, y, 1.5, 2);
          ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
        }
      } else if (activeScope === 'rgb_parade') {
        // 3 Channels: Red, Green, Blue
        const colWidth = (w - 20) / 3;
        const colors = [
          { name: 'R', color: '#EF4444', glow: 'rgba(239, 68, 68, 0.3)' },
          { name: 'G', color: '#10B981', glow: 'rgba(16, 185, 129, 0.3)' },
          { name: 'B', color: '#3B82F6', glow: 'rgba(59, 130, 246, 0.3)' },
        ];

        colors.forEach((c, idx) => {
          const startX = 10 + idx * colWidth;

          // Header
          ctx.fillStyle = c.color;
          ctx.font = 'bold 10px "JetBrains Mono"';
          ctx.fillText(c.name, startX + 6, 16);

          // Divider
          if (idx > 0) {
            ctx.strokeStyle = '#1E293B';
            ctx.beginPath();
            ctx.moveTo(startX, 6);
            ctx.lineTo(startX, h - 6);
            ctx.stroke();
          }

          // Channel Waveform
          for (let x = startX + 4; x < startX + colWidth - 4; x += 2) {
            const relX = (x - startX) / colWidth;
            const wave = Math.sin(relX * 6 + timeOffset + idx) * 0.3 + 0.5;
            const noise = (Math.random() - 0.5) * (isPlaying ? 0.18 : 0.04);
            const val = Math.max(0.1, Math.min(0.9, wave + noise));
            const y = h - val * (h - 32) - 16;

            ctx.fillStyle = c.glow;
            ctx.fillRect(x, y - 5, 1.5, 10);
            ctx.fillStyle = c.color;
            ctx.fillRect(x, y, 1.5, 2);
          }
        });
      } else if (activeScope === 'vectorscope') {
        // Polar vectorscope graticule
        const centerX = w / 2;
        const centerY = h / 2;
        const radius = Math.min(w, h) * 0.42;

        ctx.strokeStyle = 'rgba(51, 65, 85, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.arc(centerX, centerY, radius * 0.75, 0, Math.PI * 2);
        ctx.stroke();

        // Crosshairs
        ctx.beginPath();
        ctx.moveTo(centerX - radius - 8, centerY);
        ctx.lineTo(centerX + radius + 8, centerY);
        ctx.moveTo(centerX, centerY - radius - 8);
        ctx.lineTo(centerX, centerY + radius + 8);
        ctx.stroke();

        // Color target boxes (Rec.709: R, Mg, B, Cy, G, Yl)
        const targets = [
          { name: 'R', angle: 104 * (Math.PI / 180), col: '#EF4444' },
          { name: 'Mg', angle: 61 * (Math.PI / 180), col: '#D946EF' },
          { name: 'B', angle: 347 * (Math.PI / 180), col: '#3B82F6' },
          { name: 'Cy', angle: 284 * (Math.PI / 180), col: '#06B6D4' },
          { name: 'G', angle: 241 * (Math.PI / 180), col: '#10B981' },
          { name: 'Yl', angle: 167 * (Math.PI / 180), col: '#F59E0B' },
        ];

        targets.forEach((t) => {
          const tx = centerX + Math.cos(t.angle) * radius * 0.75;
          const ty = centerY + Math.sin(t.angle) * radius * 0.75;
          ctx.strokeStyle = t.col;
          ctx.strokeRect(tx - 4, ty - 4, 8, 8);
          ctx.fillStyle = t.col;
          ctx.font = '8px "JetBrains Mono"';
          ctx.fillText(t.name, tx + 6, ty + 3);
        });

        // Chrominance trace cloud
        ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
        const samplePoints = isPlaying ? 90 : 35;
        for (let i = 0; i < samplePoints; i++) {
          const angle = Math.sin(i * 0.4 + timeOffset) * Math.PI + Math.cos(timeOffset * 0.5);
          const r = (Math.sin(i * 0.2 + timeOffset * 1.5) * 0.4 + 0.4) * radius * 0.8;
          const px = centerX + Math.cos(angle) * r;
          const py = centerY + Math.sin(angle) * r;
          ctx.fillRect(px, py, 2, 2);
        }
      } else if (activeScope === 'ebu_loudness') {
        // EBU R128 Integrated Loudness & True Peak Meters
        const meterNames = ['Integrated LUFS', 'Short-Term (3s)', 'Momentary (400ms)', 'True Peak (dBTP)'];
        const values = [
          { val: -23.2, target: -23.0, unit: 'LUFS', color: '#10B981' },
          { val: isPlaying ? -21.8 : -34.0, target: -23.0, unit: 'LUFS', color: '#06B6D4' },
          { val: isPlaying ? -19.4 : -42.0, target: -18.0, unit: 'LUFS', color: '#F59E0B' },
          { val: isPlaying ? -1.2 : -18.5, target: -1.0, unit: 'dBTP', color: '#38BDF8' },
        ];

        const barWidth = (w - 40) / 4;
        values.forEach((m, idx) => {
          const bx = 20 + idx * barWidth;
          // Title
          ctx.fillStyle = '#94A3B8';
          ctx.font = '9px "JetBrains Mono"';
          ctx.fillText(meterNames[idx], bx, 18);

          // Value
          ctx.fillStyle = m.color;
          ctx.font = 'bold 12px "JetBrains Mono"';
          ctx.fillText(`${m.val.toFixed(1)} ${m.unit}`, bx, 36);

          // Bar Outline
          const barHeight = h - 60;
          ctx.strokeStyle = '#1E293B';
          ctx.strokeRect(bx, 44, barWidth - 12, barHeight);

          // Bar Fill
          const fillPercent = Math.max(0, Math.min(1, (m.val + 60) / 60));
          const fillH = fillPercent * barHeight;
          const gradient = ctx.createLinearGradient(0, h - 16, 0, 44);
          gradient.addColorStop(0, '#10B981');
          gradient.addColorStop(0.7, '#06B6D4');
          gradient.addColorStop(1, '#EF4444');

          ctx.fillStyle = gradient;
          ctx.fillRect(bx + 2, 44 + barHeight - fillH, barWidth - 16, fillH);
        });
      }
    };

    renderScope();

    return () => cancelAnimationFrame(animId);
  }, [activeScope, isPlaying]);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/60 backdrop-blur-md p-4 shadow-xl dark:shadow-2xl transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider font-mono">
            Optical Signal Scopes & Broadcast Telemetry
          </h3>
        </div>

        {/* Scope selector tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded border border-slate-200 dark:border-slate-800">
          {(
            [
              { id: 'waveform', label: 'Luma Waveform' },
              { id: 'rgb_parade', label: 'RGB Parade' },
              { id: 'vectorscope', label: 'Vectorscope' },
              { id: 'ebu_loudness', label: 'EBU R128 LUFS' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveScope(t.id)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                activeScope === t.id
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scope Canvas Viewport */}
      <div className="mt-3 relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-[#060A10]">
        <canvas
          ref={canvasRef}
          width={640}
          height={160}
          className="w-full h-40 block"
        />
        <div className="crt-overlay absolute inset-0 pointer-events-none" />
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-500">
        <span>ITU-R BT.709 Precision Gamut Raster</span>
        <span>EBU R128 Integrated Reference: -23.0 LUFS</span>
      </div>
    </div>
  );
};
