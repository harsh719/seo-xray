import React from 'react';
import useAuditStore from '../../store/audit-store';
import { Loader2, AlertCircle } from 'lucide-react';

export default function ProgressView() {
  const { progress, currentStep, logs, error, auditStatus } = useAuditStore();

  const modules = [
    { name: 'Keyword Rankings', range: [0, 20] },
    { name: 'Backlink Analysis', range: [20, 25] },
    { name: 'New Page Opportunities', range: [25, 50] },
    { name: 'AEO/GEO Analysis', range: [50, 70] },
    { name: 'Content Gap Analysis', range: [70, 85] },
    { name: 'Strengths Compilation', range: [85, 100] },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-2xl font-bold text-white mb-2">Audit in Progress</h2>
        <p className="text-slate-400">{currentStep || 'Initializing...'}</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-slate-400 mb-2">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Module Status */}
      <div className="space-y-2 mb-8">
        {modules.map((mod) => {
          const isComplete = progress >= mod.range[1];
          const isActive = progress >= mod.range[0] && progress < mod.range[1];
          const isPending = progress < mod.range[0];

          return (
            <div
              key={mod.name}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive ? 'bg-brand-500/10 border border-brand-500/30' :
                isComplete ? 'bg-emerald-500/5 border border-emerald-500/20' :
                'bg-slate-900/50 border border-slate-800'
              }`}
            >
              {isActive && <Loader2 className="w-4 h-4 text-brand-400 animate-spin shrink-0" />}
              {isComplete && <div className="w-4 h-4 rounded-full bg-emerald-500 shrink-0 flex items-center justify-center"><span className="text-[10px] text-white font-bold">&#10003;</span></div>}
              {isPending && <div className="w-4 h-4 rounded-full border border-slate-600 shrink-0" />}
              <span className={`text-sm ${isActive ? 'text-brand-300' : isComplete ? 'text-emerald-300' : 'text-slate-500'}`}>
                {mod.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-4 flex items-start gap-3 mb-6">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-rose-300 text-sm font-medium">Audit Error</p>
            <p className="text-rose-300/70 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Live Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-800">
          <span className="text-xs text-slate-500 font-mono">Live Log</span>
        </div>
        <div className="p-4 max-h-48 overflow-y-auto font-mono text-xs space-y-1">
          {logs.length === 0 ? (
            <p className="text-slate-600">Waiting for logs...</p>
          ) : (
            logs.map((entry, i) => (
              <div key={i} className="text-slate-400">
                <span className="text-slate-600 mr-2">
                  {new Date(entry.time).toLocaleTimeString()}
                </span>
                {entry.message}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
