import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Copy, Check, Trash2, ArrowDownCircle, Search, Filter, Send, CornerDownLeft } from 'lucide-react';
import { LogEntry, LogSeverity } from '../lib/types.ts';

export interface LiveTerminalLogsProps {
  logs: LogEntry[];
  onClearLogs?: () => void;
  onExecuteCommand?: (cmd: string) => void;
}

export const LiveTerminalLogs: React.FC<LiveTerminalLogsProps> = ({ 
  logs, 
  onClearLogs,
  onExecuteCommand 
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [commandInput, setCommandInput] = useState<string>('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleCopy = () => {
    const rawText = logs
      .map((l) => `[${l.timestamp}] [${l.severity}] ${l.stage ? `[${l.stage}] ` : ''}${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;
    if (onExecuteCommand) {
      onExecuteCommand(commandInput.trim());
    }
    setCommandInput('');
  };

  const filteredLogs = logs.filter((log) => {
    if (filterSeverity !== 'ALL' && log.severity !== filterSeverity) {
      return false;
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const msgMatch = log.message.toLowerCase().includes(q);
      const stageMatch = log.stage?.toLowerCase().includes(q);
      return msgMatch || stageMatch;
    }
    return true;
  });

  const getSeverityBadge = (severity: LogSeverity) => {
    switch (severity) {
      case 'SUCCESS':
        return <span className="text-emerald-400 font-bold">[SUCCESS]</span>;
      case 'ERROR':
        return <span className="text-red-400 font-bold">[ERROR]  </span>;
      case 'WARN':
        return <span className="text-amber-400 font-bold">[WARN]   </span>;
      case 'PROGRESS':
        return <span className="text-cyan-400 font-bold">[PROG]   </span>;
      case 'FFMPEG_RAW':
        return <span className="text-indigo-400 font-bold">[FFMPEG] </span>;
      case 'INFO':
      default:
        return <span className="text-slate-400 font-medium">[INFO]   </span>;
    }
  };

  const getLogTextColor = (severity: LogSeverity) => {
    switch (severity) {
      case 'SUCCESS':
        return 'text-emerald-300';
      case 'ERROR':
        return 'text-red-300';
      case 'WARN':
        return 'text-amber-300';
      case 'PROGRESS':
        return 'text-cyan-300';
      case 'FFMPEG_RAW':
        return 'text-indigo-200/90';
      case 'INFO':
      default:
        return 'text-slate-300';
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-[#070A0F] flex flex-col h-[400px] overflow-hidden shadow-xl dark:shadow-2xl relative transition-colors">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-800 dark:text-slate-300 font-bold">
            <Terminal className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>transcode-worker.cluster.pty</span>
            <span className="text-slate-400 dark:text-slate-600">·</span>
            <span className="text-slate-500 font-normal tabular-nums">{logs.length} events logged</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded border transition-colors ${
              autoScroll
                ? 'bg-cyan-100 dark:bg-cyan-950/60 border-cyan-400 dark:border-cyan-700/80 text-cyan-800 dark:text-cyan-300 font-semibold'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Auto-scroll on incoming logs"
          >
            <ArrowDownCircle className="w-3.5 h-3.5" />
            <span className="text-[10px]">Follow</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="text-[10px]">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {onClearLogs && (
            <button
              onClick={onClearLogs}
              className="p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              title="Clear terminal buffer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-xs gap-3 font-mono transition-colors">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <Filter className="w-3 h-3 text-slate-400 dark:text-slate-500 mr-1 shrink-0" />
          {['ALL', 'INFO', 'PROGRESS', 'FFMPEG_RAW', 'WARN', 'ERROR', 'SUCCESS'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors whitespace-nowrap ${
                filterSeverity === sev
                  ? 'bg-slate-200 dark:bg-slate-800 text-cyan-800 dark:text-cyan-300 font-bold'
                  : 'text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        <div className="relative w-40 shrink-0">
          <Search className="w-3 h-3 absolute left-2.5 top-2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Grep logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded pl-7 pr-2 py-0.5 text-[11px] text-slate-800 dark:text-slate-200 font-mono placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Log Output Stream Viewport */}
      <div
        ref={scrollContainerRef}
        className="flex-1 p-4 font-mono text-[11px] overflow-y-auto space-y-1 select-text bg-[#070A0F]"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-slate-600 italic py-8 text-center text-xs">
            No log entries match criteria. Ready for worker process stdout.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-2 leading-relaxed hover:bg-slate-900/40 px-1 rounded">
              <span className="text-slate-600 shrink-0 tabular-nums select-none">{log.timestamp}</span>
              <span className="shrink-0">{getSeverityBadge(log.severity)}</span>
              {log.stage && (
                <span className="text-cyan-500/80 font-bold shrink-0 select-none">
                  [{log.stage}]
                </span>
              )}
              <span className={`break-all ${getLogTextColor(log.severity)}`}>
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Interactive Command Prompt Line */}
      <form onSubmit={handleCommandSubmit} className="flex items-center px-4 py-2 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 gap-2 transition-colors">
        <span className="text-cyan-600 dark:text-cyan-400 font-mono text-xs font-bold">$</span>
        <input
          type="text"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          placeholder="Try: probe, ladder, hls, dlq, retry, help..."
          className="flex-1 bg-transparent text-xs font-mono text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none"
        />
        <button
          type="submit"
          className="p-1 rounded bg-white dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors shadow-xs"
          title="Execute CLI Command"
        >
          <CornerDownLeft className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
