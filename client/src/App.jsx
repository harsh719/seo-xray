import React from 'react';
import useAuditStore from './store/audit-store';
import InputPanel from './components/InputPanel/InputPanel';
import ProgressView from './components/ProgressView/ProgressView';
import Dashboard from './components/Dashboard/Dashboard';
import ExportPanel from './components/ExportPanel/ExportPanel';
import { Radar } from 'lucide-react';

export default function App() {
  const step = useAuditStore(s => s.step);
  const resetAudit = useAuditStore(s => s.resetAudit);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={resetAudit} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center">
              <Radar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white tracking-tight">AuditPilot</h1>
              <p className="text-xs text-slate-500 -mt-0.5">SEO Audit Agent</p>
            </div>
          </button>

          {step === 'dashboard' && (
            <div className="flex items-center gap-3">
              <ExportPanel />
              <button
                onClick={resetAudit}
                className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-md hover:bg-slate-800"
              >
                New Audit
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {step === 'input' && <InputPanel />}
        {step === 'progress' && <ProgressView />}
        {step === 'dashboard' && <Dashboard />}
      </main>
    </div>
  );
}
